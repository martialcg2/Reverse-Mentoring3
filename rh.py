from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import User, CompetencyScore, MentoringPair, Certification
from ..schemas import (ParticipantAdminOut, ParticipantCreate, ParticipantUpdate,
                       MatchProposalOut, MatchValidateIn, CartoRow, TrackingRow)
from ..security import require_roles
from ..security import hash_password
from ..firewall import enforce_min_n, assert_no_score_export
from .. import engine

router = APIRouter(prefix="/rh", tags=["rh"])
RH = require_roles("rh", "admin")


# ---------- helpers ----------
def _mentor_id_of(db: Session, mentee_id: str) -> Optional[str]:
    p = db.query(MentoringPair).filter(MentoringPair.mentee_id == mentee_id,
                                       MentoringPair.status.in_(["active", "proposed"])).first()
    return p.mentor_id if p else None


def _levels_of(db: Session, user_id: str):
    rows = db.query(CompetencyScore).filter(CompetencyScore.user_id == user_id).all()
    return {r.family: r.level for r in rows}


def _admin_out(db: Session, u: User) -> ParticipantAdminOut:
    return ParticipantAdminOut(id=u.id, full_name=u.full_name, role=u.role, metier=u.metier,
                               entite=u.entite, dispo=u.dispo or [], diagnostic_done=u.diagnostic_done,
                               parcours=u.parcours or 0, mentor_id=_mentor_id_of(db, u.id))


# ---------- CRUD participants (données administratives, AUCUN score) ----------
@router.get("/participants", response_model=List[ParticipantAdminOut])
def list_participants(user: User = Depends(RH), db: Session = Depends(get_db)):
    people = db.query(User).filter(User.role.in_(["mentee", "mentor"])).all()
    return [_admin_out(db, u) for u in people]


