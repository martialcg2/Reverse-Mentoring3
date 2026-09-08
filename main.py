from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine, SessionLocal
from .routers import auth, me, mentoring, rh
from .seed import seed

app = FastAPI(
    title="Cross-Mentoring Digital Banking API",
    description="Backend — Crédit du Congo · Groupe Attijariwafa Bank. "
                "Firewall de confidentialité appliqué côté serveur (cahier §21).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(mentoring.router)
app.include_router(rh.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    if settings.SEED_ON_STARTUP:
        db = SessionLocal()
        try:
            seed(db)
        finally:
            db.close()


@app.get("/health", tags=["ops"])
def health():
    return {"status": "ok", "service": "cross-mentoring-api", "levels": 8}
