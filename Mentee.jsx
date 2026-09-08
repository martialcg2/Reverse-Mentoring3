import React, { useState, useEffect } from "react";
import { Home, ClipboardCheck, Route, Award, Target, ChevronRight, ChevronLeft, Check, Sparkles, BadgeCheck } from "lucide-react";
import { api } from "../api";
import { INK, ACCENT, GOLD, FAM, FAMILIES, LEVELS, DIMS, Card, Progress, LevelDots, SectionTitle, PriorityTag, GapRadar, priorities, meanLevel, Loading, ErrorMsg } from "../common";
import { QUESTIONS } from "./questions";

const TABS = [["home", "Accueil", Home], ["diagnostic", "Diagnostic", ClipboardCheck], ["passeport", "Passeport", Award]];

export default function Mentee({ me }) {
  const [tab, setTab] = useState("home");
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState(null);
  const [diagView, setDiagView] = useState(null); // résultat après soumission

  async function load() { try { setProfile(await api.myCompetencies()); } catch (e) { setErr(e); } }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab !== "diagnostic") setDiagView(null); }, [tab]);

  return (
    <Shell tab={tab} setTab={setTab}>
      {err && <ErrorMsg e={err} />}
      {!profile && !err && <Loading />}
      {profile && tab === "home" && <MHome profile={profile} go={setTab} />}
      {profile && tab === "diagnostic" && !diagView && <Diagnostic profile={profile} onDone={(p) => { setDiagView(p); setProfile(p); }} />}
      {profile && tab === "diagnostic" && diagView && <DiagResult profile={diagView} go={setTab} />}
      {profile && tab === "passeport" && <Passport me={me} profile={profile} />}
    </Shell>
  );
}

function Shell({ tab, setTab, children }) {
  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto pb-1">{TABS.map(([id, label, Icon]) => { const a = tab === id; return (
        <button key={id} onClick={() => setTab(id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap" style={{ background: a ? "#fff" : "transparent", color: a ? INK : "#64748B", fontWeight: a ? 600 : 400, boxShadow: a ? "0 1px 2px rgba(16,38,58,.06)" : "none" }}><Icon size={15} /> {label}</button>
      ); })}</nav>
      {children}
    </div>
  );
}

function MHome({ profile, go }) {
  const prio = priorities(profile.competencies), next = prio[0];
  return (
    <div className="space-y-4">
      <Card className="p-5"><div className="flex items-center justify-between"><div><div className="text-sm text-slate-500">Bonjour {profile.full_name.split(" ")[0]} 👋</div><div className="font-semibold" style={{ color: INK }}>{profile.metier}</div></div><div className="text-right"><div className="text-3xl font-bold" style={{ color: ACCENT }}>{profile.global_score}<span className="text-base text-slate-400">/100</span></div><div className="text-xs text-slate-500">Digital Banking Score</div></div></div></Card>
      <Card className="p-4"><SectionTitle sub="Niveau actuel vs cible métier — échelle 8">Skill Gap Radar</SectionTitle><GapRadar comps={profile.competencies} /></Card>
      <Card className="p-4"><SectionTitle>Mes priorités</SectionTitle><div className="space-y-2.5">
        {prio.slice(0, 4).map((g) => (
          <div key={g.family} className="flex items-center gap-3"><span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: FAM[g.family].color, background: `${FAM[g.family].color}14`, minWidth: 34, textAlign: "center" }}>{g.family}</span><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate" style={{ color: INK }}>{g.name}</div><div className="text-xs text-slate-500">Niv. {g.level} ({LEVELS[g.level][0]}) → cible {g.target}</div></div><PriorityTag gap={g.gap} /></div>
        ))}
        {prio.length === 0 && <div className="text-sm text-slate-500">Objectifs atteints. 🎯</div>}
      </div></Card>
      {next && <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Target size={16} style={{ color: ACCENT }} /><span className="font-semibold text-sm" style={{ color: INK }}>Prochaine étape</span></div><div className="text-sm text-slate-600 mb-3">Module : <b>{next.name}</b> — passer du niveau {next.level} au niveau {next.target}.</div><button onClick={() => go("diagnostic")} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: ACCENT }}>Refaire mon diagnostic</button></Card>}
    </div>
  );
}

