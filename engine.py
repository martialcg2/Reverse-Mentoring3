"""
Moteur métier — référentiel Digital Banking, échelle à 8 niveaux, scoring,
calcul des écarts et matching. Logique identique à celle de l'application,
mais AUTORITATIVE côté serveur (le client ne calcule jamais un niveau opposable).
"""
from typing import Dict, List

MIN_N = 5          # seuil d'anonymisation RH (firewall)
NLEV = 8           # échelle à 8 niveaux

FAMILIES = ["CUL", "COL", "DAT", "CLI", "CYB", "IA", "DBK", "PRO"]
FAMILY_NAMES = {
    "CUL": "Culture digitale bancaire", "COL": "Outils collaboratifs",
    "DAT": "Données & Data Literacy", "CLI": "Digital Client",
    "CYB": "Cybersécurité", "IA": "IA & automatisation",
    "DBK": "Digital Banking & Innovation", "PRO": "Digitalisation des processus",
}
LEVELS = {
    1: ("Novice", "Je découvre"), 2: ("Débutant", "Je connais"), 3: ("Initié", "Je comprends"),
    4: ("Praticien", "Je sais utiliser"), 5: ("Autonome", "Je sais faire"),
    6: ("Avancé", "Je sais optimiser"), 7: ("Référent", "Je sais transmettre"),
    8: ("Expert", "Je sais transformer"),
}
DIMS = ["Fondamental", "Opérationnel", "Expertise"]
DIM_WEIGHTS = {"Fondamental": 0.25, "Opérationnel": 0.35, "Expertise": 0.40}

TARGETS: Dict[str, Dict[str, int]] = {
    "Conseiller clientèle": {"CUL": 5, "COL": 5, "DAT": 4, "CLI": 7, "CYB": 5, "IA": 4, "DBK": 5, "PRO": 4},
    "Chargé d'affaires": {"CUL": 5, "COL": 5, "DAT": 5, "CLI": 7, "CYB": 5, "IA": 5, "DBK": 6, "PRO": 5},
    "Analyste risques": {"CUL": 5, "COL": 5, "DAT": 7, "CLI": 3, "CYB": 7, "IA": 5, "DBK": 5, "PRO": 5},
    "Chargé conformité": {"CUL": 5, "COL": 5, "DAT": 5, "CLI": 3, "CYB": 7, "IA": 4, "DBK": 5, "PRO": 6},
    "Contrôleur de gestion": {"CUL": 5, "COL": 5, "DAT": 7, "CLI": 3, "CYB": 5, "IA": 5, "DBK": 5, "PRO": 5},
    "Chargé marketing": {"CUL": 6, "COL": 5, "DAT": 5, "CLI": 6, "CYB": 4, "IA": 5, "DBK": 5, "PRO": 5},
    "Manager agence": {"CUL": 6, "COL": 6, "DAT": 5, "CLI": 7, "CYB": 5, "IA": 5, "DBK": 6, "PRO": 5},
    "Data analyst": {"CUL": 6, "COL": 5, "DAT": 8, "CLI": 5, "CYB": 5, "IA": 7, "DBK": 7, "PRO": 7},
}
DEFAULT_TARGET = {f: 5 for f in FAMILIES}
METIERS = list(TARGETS.keys())


def target_of(metier: str) -> Dict[str, int]:
    return TARGETS.get(metier, DEFAULT_TARGET)


def score_to_level(score: float) -> int:
    return max(1, min(NLEV, int(score // (100 / NLEV)) + 1))


def family_score(f: float, o: float, e: float) -> float:
    """Score démontré d'une famille à partir des 3 dimensions (0-100)."""
    return DIM_WEIGHTS["Fondamental"] * f + DIM_WEIGHTS["Opérationnel"] * o + DIM_WEIGHTS["Expertise"] * e


def compute_gaps(levels: Dict[str, int], metier: str) -> List[dict]:
    t = target_of(metier)
    out = []
    for f in FAMILIES:
        cur = levels.get(f, 1)
        tgt = t.get(f, 5)
        out.append({"id": f, "name": FAMILY_NAMES[f], "cur": cur, "tgt": tgt, "gap": max(0, tgt - cur)})
    return out


def priorities(gaps: List[dict]) -> List[dict]:
    return sorted([g for g in gaps if g["gap"] > 0], key=lambda g: -g["gap"])


def global_score(levels: Dict[str, int]) -> int:
    if not levels:
        return 0
    mean = sum(levels.get(f, 1) for f in FAMILIES) / len(FAMILIES)
    return round(mean / NLEV * 100)


def mean_level(levels: Dict[str, int]) -> float:
    return sum(levels.get(f, 1) for f in FAMILIES) / len(FAMILIES)


def match_score(mentee_levels, mentee_metier, mentee_dispo, mentee_entite,
                mentor_levels, mentor_interests, mentor_dispo, mentor_metier, mentor_entite) -> dict:
    """Matching pondéré 35/20/15/20/10. Retourne total + nb de priorités couvertes."""
    prio = [g["id"] for g in priorities(compute_gaps(mentee_levels, mentee_metier))[:3]]
    covered = [pid for pid in prio if mentor_levels.get(pid, 0) >= 6]
    comp = (len(covered) / len(prio) * 35) if prio else 0
    metier = 20 * (1 if mentor_metier == mentee_metier else 0.6 if mentor_entite == mentee_entite else 0.4)
    inter = (len([p for p in prio if p in (mentor_interests or [])]) / len(prio) * 15) if prio else 0
    overlap = len(set(mentor_dispo or []) & set(mentee_dispo or []))
    dispo = 20 * (1 if overlap >= 2 else 0.7 if overlap == 1 else 0.3)
    prefs = 10  # même langue par défaut
    return {"total": round(comp + metier + inter + dispo + prefs), "covered": len(covered), "n_prio": len(prio)}


def build_path(gaps: List[dict]) -> List[dict]:
    prio = priorities(gaps)
    weeks = [{"w": 1, "fam": (prio[0]["id"] if prio else "CUL"), "titre": "Lancement & culture Digital Banking"}]
    for i, p in enumerate(prio[:5]):
        weeks.append({"w": i + 2, "fam": p["id"], "titre": f"Monter en {FAMILY_NAMES[p['id']]}"})
    while len(weeks) < 7:
        weeks.append({"w": len(weeks) + 1, "fam": "PRO", "titre": "Cas pratique bancaire"})
    weeks.append({"w": 8, "fam": None, "titre": "Évaluation finale & validation"})
    return weeks[:8]
