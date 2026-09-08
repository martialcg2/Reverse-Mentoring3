"""
=====================================================================
  FIREWALL DE CONFIDENTIALITÉ — verrou côté serveur (cahier §21)
=====================================================================
Règle non négociable : un profil RH / admin / manager ne peut JAMAIS
obtenir le score ou le niveau individuel d'un collaborateur, ni ses
notes de séance. Cette règle est appliquée ICI, au niveau du serveur,
indépendamment de l'interface. L'application front ne fait que refléter
ce que le serveur autorise.

Trois garanties :
  1) can_view_scores() n'autorise QUE le sujet lui-même et son mentor actif.
     Les rôles rh/admin obtiennent toujours False.
  2) Les agrégats passent par enforce_min_n() : rien n'est renvoyé sous
     le seuil d'anonymisation MIN_N.
  3) assert_no_score_export() est un garde-fou appelable en test/CI qui
     échoue si un dict destiné à la RH contient un champ de score.
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .engine import MIN_N
from .models import User, MentoringPair

# Champs interdits dans toute réponse de périmètre RH
FORBIDDEN_RH_FIELDS = {"score", "level", "declared", "scores", "competencies", "notes", "dims"}


def is_mentor_of(db: Session, mentor_id: str, mentee_id: str) -> bool:
    return db.query(MentoringPair).filter(
        MentoringPair.mentor_id == mentor_id,
        MentoringPair.mentee_id == mentee_id,
        MentoringPair.status.in_(["active", "proposed"]),
    ).first() is not None


def can_view_scores(db: Session, current: User, target_user_id: str) -> bool:
    """Seuls le sujet et son mentor actif voient les scores individuels."""
    if current.id == target_user_id:
        return True
    if current.role == "mentor" and is_mentor_of(db, current.id, target_user_id):
        return True
    # rh / admin / manager / autre mentor : JAMAIS
    return False


def require_score_access(db: Session, current: User, target_user_id: str) -> None:
    if not can_view_scores(db, current, target_user_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Verrou de confidentialité : les scores individuels ne sont accessibles "
            "qu'au collaborateur lui-même et à son mentor. La RH n'a accès qu'aux agrégats.",
        )


def enforce_min_n(n: int) -> None:
    if n < MIN_N:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Effectif insuffisant (n={n}) : sous le seuil d'anonymisation ({MIN_N}), "
            "aucun agrégat n'est communiqué afin d'empêcher toute ré-identification.",
        )


def assert_no_score_export(payload) -> None:
    """Garde-fou : lève une erreur si une charge destinée à la RH contient un score."""
    def scan(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in FORBIDDEN_RH_FIELDS:
                    raise AssertionError(f"Fuite firewall : champ interdit '{k}' dans une réponse RH")
                scan(v)
        elif isinstance(obj, (list, tuple)):
            for it in obj:
                scan(it)
    scan(payload)
