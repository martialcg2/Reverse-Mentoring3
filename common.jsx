import React from "react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";

export const INK = "#12263A", INK2 = "#1E3A52", ACCENT = "#0E7C6B", GOLD = "#C08A2D";
export const LIGHT = "#F1F5F9", RED = "#DC2626", MUTE = "#64748B";
export const NLEV = 8;

export const FAMILIES = [
  { id: "CUL", name: "Culture digitale bancaire", color: "#2563EB" },
  { id: "COL", name: "Outils collaboratifs", color: "#0E7C6B" },
  { id: "DAT", name: "Données & Data Literacy", color: "#7C3AED" },
  { id: "CLI", name: "Digital Client", color: "#DB2777" },
  { id: "CYB", name: "Cybersécurité", color: "#DC2626" },
  { id: "IA", name: "IA & automatisation", color: "#C08A2D" },
  { id: "DBK", name: "Digital Banking & Innovation", color: "#0891B2" },
  { id: "PRO", name: "Digitalisation des processus", color: "#4F46E5" },
];
export const FAM = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));
export const METIERS = ["Conseiller clientèle", "Chargé d'affaires", "Analyste risques", "Chargé conformité",
  "Contrôleur de gestion", "Chargé marketing", "Manager agence", "Data analyst"];
export const LEVELS = {
  1: ["Novice", "Je découvre"], 2: ["Débutant", "Je connais"], 3: ["Initié", "Je comprends"],
  4: ["Praticien", "Je sais utiliser"], 5: ["Autonome", "Je sais faire"], 6: ["Avancé", "Je sais optimiser"],
  7: ["Référent", "Je sais transmettre"], 8: ["Expert", "Je sais transformer"],
};
export const DIMS = ["Fondamental", "Opérationnel", "Expertise"];

// Playbook mentor par niveau (outils de développement 1→8)
export const LADDER = {
  1: { but: "Découvrir le vocabulaire et lever les blocages", posture: "Rassurer, démystifier, montrer", activite: "Démonstration commentée + glossaire", question: "Qu'est-ce qui vous semble le plus flou ?", preuve: "Cite et distingue 3 notions clés" },
  2: { but: "Relier les notions à son métier", posture: "Donner du sens, contextualiser", activite: "Mini-cas bancaire commenté", question: "Où voyez-vous cela dans votre travail ?", preuve: "Relie 2 notions à une tâche réelle" },
  3: { but: "Réaliser une première action guidée", posture: "Montrer puis faire faire", activite: "Exercice pas-à-pas encadré", question: "Par quoi commenceriez-vous ?", preuve: "Réalise une tâche simple accompagné" },
  4: { but: "Réaliser seul une tâche courante", posture: "Laisser faire, corriger à froid", activite: "Tâche réelle supervisée", question: "Qu'est-ce qui vous a bloqué ?", preuve: "Réalise une tâche standard sans aide" },
  5: { but: "Gérer les cas non standards", posture: "Challenger, faire varier le contexte", activite: "Cas complexe ou variante", question: "Et si le contexte changeait ainsi ?", preuve: "Résout un cas inhabituel seul" },
  6: { but: "Optimiser et fiabiliser", posture: "Co-construire, viser la mesure", activite: "Amélioration d'un processus réel", question: "Comment feriez-vous mieux, plus vite ?", preuve: "Propose une optimisation mesurable" },
  7: { but: "Transmettre à ses pairs", posture: "Faire enseigner, faire formaliser", activite: "Préparer et animer un partage", question: "Comment l'expliqueriez-vous à un collègue ?", preuve: "Forme un pair ou produit un support" },
  8: { but: "Contribuer à la transformation", posture: "Ouvrir des perspectives", activite: "Piloter une initiative / cas d'usage", question: "Quel impact à l'échelle de la banque ?", preuve: "Déploie un cas d'usage adopté" },
};
export const guidanceFor = (l) => LADDER[Math.max(1, Math.min(NLEV, l))];

