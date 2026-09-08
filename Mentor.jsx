import React, { useState, useEffect } from "react";
import { Target, Clock, TrendingUp } from "lucide-react";
import { api } from "../api";
import { INK, ACCENT, GOLD, NLEV, LEVELS, FAM, Card, SectionTitle, GapRadar, priorities, guidanceFor, Loading, ErrorMsg } from "../common";

export default function Mentor() {
  const [mentees, setMentees] = useState(null);
  const [sel, setSel] = useState(null);
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => { try { const m = await api.mentees(); setMentees(m); if (m[0]) setSel(m[0].id); } catch (e) { setErr(e); } })(); }, []);
  useEffect(() => { if (!sel) return; (async () => { try { setProfile(await api.menteeCompetencies(sel)); } catch (e) { setErr(e); } })(); }, [sel]);

  if (err) return <ErrorMsg e={err} />;
  if (!mentees) return <Loading />;
  if (mentees.length === 0) return <Card className="p-6 text-center text-slate-500 text-sm">Aucun mentoré ne vous est encore affecté. Les binômes sont validés par la RH.</Card>;

  const prio = profile ? priorities(profile.competencies) : [];
  const focus = prio[0];
  const lvl = focus ? focus.level : 1;
  const g = guidanceFor(lvl), gNext = guidanceFor(lvl + 1);

  async function logSession() {
    if (!focus) return;
    setBusy(true);
    try { await api.logSession(sel, focus.family, ""); setProfile(await api.menteeCompetencies(sel)); }
    catch (e) { setErr(e); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4"><SectionTitle sub={`${mentees.length} mentoré(s)`}>Mes mentorés</SectionTitle><div className="flex gap-2 overflow-x-auto pb-1">
        {mentees.map((m) => { const a = m.id === sel; return <button key={m.id} onClick={() => { setSel(m.id); setProfile(null); }} className="px-3 py-2 rounded-xl text-sm whitespace-nowrap border" style={{ borderColor: a ? ACCENT : "#E2E8F0", background: a ? `${ACCENT}0F` : "#fff", color: a ? ACCENT : "#475569", fontWeight: a ? 600 : 400 }}>{m.full_name.split(" ")[0]}</button>; })}
      </div></Card>

      {!profile ? <Loading /> : (
        <>
          <Card className="p-4"><div className="mb-3"><div className="font-semibold" style={{ color: INK }}>{profile.full_name}</div><div className="text-xs text-slate-500">{profile.metier}</div></div><GapRadar comps={profile.competencies} height={250} /></Card>
          {focus && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1"><Target size={16} style={{ color: FAM[focus.family].color }} /><span className="font-semibold text-sm" style={{ color: INK }}>Développement ciblé</span></div>
              <div className="text-sm text-slate-600 mb-3">Compétence : <b>{focus.name}</b>. Niveau <b>{lvl} — {LEVELS[lvl][0]}</b> (« {LEVELS[lvl][1]} »), cible {focus.target}.</div>
              <div className="flex gap-1 mb-3">{Array.from({ length: NLEV }, (_, i) => i + 1).map((n) => (
                <div key={n} className="flex-1 text-center"><div className="rounded" style={{ height: 6, background: n <= lvl ? ACCENT : n <= focus.target ? `${GOLD}66` : "#E2E8F0" }} /><div className="text-[9px] mt-0.5" style={{ color: n === lvl ? INK : "#CBD5E1", fontWeight: n === lvl ? 700 : 400 }}>{n}</div></div>
              ))}</div>
              <div className="rounded-xl p-3 mb-3" style={{ background: "#F8FAFC" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: ACCENT }}>OBJECTIF NIVEAU {Math.min(NLEV, lvl + 1)} — {LEVELS[Math.min(NLEV, lvl + 1)][0]}</div>
                <Row label="But" v={gNext.but} /><Row label="Posture mentor" v={g.posture} /><Row label="Activité" v={`${g.activite} (${focus.name})`} /><Row label="Question clé" v={`« ${g.question} »`} /><Row label="Preuve attendue" v={gNext.preuve} />
              </div>
              <div className="text-xs text-slate-500 mb-2"><Clock size={12} className="inline mb-0.5" /> 45 min · Méthode C.O.A.C.H. · exercice adapté au niveau {lvl}.</div>
              <button disabled={busy} onClick={logSession} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: ACCENT, opacity: busy ? 0.7 : 1 }}>{busy ? "Enregistrement…" : `Enregistrer la séance · ${lvl} → ${Math.min(NLEV, lvl + 1)}`}</button>
              <p className="text-[11px] text-slate-400 mt-2">Notes de séance confidentielles (firewall) — la RH ne voit que la progression agrégée.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
function Row({ label, v }) { return <div className="flex gap-2 text-sm mb-1.5"><span className="text-slate-400 flex-shrink-0" style={{ width: 108 }}>{label}</span><span className="text-slate-700">{v}</span></div>; }
