import React, { useState } from "react";
import { ShieldCheck, LogIn } from "lucide-react";
import { api, API_BASE } from "../api";
import { INK, ACCENT, Card } from "../common";

const DEMO = [["RH / Admin", "rh@cdc.cg"], ["Mentor", "nadia@cdc.cg"], ["Mentorée", "sophie@cdc.cg"]];

export default function Login({ onLogged }) {
  const [email, setEmail] = useState("rh@cdc.cg");
  const [password, setPassword] = useState("demo1234");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const t = await api.login(email, password);
      api.setToken(t.access_token);
      const me = await api.me();
      onLogged(me);
    } catch (x) { setErr(x.detail || "Échec de connexion"); api.setToken(null); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: INK }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-white/80 text-xs mb-2"><ShieldCheck size={15} style={{ color: ACCENT }} /> Firewall de confidentialité côté serveur</div>
          <h1 className="text-white font-bold text-xl">Cross-Mentoring Digital Banking</h1>
          <p className="text-white/50 text-sm mt-1">Crédit du Congo · Groupe Attijariwafa Bank</p>
        </div>
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-3">
            <div><div className="text-xs text-slate-500 mb-1">Email</div><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" style={inp} /></div>
            <div><div className="text-xs text-slate-500 mb-1">Mot de passe</div><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" style={inp} /></div>
            {err && <div className="text-sm p-2 rounded-lg" style={{ background: "#FDECEC", color: "#B91C1C" }}>{err}</div>}
            <button disabled={busy} type="submit" className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2" style={{ background: ACCENT, opacity: busy ? 0.7 : 1 }}>
              <LogIn size={16} /> {busy ? "Connexion…" : "Se connecter"}
            </button>
          </form>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-400 mb-1">Comptes de démonstration (mot de passe : demo1234)</div>
            <div className="flex flex-wrap gap-1.5">{DEMO.map(([l, e]) => (
              <button key={e} onClick={() => { setEmail(e); setPassword("demo1234"); }} className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: "#E2E8F0", color: INK }}>{l}</button>
            ))}</div>
          </div>
        </Card>
        <div className="text-center text-white/30 text-xs mt-4">API : {API_BASE}</div>
      </div>
    </div>
  );
}
const inp = { width: "100%", padding: "9px 11px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#334155" };
