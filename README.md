# API Cross-Mentoring Digital Banking

Backend **FastAPI + PostgreSQL** pour la plateforme de mentorat croisé de Crédit du Congo (Groupe Attijariwafa Bank), avec le **firewall de confidentialité appliqué côté serveur**.

## Le verrou d'étanchéité (l'essentiel)

Le firewall n'est pas dans l'interface : il est dans le serveur (`app/firewall.py`).

- Un profil **RH / admin n'obtient jamais** le score ou le niveau individuel d'un collaborateur, par aucune route. `can_view_scores()` n'autorise que le sujet lui-même et son mentor actif.
- Les schémas de sortie RH (`ParticipantAdminOut`) **n'ont pas de champ de score** — la fuite est structurellement impossible.
- Les agrégats appliquent le **seuil d'anonymisation** `MIN_N = 5` en dur (`enforce_min_n`).
- Les **notes de séance** sont réservées au binôme.
- Le **scoring 8 niveaux est autoritatif** côté serveur : le client ne calcule jamais un niveau opposable.

Ces garanties sont prouvées par `tests/test_firewall.py` (8 tests).

## Lancer en local

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# Documentation interactive : http://localhost:8000/docs
```

La base SQLite est créée et peuplée automatiquement au démarrage.
Comptes de démo (mot de passe `demo1234`) : `rh@cdc.cg`, `nadia@cdc.cg` (mentor), `sophie@cdc.cg` (mentorée).

## Tests

```bash
pytest tests/ -v
```

## Déploiement gratuit (Render + Neon)

1. **Base de données** — créez une base PostgreSQL gratuite sur [neon.tech](https://neon.tech) et copiez l'URL de connexion (`postgresql://…?sslmode=require`).
2. **Dépôt** — poussez ce dossier sur GitHub.
3. **API** — sur [render.com](https://render.com) : *New +* → *Blueprint* → sélectionnez le dépôt (le fichier `render.yaml` est détecté). Renseignez :
   - `DATABASE_URL` = l'URL Neon,
   - `CORS_ORIGINS` = l'URL de votre frontend,
   - `SECRET_KEY` est générée automatiquement.
4. Render construit et déploie. Vérifiez `https://votre-api.onrender.com/health`.

Alternatives équivalentes : **Railway**, **Fly.io** (un `Dockerfile` est fourni), avec **Neon** ou **Supabase** pour Postgres.

> Offre gratuite : l'instance Render s'endort après inactivité (première requête un peu lente) ; Neon est persistant. Suffisant pour une démo / un pilote.

## Endpoints principaux

| Méthode | Route | Rôle | Objet |
|---|---|---|---|
| POST | `/auth/login` | tous | Jeton JWT |
| GET | `/me/competencies` | sujet | Ses propres scores |
| POST | `/me/diagnostic` | mentorés | Soumet le diagnostic (scoring serveur) |
| GET | `/mentor/mentees` | mentor | Ses mentorés |
| GET | `/mentor/mentees/{id}/competencies` | mentor | Scores **si binôme** |
| POST | `/mentor/sessions` | mentor | Enregistre une séance (progression) |
| GET/POST/PUT/DELETE | `/rh/participants` | RH | CRUD (champs administratifs) |
| GET | `/rh/matching/proposals` | RH | Binômes proposés (compatibilité, pas de score) |
| POST | `/rh/matching/validate` | RH | Valide un binôme |
| GET | `/rh/reporting/cartography` | RH | Agrégats (seuil n≥5) |
| GET | `/rh/reporting/summary` | RH | Synthèse |
| GET | `/rh/reporting/tracking` | RH | Suivi par participant (sans score) |

## Passage en production (au-delà de la démo)

- **Authentification** : remplacer le login local par le **SSO d'entreprise + MFA** (OIDC/SAML) ; le modèle de rôles reste inchangé.
- **Migrations** : ce projet crée les tables au démarrage. En production, gérer le schéma avec **Alembic**.
- **Sécurité** : `SECRET_KEY` robuste, `CORS_ORIGINS` restreint, HTTPS (fourni par l'hébergeur), journalisation et sauvegardes.
- **Souveraineté** : cet hébergement gratuit est hors entreprise ; pour la donnée bancaire réelle, revalider la localisation avec la Conformité (droit congolais, COBAC/CEMAC, politiques Groupe).

## Structure

```
app/
  main.py         config.py      database.py     security.py
  models.py       schemas.py     firewall.py     engine.py     seed.py
  routers/  auth.py  me.py  mentoring.py  rh.py
tests/  test_firewall.py
Dockerfile  render.yaml  requirements.txt  .env.example
```
