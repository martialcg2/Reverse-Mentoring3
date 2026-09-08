from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, MentoringPair, MentoringSession, CompetencyScore
from ..schemas import ProfileScoresOut, SessionCreate
from ..security import get_current_user, require_roles
from ..firewall import require_score_access, is_mentor_of
from .. import engine
from .me import _profile_scores

router = APIRouter(prefix="/mentor", tags=["mentoring"])


@router.get("/mentees")
def my_mentees(user: User = Depends(require_roles("mentor")), db: Session = Depends(get_db)):
    pairs = db.query(MentoringPair).filter(MentoringPair.mentor_id == user.id,
                                           MentoringPair.status.in_(["active", "proposed"])).all()
    ids = [p.mentee_id for p in pairs]
    mentees = db.query(User).filter(User.id.in_(ids)).all() if ids else []
    return [{"id": m.id, "full_name": m.full_name, "metier": m.metier, "entite": m.entite} for m in mentees]


@router.get("/mentees/{mentee_id}/competencies", response_model=ProfileScoresOut)
def mentee_competencies(mentee_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Firewall : autorisé uniquement si 'user' est le mentor actif de 'mentee_id'.
    require_score_access(db, user, mentee_id)
    mentee = db.query(User).filter(User.id == mentee_id).first()
    if not mentee:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mentoré introuvable")
    return _profile_scores(db, mentee)


@router.post("/sessions")
def log_session(payload: SessionCreate, user: User = Depends(require_roles("mentor")),
                db: Session = Depends(get_db)):
    if not is_mentor_of(db, user.id, payload.mentee_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Vous n'êtes pas le mentor de ce collaborateur")
    pair = db.query(MentoringPair).filter(MentoringPair.mentor_id == user.id,
                                          MentoringPair.mentee_id == payload.mentee_id).first()
    row = db.query(CompetencyScore).filter(CompetencyScore.user_id == payload.mentee_id,
                                           CompetencyScore.family == payload.family).first()
    before = row.level if row else 1
    after = min(engine.NLEV, before + 1)
    if row:
        row.level = after
    else:
        db.add(CompetencyScore(user_id=payload.mentee_id, family=payload.family, level=after, score=0))
    # notes = CONFIDENTIEL (binôme uniquement)
    db.add(MentoringSession(pair_id=pair.id, family=payload.family, level_before=before,
                            level_after=after, duration_min=payload.duration_min, notes=payload.notes))
    db.commit()
    return {"family": payload.family, "level_before": before, "level_after": after}
