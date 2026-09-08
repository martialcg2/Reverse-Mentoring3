import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Activity, Map, GitMerge, Database, FileText, ShieldCheck, Users, TrendingUp,
  GitMerge as Gm, BadgeCheck, GraduationCap, AlertTriangle, Lock, ChevronRight, Check, X,
  UserPlus, Edit2, Trash2, Download, FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend,
} from "recharts";
import { api } from "../api";
import {
  INK, INK2, ACCENT, GOLD, RED, LIGHT, NLEV, FAM, FAMILIES, METIERS, Card, Progress, Stat,
  SectionTitle, Field, inputStyle, download, Loading, ErrorMsg,
} from "../common";

const TABS = [["dash", "Tableau de bord", LayoutDashboard], ["suivi", "Suivi RH", Activity], ["carto", "Cartographie", Map], ["matching", "Matching", GitMerge], ["participants", "Participants", Database], ["rapports", "Rapports", FileText]];

export default function RH() {
  const [tab, setTab] = useState("dash");
  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto pb-1">{TABS.map(([id, label, Icon]) => { const a = tab === id; return (
        <button key={id} onClick={() => setTab(id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap" style={{ background: a ? "#fff" : "transparent", color: a ? INK : "#64748B", fontWeight: a ? 600 : 400, boxShadow: a ? "0 1px 2px rgba(16,38,58,.06)" : "none" }}><Icon size={15} /> {label}</button>
      ); })}</nav>
      {tab === "dash" && <Dashboard />}
      {tab === "suivi" && <Suivi />}
      {tab === "carto" && <Cartography />}
      {tab === "matching" && <Matching />}
      {tab === "participants" && <Participants />}
      {tab === "rapports" && <Rapports />}
    </div>
  );
}

function Firewall() {
  return <div className="rounded-2xl p-4 border" style={{ background: "#F0FDF9", borderColor: `${ACCENT}33` }}><div className="flex items-center gap-2 mb-1"><ShieldCheck size={16} style={{ color: ACCENT }} /><span className="font-semibold text-sm" style={{ color: INK }}>Firewall appliqué par le serveur</span></div><p className="text-xs text-slate-600">Agrégats et statuts uniquement. Le serveur refuse toute demande de score individuel (403) et bloque les agrégats sous n ≥ 5.</p></div>;
}

function Dashboard() {
  const [sum, setSum] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { (async () => { try { setSum(await api.summary()); } catch (e) { setErr(e); } })(); }, []);
  return (
    <div className="space-y-4">
      <Firewall />
      {err && <ErrorMsg e={err} />}
      {!sum && !err && <Loading />}
      {sum && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Participants" value={sum.participants} icon={Users} color={INK} />
            <Stat label="Mentors" value={sum.mentors} icon={GraduationCap} color={ACCENT} />
            <Stat label="Écart moyen /8" value={sum.avg_gap} icon={TrendingUp} color={GOLD} />
            <Stat label="Compétences validées" value="71%" icon={BadgeCheck} color={ACCENT} />
          </div>
          <Card className="p-4"><SectionTitle>Compétences prioritaires</SectionTitle><div className="space-y-2">
            {sum.priorities.map((p, i) => <div key={p.id} className="flex items-center gap-3"><span className="text-sm font-bold" style={{ color: "#94A3B8", width: 16 }}>{i + 1}</span><span className="flex-1 text-sm" style={{ color: INK }}>{p.name}</span><span className="text-xs text-slate-500">écart {p.gap}</span></div>)}
          </div></Card>
        </>
      )}
    </div>
  );
}