@router.post("/participants", response_model=ParticipantAdminOut, status_code=201)
def create_participant(p: ParticipantCreate, user: User = Depends(RH), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == p.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email déjà utilisé")
    if p.role not in ("mentee", "mentor"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Rôle invalide")
    u = User(email=p.email, hashed_password=hash_password(p.password), full_name=p.full_name,
             role=p.role, metier=p.metier, entite=p.entite, dispo=p.dispo, interests=p.interests)
    # Niveaux neutres par défaut (3/8) — la RH ne fixe JAMAIS de score.
    db.add(u); db.flush()
    for f in engine.FAMILIES:
        db.add(CompetencyScore(user_id=u.id, family=f, level=3, score=0))
    db.commit()
    return _admin_out(db, u)


@router.put("/participants/{pid}", response_model=ParticipantAdminOut)
def update_participant(pid: str, patch: ParticipantUpdate, user: User = Depends(RH), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == pid, User.role.in_(["mentee", "mentor"])).first()
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant introuvable")
    for field in ("full_name", "role", "metier", "entite", "dispo", "interests"):
        val = getattr(patch, field)
        if val is not None:
            setattr(u, field, val)
    # affectation de binôme (administratif)
    if patch.mentor_id is not None:
        db.query(MentoringPair).filter(MentoringPair.mentee_id == pid).delete()
        if patch.mentor_id:
            db.add(MentoringPair(mentor_id=patch.mentor_id, mentee_id=pid, status="active"))
    db.commit()
    return _admin_out(db, u)


@router.delete("/participants/{pid}", status_code=204)
def delete_participant(pid: str, user: User = Depends(RH), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == pid, User.role.in_(["mentee", "mentor"])).first()
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant introuvable")
    db.query(CompetencyScore).filter(CompetencyScore.user_id == pid).delete()
    db.query(MentoringPair).filter((MentoringPair.mentee_id == pid) | (MentoringPair.mentor_id == pid)).delete()
    db.query(Certification).filter(Certification.user_id == pid).delete()
    db.delete(u); db.commit()
    return None


# ---------- Matching (calcul serveur ; renvoie compatibilité, jamais de score) ----------
@router.get("/matching/proposals", response_model=List[MatchProposalOut])
def matching_proposals(user: User = Depends(RH), db: Session = Depends(get_db)):
    mentors = db.query(User).filter(User.role == "mentor").all()
    mentees = db.query(User).filter(User.role == "mentee").all()
    paired = {p.mentee_id for p in db.query(MentoringPair).all()}
    out = []
    for m in mentees:
        if m.id in paired:
            continue
        m_levels = _levels_of(db, m.id)
        best = None
        for mt in mentors:
            sc = engine.match_score(m_levels, m.metier, m.dispo or [], m.entite,
                                    _levels_of(db, mt.id), mt.interests or [], mt.dispo or [],
                                    mt.metier, mt.entite)
            if best is None or sc["total"] > best[1]["total"]:
                best = (mt, sc)
        if best:
            mt, sc = best
            out.append(MatchProposalOut(mentee_id=m.id, mentee_name=m.full_name, mentor_id=mt.id,
                                        mentor_name=mt.full_name, compatibility=sc["total"],
                                        covered=sc["covered"], n_prio=sc["n_prio"]))
    assert_no_score_export([o.model_dump() for o in out])  # garde-fou firewall
    return out


@router.post("/matching/validate")
def validate_match(payload: MatchValidateIn, user: User = Depends(RH), db: Session = Depends(get_db)):
    db.query(MentoringPair).filter(MentoringPair.mentee_id == payload.mentee_id).delete()
    db.add(MentoringPair(mentor_id=payload.mentor_id, mentee_id=payload.mentee_id, status="active"))
    db.commit()
    return {"status": "validé", "mentee_id": payload.mentee_id, "mentor_id": payload.mentor_id}


# ---------- Reporting : AGRÉGATS uniquement, seuil d'anonymisation en dur ----------
@router.get("/reporting/cartography", response_model=List[CartoRow])
def cartography(segment: Optional[str] = None, user: User = Depends(RH), db: Session = Depends(get_db)):
    q = db.query(User).filter(User.role == "mentee")
    if segment and segment != "Tous":
        q = q.filter(User.entite == segment)
    pool = q.all()
    enforce_min_n(len(pool))   # <-- verrou anonymisation
    rows = []
    for f in engine.FAMILIES:
        lv = [(_levels_of(db, u.id).get(f, 1)) for u in pool]
        tg = [engine.target_of(u.metier).get(f, 5) for u in pool]
        avg = sum(lv) / len(lv); tgt = sum(tg) / len(tg)
        rows.append(CartoRow(id=f, name=engine.FAMILY_NAMES[f], avg=round(avg, 2),
                             target=round(tgt, 2), gap=round(max(0, tgt - avg), 2)))
    return rows


@router.get("/reporting/summary")
def summary(user: User = Depends(RH), db: Session = Depends(get_db)):
    pool = db.query(User).filter(User.role == "mentee").all()
    enforce_min_n(len(pool))
    carto = cartography(None, user, db)
    prio = sorted(carto, key=lambda c: -c.gap)[:5]
    avg_gap = round(sum(c.gap for c in carto) / len(carto), 2)
    payload = {"participants": len(pool),
               "mentors": db.query(User).filter(User.role == "mentor").count(),
               "avg_gap": avg_gap,
               "priorities": [{"id": c.id, "name": c.name, "gap": c.gap} for c in prio]}
    assert_no_score_export(payload)
    return payload


@router.get("/reporting/tracking", response_model=List[TrackingRow])
def tracking(user: User = Depends(RH), db: Session = Depends(get_db)):
    """Statut par participant — sans aucun score (firewall)."""
    mentees = db.query(User).filter(User.role == "mentee").all()
    names = {u.id: u.full_name for u in db.query(User).all()}
    out = []
    for u in mentees:
        mid = _mentor_id_of(db, u.id)
        badges = db.query(Certification).filter(Certification.user_id == u.id).count()
        out.append(TrackingRow(id=u.id, full_name=u.full_name, metier=u.metier, entite=u.entite,
                               mentor_name=names.get(mid), diagnostic_done=u.diagnostic_done,
                               parcours=u.parcours or 0, badges=badges))
    return out


def _program_aggregate(db: Session) -> dict:
    """Agrégat programme complet (familles, priorités, segments) — jamais de score individuel."""
    pool = db.query(User).filter(User.role == "mentee").all()
    enforce_min_n(len(pool))
    carto = []
    for f in engine.FAMILIES:
        lv = [_levels_of(db, u.id).get(f, 1) for u in pool]
        tg = [engine.target_of(u.metier).get(f, 5) for u in pool]
        avg = sum(lv) / len(lv); tgt = sum(tg) / len(tg)
        carto.append({"id": f, "name": engine.FAMILY_NAMES[f], "avg": round(avg, 2),
                      "target": round(tgt, 2), "gap": round(max(0, tgt - avg), 2)})
    prio = sorted(carto, key=lambda c: -c["gap"])
    avg_gap = round(sum(c["gap"] for c in carto) / len(carto), 2)
    ent = {}
    for u in pool:
        ent.setdefault(u.entite, []).append(u)
    segments = []
    for e, lst in ent.items():
        g = 0.0
        for f in engine.FAMILIES:
            a = sum(_levels_of(db, u.id).get(f, 1) for u in lst) / len(lst)
            t = sum(engine.target_of(u.metier).get(f, 5) for u in lst) / len(lst)
            g += max(0, t - a)
        segments.append({"entite": e, "n": len(lst), "avg_gap": round(g / len(engine.FAMILIES), 2)})
    segments.sort(key=lambda s: -s["avg_gap"])
    return {"carto": carto, "priorities": prio, "avg_gap": avg_gap, "segments": segments,
            "participants": len(pool), "mentors": db.query(User).filter(User.role == "mentor").count(),
            "binomes": db.query(MentoringPair).count(),
            "diagnostics": db.query(User).filter(User.role == "mentee", User.diagnostic_done == True).count(),
            "reduction": 35}


@router.get("/reporting/pptx")
def reporting_pptx(user: User = Depends(RH), db: Session = Depends(get_db)):
    """Génère le rapport exécutif PowerPoint (agrégats, 8 niveaux) et le renvoie en téléchargement."""
    from ..pptx_report import build_report
    agg = _program_aggregate(db)
    buf = build_report(agg)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": 'attachment; filename="Rapport_Executif_Cross_Mentoring.pptx"'},
    )