// Helpers d'affichage sur competencies renvoyées par l'API [{family,name,level,target,gap,score}]
export const priorities = (comps) => comps.filter((c) => c.gap > 0).sort((a, b) => b.gap - a.gap);
export const meanLevel = (comps) => comps.reduce((a, c) => a + c.level, 0) / (comps.length || 1);

export function download(filename, text, type = "text/html;charset=utf-8") {
  const blob = new Blob(["\ufeff" + text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* --------- UI --------- */
export function Card({ children, className = "", style }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 ${className}`} style={{ boxShadow: "0 1px 2px rgba(16,38,58,.05)", ...style }}>{children}</div>;
}
export function Progress({ value, color = ACCENT, h = 8 }) {
  return <div className="w-full rounded-full bg-slate-200 overflow-hidden" style={{ height: h }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, value || 0)}%`, background: color }} /></div>;
}
export function LevelDots({ cur, tgt }) {
  return <div className="flex gap-0.5 items-center">{Array.from({ length: NLEV }, (_, i) => i + 1).map((n) => (
    <span key={n} className="rounded-full" style={{ width: 7, height: 7, background: n <= cur ? ACCENT : "transparent", border: `1.5px solid ${n <= tgt ? (n <= cur ? ACCENT : GOLD) : "#CBD5E1"}` }} />
  ))}</div>;
}
export function SectionTitle({ children, sub }) {
  return <div className="mb-3"><h2 className="text-lg font-bold" style={{ color: INK }}>{children}</h2>{sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}</div>;
}
export function Stat({ label, value, sub, icon: Icon, color = INK }) {
  return <Card className="p-4"><div className="flex items-start justify-between"><div><div className="text-2xl font-bold" style={{ color }}>{value}</div><div className="text-xs text-slate-500 mt-0.5">{label}</div>{sub && <div className="text-xs mt-1" style={{ color: ACCENT }}>{sub}</div>}</div>{Icon && <div className="rounded-xl p-2" style={{ background: `${color}12` }}><Icon size={18} style={{ color }} /></div>}</div></Card>;
}
export function PriorityTag({ gap }) {
  const c = gap >= 3 ? RED : gap >= 1 ? "#D97706" : ACCENT, t = gap >= 3 ? "Priorité haute" : gap >= 1 ? "À développer" : "Atteint";
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: c, background: `${c}14` }}>{t}</span>;
}
export function GapRadar({ comps, height = 300 }) {
  const data = comps.map((c) => ({ fam: c.family, actuel: c.level, cible: c.target }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis dataKey="fam" tick={{ fill: INK, fontSize: 11, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, NLEV]} tickCount={5} tick={{ fill: "#94A3B8", fontSize: 9 }} axisLine={false} />
          <Radar name="Cible" dataKey="cible" stroke={GOLD} fill={GOLD} fillOpacity={0.12} strokeWidth={1.5} strokeDasharray="4 3" />
          <Radar name="Niveau actuel" dataKey="actuel" stroke={ACCENT} fill={ACCENT} fillOpacity={0.35} strokeWidth={2} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">{FAMILIES.map((f) => <div key={f.id} className="flex items-center gap-1.5 text-xs text-slate-500"><span className="font-bold" style={{ color: f.color, width: 30 }}>{f.id}</span><span className="truncate">{f.name}</span></div>)}</div>
    </div>
  );
}
export const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#334155", background: "#fff" };
export function Field({ label, children }) { return <div><div className="text-xs text-slate-500 mb-1">{label}</div>{children}</div>; }
export function Loading({ label = "Chargement…" }) { return <div className="text-sm text-slate-400 p-6 text-center">{label}</div>; }
export function ErrorMsg({ e }) { return <div className="text-sm p-3 rounded-xl" style={{ background: "#FEF3C7", color: "#92400E" }}>{e?.detail || "Erreur"}</div>; }