function Suivi() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { (async () => { try { setRows(await api.tracking()); } catch (e) { setErr(e); } })(); }, []);
  if (err) return <><Firewall /><ErrorMsg e={err} /></>;
  if (!rows) return <><Firewall /><Loading /></>;
  const withDiag = rows.filter((r) => r.diagnostic_done).length;
  const withBinome = rows.filter((r) => r.mentor_name).length;
  const late = rows.filter((r) => r.diagnostic_done && r.parcours < 25).length;
  const avg = Math.round(rows.reduce((a, r) => a + r.parcours, 0) / (rows.length || 1));
  return (
    <div className="space-y-4">
      <Firewall />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Diagnostics" value={`${withDiag}/${rows.length}`} color={ACCENT} />
        <Stat label="Binômes" value={`${withBinome}/${rows.length}`} color={INK} />
        <Stat label="Avancement moyen" value={`${avg}%`} color={ACCENT} />
        <Stat label="En retard (<25%)" value={late} color="#D97706" />
      </div>
      <Card className="p-4"><SectionTitle sub="Statut par participant — sans score (firewall)">Suivi individuel</SectionTitle>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-400 border-b border-slate-100"><th className="p-2">Participant</th><th className="p-2">Entité</th><th className="p-2">Binôme</th><th className="p-2">Diag.</th><th className="p-2">Parcours</th><th className="p-2">Badges</th></tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u.id} className="border-b border-slate-50"><td className="p-2 font-medium" style={{ color: INK }}>{u.full_name}<div className="text-[10px] text-slate-400 font-normal">{u.metier}</div></td><td className="p-2 text-slate-500">{u.entite}</td><td className="p-2 text-slate-500">{u.mentor_name || <span style={{ color: "#D97706" }}>à affecter</span>}</td><td className="p-2">{u.diagnostic_done ? <Check size={14} style={{ color: ACCENT }} /> : <X size={14} className="text-slate-300" />}</td><td className="p-2" style={{ minWidth: 70 }}><div className="flex items-center gap-1"><Progress value={u.parcours} h={5} /><span className="text-[10px] text-slate-400">{u.parcours}%</span></div></td><td className="p-2 font-semibold" style={{ color: ACCENT }}>{u.badges}</td></tr>
          ))}</tbody></table></div>
      </Card>
    </div>
  );
}

