from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, CompetencyScore, Assessment, Certification
from ..schemas import ProfileScoresOut, CompetencyOut, DiagnosticSubmit
from ..security import get_current_user
from ..firewall import require_score_access
from .. import engine

router = APIRouter(tags=["me"])


def _levels_map(db: Session, user_id: str):
    rows = db.query(CompetencyScore).filter(CompetencyScore.user_id == user_id).all()
    return {r.family: r for r in rows}


def _profile_scores(db: Session, user: User) -> ProfileScoresOut:
    rows = _levels_map(db, user.id)
    levels = {f: (rows[f].level if f in rows else 1) for f in engine.FAMILIES}
    gaps = engine.compute_gaps(levels, user.metier)
    comps = []
    for g in gaps:
        r = rows.get(g["id"])
        comps.append(CompetencyOut(family=g["id"], name=g["name"], level=g["cur"],
                                   target=g["tgt"], gap=g["gap"],
                                   score=(round(r.score, 1) if r else None)))
    return ProfileScoresOut(user_id=user.id, full_name=user.full_name, metier=user.metier,
                            global_score=engine.global_score(levels),
                            mean_level=round(engine.mean_level(levels), 2), competencies=comps)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "full_name": user.full_name, "role": user.role,
            "metier": user.metier, "entite": user.entite, "diagnostic_done": user.diagnostic_done,
            "parcours": user.parcours}


@router.get("/me/competencies", response_model=ProfileScoresOut)
def my_competencies(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Le sujet accède toujours à ses propres scores.
    require_score_access(db, user, user.id)
    return _profile_scores(db, user)


@router.post("/me/diagnostic", response_model=ProfileScoresOut)
def submit_diagnostic(payload: DiagnosticSubmit, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Scoring AUTORITATIF côté serveur (8 niveaux). Écrase les scores du sujet."""
    dims_acc = {d: [] for d in engine.DIMS}
    for fam in engine.FAMILIES:
        a = payload.answers.get(fam, {})
        f = float(a.get("Fondamental", 0)); o = float(a.get("Opérationnel", 0)); e = float(a.get("Expertise", 0))
        for d, v in (("Fondamental", f), ("Opérationnel", o), ("Expertise", e)):
            dims_acc[d].append(v)
        s = engine.family_score(f, o, e)
        lvl = engine.score_to_level(s)
        decl = int(payload.declared.get(fam, 0))
        row = db.query(CompetencyScore).filter(CompetencyScore.user_id == user.id,
                                               CompetencyScore.family == fam).first()
        if row:
            row.level, row.score, row.declared = lvl, s, decl
        else:
            db.add(CompetencyScore(user_id=user.id, family=fam, level=lvl, score=s, declared=decl))

    levels = {}
    for fam in engine.FAMILIES:
        a = payload.answers.get(fam, {})
        levels[fam] = engine.score_to_level(engine.family_score(
            float(a.get("Fondamental", 0)), float(a.get("Opérationnel", 0)), float(a.get("Expertise", 0))))
    dims = {d: round(sum(v) / len(v)) if v else 0 for d, v in dims_acc.items()}
    db.add(Assessment(user_id=user.id, global_score=engine.global_score(levels),
                      dims=dims, dont_know=payload.dont_know, low_conf=[]))

    # Certifications : familles ayant atteint la cible
    for g in engine.compute_gaps(levels, user.metier):
        if g["cur"] >= g["tgt"]:
            exists = db.query(Certification).filter(Certification.user_id == user.id,
                                                    Certification.family == g["id"]).first()
            if not exists:
                db.add(Certification(user_id=user.id, family=g["id"], level=g["cur"], badge="Validé"))

    user.diagnostic_done = True
    db.commit()
    return _profile_scores(db, user)