function Diagnostic({ profile, onDone }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [dkCount, setDkCount] = useState(0);
  const [selfEval, setSelfEval] = useState(() => Object.fromEntries(profile.competencies.map((c) => [c.family, c.level || 4])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const total = QUESTIONS.length;

  async function finish() {
    // agrège les scores par famille/dimension
    const agg = {};
    QUESTIONS.forEach((q, i) => { (agg[q.fam] = agg[q.fam] || {})[q.dim] = answers[i] ?? 0; });
    setBusy(true); setErr(null);
    try { onDone(await api.submitDiagnostic(agg, selfEval, dkCount)); }
    catch (e) { setErr(e); setBusy(false); }
  }

  if (step >= total) {
    return (
      <div className="space-y-4">
        <SectionTitle sub="Positionnez-vous sur l'échelle à 8 niveaux">Auto-évaluation</SectionTitle>
        <Card className="p-4 space-y-4">
          {FAMILIES.map((f) => (
            <div key={f.id}><div className="flex justify-between text-sm mb-1"><span style={{ color: INK }}>{f.name}</span><b style={{ color: f.color }}>Niv. {selfEval[f.id]} — {LEVELS[selfEval[f.id]][0]}</b></div><input type="range" min={1} max={8} value={selfEval[f.id]} onChange={(e) => setSelfEval({ ...selfEval, [f.id]: +e.target.value })} className="w-full" /></div>
          ))}
          {err && <ErrorMsg e={err} />}
          <button disabled={busy} onClick={finish} className="w-full py-3 rounded-xl text-white font-semibold" style={{ background: ACCENT, opacity: busy ? 0.7 : 1 }}>{busy ? "Calcul côté serveur…" : "Voir mes résultats"}</button>
        </Card>
        <button onClick={() => setStep(total - 1)} className="text-sm text-slate-500 flex items-center gap-1"><ChevronLeft size={15} /> Revenir</button>
      </div>
    );
  }
  const q = QUESTIONS[step], famIdx = FAMILIES.findIndex((f) => f.id === q.fam) + 1;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: FAM[q.fam].color, background: `${FAM[q.fam].color}14` }}>{FAM[q.fam].name}</span><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{q.dim}</span></div><span className="text-xs text-slate-500">{step + 1} / {total}</span></div>
      <Progress value={(step / total) * 100} />
      <div className="text-xs text-slate-400 -mt-1">Famille {famIdx} / {FAMILIES.length}</div>
      <Card className="p-5"><div className="text-base font-semibold mb-4" style={{ color: INK }}>{q.q}</div><div className="space-y-2">
        {q.options.map((op, i) => (
          <button key={i} onClick={() => { setAnswers({ ...answers, [step]: op.s }); if (op.dk) setDkCount((c) => c + 1); setStep(step + 1); }} className="w-full text-left px-4 py-3 rounded-xl border text-sm" style={{ color: op.dk ? "#94A3B8" : "#334155", borderColor: "#E2E8F0", fontStyle: op.dk ? "italic" : "normal" }}>{op.l}</button>
        ))}
      </div></Card>
      {step > 0 && <button onClick={() => setStep(step - 1)} className="text-sm text-slate-500 flex items-center gap-1"><ChevronLeft size={15} /> Précédent</button>}
    </div>
  );
}

function DiagResult({ profile, go }) {
  return (
    <div className="space-y-4">
      <Card className="p-5 text-center"><div className="text-xs text-slate-500 mb-1">Digital Banking Literacy Score</div><div className="text-5xl font-bold" style={{ color: ACCENT }}>{profile.global_score}<span className="text-2xl text-slate-400">/100</span></div><div className="text-sm text-slate-500 mt-1">Niveau moyen {meanLevel(profile.competencies).toFixed(1)}/8 — calculé par le serveur</div></Card>
      <Card className="p-4"><SectionTitle>Votre cartographie</SectionTitle><GapRadar comps={profile.competencies} /></Card>
      <Card className="p-4"><div className="flex items-center gap-2 mb-2"><Sparkles size={16} style={{ color: GOLD }} /><span className="font-semibold text-sm" style={{ color: INK }}>Vos niveaux</span></div><div className="space-y-2">
        {profile.competencies.map((c) => <div key={c.family} className="flex items-center justify-between text-sm"><span style={{ color: INK }}>{c.name}</span><span className="text-xs text-slate-500">Niv. {c.level} — {LEVELS[c.level][0]}{c.score != null ? ` · ${Math.round(c.score)}/100` : ""}</span></div>)}
      </div></Card>
      <button onClick={() => go("home")} className="w-full py-3 rounded-xl text-white font-semibold" style={{ background: INK }}>Retour à l'accueil</button>
    </div>
  );
}

function Passport({ me, profile }) {
  const validated = profile.competencies.filter((c) => c.level >= c.target);
  const badges = [{ n: "Explorer", ok: validated.length >= 1 }, { n: "Practitioner", ok: validated.length >= 3 }, { n: "Advanced", ok: validated.length >= 5 }, { n: "Champion", ok: validated.length >= 7 }];
  return (
    <div className="space-y-4">
      <Card className="p-5" style={{ background: INK }}>
        <div className="flex items-center gap-2 text-white/70 text-xs mb-1"><BadgeCheck size={15} /> Digital Banking Skills Passport</div>
        <div className="text-white font-bold text-lg">{profile.full_name}</div><div className="text-white/60 text-sm">{profile.metier}</div>
        <div className="flex gap-2 mt-3">{badges.map((b) => <div key={b.n} className="text-center flex-1"><div className="rounded-xl py-2" style={{ background: b.ok ? GOLD : "rgba(255,255,255,.08)" }}><Award size={18} className="mx-auto" style={{ color: b.ok ? "#fff" : "rgba(255,255,255,.3)" }} /></div><div className="text-[10px] mt-1" style={{ color: b.ok ? "#fff" : "rgba(255,255,255,.4)" }}>{b.n}</div></div>)}</div>
      </Card>
      <Card className="p-4"><SectionTitle>Mes compétences</SectionTitle><div className="space-y-3">
        {profile.competencies.map((c) => { const ok = c.level >= c.target; return (
          <div key={c.family} className="flex items-center gap-3"><div className="flex-1 min-w-0"><div className="text-sm font-medium" style={{ color: INK }}>{c.name}</div><div className="text-xs text-slate-400">Niv. {c.level} — {LEVELS[c.level][0]}</div></div><LevelDots cur={c.level} tgt={c.target} />{ok ? <span className="text-xs font-semibold" style={{ color: ACCENT }}>Validé</span> : <span className="text-xs text-slate-400">En cours</span>}</div>
        ); })}
      </div></Card>
    </div>
  );
}
