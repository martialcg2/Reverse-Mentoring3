"""
Tests du VERROU D'ÉTANCHÉITÉ. Ils échouent si la RH peut, par une route
quelconque, obtenir un score individuel — ou si un agrégat est renvoyé
sous le seuil d'anonymisation.
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///./test_cdc.db"
os.environ["SEED_ON_STARTUP"] = "true"

import pytest
from fastapi.testclient import TestClient

# base de test propre
if os.path.exists("test_cdc.db"):
    os.remove("test_cdc.db")

from app.main import app  # noqa: E402
from app.database import Base, engine, SessionLocal  # noqa: E402
from app.seed import seed  # noqa: E402

# Setup DB explicite (les events startup ne s'exécutent pas sous TestClient sans context manager)
Base.metadata.create_all(bind=engine)
_db = SessionLocal()
seed(_db)
_db.close()

client = TestClient(app)


def token(email):
    r = client.post("/auth/login", data={"username": email, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth(email):
    return {"Authorization": f"Bearer {token(email)}"}


# ---------- 1. Le sujet voit ses propres scores ----------
def test_mentee_sees_own_scores():
    r = client.get("/me/competencies", headers=auth("sophie@cdc.cg"))
    assert r.status_code == 200
    body = r.json()
    assert body["global_score"] >= 0
    assert any(c["score"] is not None for c in body["competencies"])


# ---------- 2. Le mentor voit les scores de SON mentoré ----------
def test_mentor_sees_paired_mentee():
    r = client.get("/mentor/mentees/u1/competencies", headers=auth("yannick@cdc.cg"))
    assert r.status_code == 200  # Yannick (m2) est le mentor de Sophie (u1)


# ---------- 3. Un mentor NE voit PAS un non-mentoré ----------
def test_mentor_blocked_on_non_mentee():
    r = client.get("/mentor/mentees/u3/competencies", headers=auth("yannick@cdc.cg"))
    assert r.status_code == 403  # u3 est suivie par m1, pas m2


# ---------- 4. La RH NE PEUT PAS obtenir de score individuel ----------
def test_rh_cannot_read_individual_scores():
    h = auth("rh@cdc.cg")
    # via la route mentor
    assert client.get("/mentor/mentees/u1/competencies", headers=h).status_code == 403
    # via la route du sujet, en visant quelqu'un d'autre : la route ne renvoie que SES scores,
    # et la RH n'a pas de scores -> tout est à 1/None, aucune fuite d'un tiers.
    r = client.get("/me/competencies", headers=h)
    # rh n'a pas de lignes de score : accès autorisé à SES données (vides), pas à celles d'autrui
    assert r.status_code == 200
    assert r.json()["user_id"] == "rh1"


# ---------- 5. La liste RH des participants ne contient AUCUN score ----------
def test_rh_participant_list_has_no_scores():
    r = client.get("/rh/participants", headers=auth("rh@cdc.cg"))
    assert r.status_code == 200
    forbidden = {"score", "level", "declared", "scores", "competencies", "notes"}
    for p in r.json():
        assert forbidden.isdisjoint(p.keys()), f"Fuite : {p.keys()}"


# ---------- 6. Un mentee ne peut pas appeler les routes RH ----------
def test_mentee_forbidden_on_rh_routes():
    assert client.get("/rh/participants", headers=auth("sophie@cdc.cg")).status_code == 403
    assert client.get("/rh/reporting/tracking", headers=auth("sophie@cdc.cg")).status_code == 403


# ---------- 7. Agrégat : seuil d'anonymisation appliqué en dur ----------
def test_min_n_enforced():
    h = auth("rh@cdc.cg")
    # "Tous" : 6 mentorés >= 5 -> OK
    assert client.get("/rh/reporting/cartography", headers=h).status_code == 200
    # segment "Finance" : 1 seul mentoré (< 5) -> bloqué
    r = client.get("/rh/reporting/cartography?segment=Finance", headers=h)
    assert r.status_code == 409, r.text


# ---------- 8. Le scoring diagnostic 8 niveaux est autoritatif ----------
def test_diagnostic_scoring_authoritative():
    h = auth("jean@cdc.cg")
    answers = {f: {"Fondamental": 100, "Opérationnel": 100, "Expertise": 100} for f in
               ["CUL", "COL", "DAT", "CLI", "CYB", "IA", "DBK", "PRO"]}
    r = client.post("/me/diagnostic", headers=h, json={"answers": answers, "declared": {}, "dont_know": 0})
    assert r.status_code == 200
    body = r.json()
    # tout au maximum -> niveau 8 partout
    assert all(c["level"] == 8 for c in body["competencies"]), body["competencies"]


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-v"]))