function Cartography() {
  const [segments, setSegments] = useState(["Tous"]);
  const [seg, setSeg] = useState("Tous");
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { (async () => { try { const ps = await api.participants(); setSegments(["Tous", ...Array.from(new Set(ps.filter((p) => p.role === "mentee").map((p) => p.entite)))]); } catch {} })(); }, []);
  useEffect(() => { (async () => { setErr(null); setRows(null); try { setRows(await api.cartography(seg)); } catch (e) { setErr(e); } })(); }, [seg]);
  return (
    <div className="space-y-4">
      <Firewall />
      <Card className="p-4"><SectionTitle sub="Niveau moyen vs cible (échelle 8)">Cartographie collective</SectionTitle>
        <div className="flex gap-2 overflow-x-auto pb-2">{segments.map((s) => <button key={s} onClick={() => setSeg(s)} className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap border" style={{ borderColor: seg === s ? INK : "#E2E8F0", background: seg === s ? INK : "#fff", color: seg === s ? "#fff" : "#475569" }}>{s}</button>)}</div>
        {err && err.status === 409 && <div className="flex items-center gap-2 p-4 rounded-xl text-sm" style={{ background: "#FEF3C7", color: "#92400E" }}><Lock size={16} /> {err.detail}</div>}
        {err && err.status !== 409 && <ErrorMsg e={err} />}
        {!rows && !err && <Loading />}
        {rows && (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows.map((r) => ({ ...r, color: FAM[r.id].color }))} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="id" tick={{ fontSize: 11, fill: INK, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, NLEV]} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #E2E8F0" }} />
              <Bar dataKey="target" name="Cible" fill="#E2E8F0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="avg" name="Actuel" radius={[3, 3, 0, 0]}>{rows.map((d, i) => <Cell key={i} fill={FAM[d.id].color} />)}</Bar>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

function Matching() {
  const [props, setProps] = useState(null);
  const [err, setErr] = useState(null);
  async function load() { try { setProps(await api.matchingProposals()); } catch (e) { setErr(e); } }
  useEffect(() => { load(); }, []);
  async function validate(mid, mentorId) { try { await api.validateMatch(mid, mentorId); load(); } catch (e) { setErr(e); } }
  if (err) return <ErrorMsg e={err} />;
  if (!props) return <Loading />;
  return (
    <Card className="p-4"><SectionTitle sub="L'algorithme propose · la RH valide">Matching à valider</SectionTitle>
      {props.length === 0 && <div className="text-sm text-slate-500 py-2">Tous les mentorés sont affectés. ✅</div>}
      <div className="space-y-3">{props.map((p) => (
        <div key={p.mentee_id} className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2 text-sm"><span className="font-semibold" style={{ color: INK }}>{p.mentee_name.split(" ")[0]}</span><ChevronRight size={14} className="text-slate-300" /><span className="font-semibold" style={{ color: ACCENT }}>{p.mentor_name.split(" ")[0]}</span></div><span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ color: ACCENT, background: `${ACCENT}12` }}>{p.compatibility}%</span></div>
          <div className="text-xs text-slate-500 mb-2">Couvre {p.covered}/{p.n_prio} priorités</div>
          <button onClick={() => validate(p.mentee_id, p.mentor_id)} className="w-full py-2 rounded-lg text-white text-sm font-semibold" style={{ background: INK }}>Valider ce binôme</button>
        </div>
      ))}</div>
    </Card>
  );
}

function Participants() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  async function load() { try { setList(await api.participants()); } catch (e) { setErr(e); } }
  useEffect(() => { load(); }, []);
  const mentors = (list || []).filter((u) => u.role === "mentor");
  const blank = { full_name: "", email: "", role: "mentee", metier: METIERS[0], entite: "", dispo: [], mentor_id: "" };

  async function save() {
    try {
      if (edit.id) await api.updateParticipant(edit.id, { full_name: edit.full_name, role: edit.role, metier: edit.metier, entite: edit.entite, dispo: edit.dispo, mentor_id: edit.mentor_id || null });
      else await api.createParticipant({ full_name: edit.full_name, email: edit.email, role: edit.role, metier: edit.metier, entite: edit.entite, dispo: edit.dispo });
      setEdit(null); setMsg("Enregistré."); load();
    } catch (e) { setMsg(e.detail || "Erreur"); }
  }
  async function remove(id) { try { await api.deleteParticipant(id); load(); } catch (e) { setErr(e); } }

  if (err) return <ErrorMsg e={err} />;
  if (!list) return <Loading />;
  return (
    <div className="space-y-4">
      <button onClick={() => setEdit(blank)} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2" style={{ background: ACCENT }}><UserPlus size={16} /> Ajouter un participant</button>
      <Card className="p-4"><SectionTitle sub={`${list.length} personnes · gestion administrative`}>Participants & mentors</SectionTitle><div className="space-y-1">
        {list.map((u) => (
          <div key={u.id} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0"><span className="rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ width: 28, height: 28, background: u.role === "mentor" ? GOLD : ACCENT }}>{u.full_name[0]}</span><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate" style={{ color: INK }}>{u.full_name}</div><div className="text-xs text-slate-400">{u.role === "mentor" ? "Mentor" : "Mentoré"} · {u.metier} · {u.entite}</div></div><button onClick={() => setEdit({ id: u.id, full_name: u.full_name, role: u.role, metier: u.metier, entite: u.entite, dispo: u.dispo || [], mentor_id: u.mentor_id || "" })} className="p-1.5" style={{ color: INK }}><Edit2 size={15} /></button><button onClick={() => remove(u.id)} className="p-1.5" style={{ color: RED }}><Trash2 size={15} /></button></div>
        ))}
      </div></Card>
      <p className="text-xs text-slate-400 px-1">La RH gère l'administratif. Les niveaux de compétence ne sont pas éditables ici (firewall).</p>
      {msg && <div className="text-sm p-3 rounded-xl" style={{ background: "#E6F4F0", color: ACCENT }}>{msg}</div>}

      {edit && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(16,38,58,.45)" }} onClick={() => setEdit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-bold" style={{ color: INK }}>{edit.id ? "Modifier" : "Nouveau participant"}</h3><button onClick={() => setEdit(null)}><X size={18} className="text-slate-400" /></button></div>
            <Field label="Nom complet"><input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} style={inputStyle} /></Field>
            {!edit.id && <Field label="Email (identifiant)"><input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} type="email" style={inputStyle} /></Field>}
            <Field label="Rôle"><select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} style={inputStyle}><option value="mentee">Mentoré</option><option value="mentor">Mentor</option></select></Field>
            <Field label="Métier"><select value={edit.metier} onChange={(e) => setEdit({ ...edit, metier: e.target.value })} style={inputStyle}>{METIERS.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
            <Field label="Entité"><input value={edit.entite} onChange={(e) => setEdit({ ...edit, entite: e.target.value })} style={inputStyle} /></Field>
            <Field label="Disponibilités"><input value={(edit.dispo || []).join("|")} onChange={(e) => setEdit({ ...edit, dispo: e.target.value.split(/[|;,]/).map((s) => s.trim()).filter(Boolean) })} placeholder="mar|jeu" style={inputStyle} /></Field>
            {edit.id && edit.role === "mentee" && <Field label="Mentor affecté"><select value={edit.mentor_id || ""} onChange={(e) => setEdit({ ...edit, mentor_id: e.target.value })} style={inputStyle}><option value="">— aucun —</option>{mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></Field>}
            {!edit.id && <p className="text-xs text-slate-400">Mot de passe initial : <code>changeme</code> (à changer à la première connexion).</p>}
            <button onClick={save} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: ACCENT }}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Rapports() {
  const [A, setA] = useState(null);
  const [err, setErr] = useState(null);
  const [pptBusy, setPptBusy] = useState(false);
  const [pptErr, setPptErr] = useState(null);
  useEffect(() => { (async () => { try { const [sum, carto] = await Promise.all([api.summary(), api.cartography("Tous")]); setA({ sum, carto }); } catch (e) { setErr(e); } })(); }, []);
  if (err) return <><Firewall /><ErrorMsg e={err} /></>;
  if (!A) return <><Firewall /><Loading /></>;
  const reduction = 35;

  async function downloadPptx() {
    setPptBusy(true); setPptErr(null);
    try {
      const blob = await api.reportPptxBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "Rapport_Executif_Cross_Mentoring.pptx"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { setPptErr(e); } finally { setPptBusy(false); }
  }

  function html() {
    const rows = (arr) => arr.map((r) => `<tr>${r.map((c, i) => `<td style="${i === 0 ? "font-weight:600;color:#12263A" : "color:#334155"}">${c}</td>`).join("")}</tr>`).join("");
    const carto = A.carto.map((c) => [c.name, c.avg.toFixed(1), c.target.toFixed(1), c.gap.toFixed(1)]);
    const prio = A.sum.priorities.map((p, i) => [`${i + 1}. ${p.name}`, p.gap.toFixed(1)]);
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reporting global</title>
<style>@media print{.noprint{display:none}}body{font-family:Calibri,Arial,sans-serif;color:#12263A;max-width:880px;margin:24px auto;padding:0 24px;line-height:1.5}
h1{font-size:26px;margin:0}.kick{color:#0E7C6B;font-weight:700;letter-spacing:2px;font-size:12px}h2{font-size:17px;border-bottom:2px solid #0E7C6B;padding-bottom:4px;margin-top:26px}
.cards{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.card{flex:1;min-width:150px;border:1px solid #E2E8F0;border-radius:12px;padding:14px}.big{font-size:30px;font-weight:700}.lbl{font-size:12px;color:#64748B}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}th{text-align:left;background:#F1F5F9;padding:8px}td{padding:7px 8px;border-bottom:1px solid #EEF2F6}
.note{background:#F0FDF9;border:1px solid #0E7C6B33;border-radius:10px;padding:12px;font-size:13px;margin-top:12px}.btn{background:#0E7C6B;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer}</style></head><body>
<button class="btn noprint" onclick="window.print()">Imprimer / PDF</button>
<p class="kick">REPORTING GLOBAL</p><h1>Programme Cross-Mentoring Digital Banking</h1>
<p class="lbl">Crédit du Congo · Groupe Attijariwafa Bank · ${new Date().toLocaleDateString("fr-FR")}</p>
<div class="cards"><div class="card"><div class="big">${A.sum.participants}</div><div class="lbl">Participants</div></div><div class="card"><div class="big" style="color:#C08A2D">${A.sum.avg_gap.toFixed(1)}</div><div class="lbl">Écart moyen /8</div></div><div class="card"><div class="big" style="color:#0E7C6B">−${reduction}%</div><div class="lbl">Réduction projetée</div></div><div class="card"><div class="big" style="color:#0E7C6B">${A.sum.mentors}</div><div class="lbl">Mentors</div></div></div>
<h2>Compétences prioritaires</h2><table><tr><th>Compétence</th><th>Écart</th></tr>${rows(prio)}</table>
<h2>Cartographie collective (échelle 8)</h2><table><tr><th>Compétence</th><th>Actuel</th><th>Cible</th><th>Écart</th></tr>${rows(carto)}</table>
<div class="note"><b>Confidentialité by design.</b> Score isolé des décisions RH. Agrégats uniquement (n ≥ 5). Firewall appliqué côté serveur.</div>
<footer style="margin-top:28px;color:#94A3B8;font-size:11px;border-top:1px solid #E2E8F0;padding-top:10px">Document confidentiel</footer></body></html>`;
  }

  return (
    <div className="space-y-4">
      <Firewall />
      <Card className="p-4"><SectionTitle sub="Analyse agrégée prête à diffuser">Reporting global</SectionTitle>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center rounded-xl p-2" style={{ background: LIGHT }}><div className="text-xl font-bold" style={{ color: INK }}>{A.sum.participants}</div><div className="text-xs text-slate-500">participants</div></div>
          <div className="text-center rounded-xl p-2" style={{ background: LIGHT }}><div className="text-xl font-bold" style={{ color: GOLD }}>{A.sum.avg_gap.toFixed(1)}</div><div className="text-xs text-slate-500">écart /8</div></div>
          <div className="text-center rounded-xl p-2" style={{ background: LIGHT }}><div className="text-xl font-bold" style={{ color: ACCENT }}>−{reduction}%</div><div className="text-xs text-slate-500">réduction</div></div>
        </div>
        <button onClick={() => download("reporting_global.html", html())} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2" style={{ background: INK }}><Download size={16} /> Télécharger le reporting global (imprimable / PDF)</button>
      </Card>
      <Card className="p-4"><div className="flex items-center gap-2 mb-2"><FileText size={16} style={{ color: INK }} /><span className="font-semibold text-sm" style={{ color: INK }}>Rapport PowerPoint exécutif</span></div>
        <p className="text-sm text-slate-600 mb-3">Deck de 8 slides (synthèse, cartographie, populations, impact, gouvernance) généré côté serveur à partir des agrégats — échelle 8 niveaux, firewall respecté.</p>
        {pptErr && <div className="mb-2"><ErrorMsg e={pptErr} /></div>}
        <button onClick={downloadPptx} disabled={pptBusy} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2" style={{ background: ACCENT, opacity: pptBusy ? 0.7 : 1 }}>
          <FileSpreadsheet size={16} /> {pptBusy ? "Génération…" : "Générer le PPT exécutif (.pptx)"}
        </button>
      </Card>
    </div>
  );
}
