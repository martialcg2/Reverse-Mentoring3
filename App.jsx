import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { api } from "./api";
import { INK, ACCENT, GOLD } from "./common";
import Login from "./screens/Login";
import Mentee from "./screens/Mentee";
import Mentor from "./screens/Mentor";
import RH from "./screens/RH";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Session persistée : si un jeton existe, on récupère le profil.
  useEffect(() => {
    (async () => {
      if (api.getToken()) {
        try { setUser(await api.me()); } catch { api.setToken(null); }
      }
      setReady(true);
    })();
  }, []);

  function logout() { api.setToken(null); setUser(null); }

  if (!ready) return null;
  if (!user) return <Login onLogged={setUser} />;

  const roleLabel = { mentee: "Mentoré", mentor: "Mentor", rh: "RH / Admin", admin: "Admin" }[user.role] || user.role;
  const roleColor = { mentee: ACCENT, mentor: GOLD, rh: INK, admin: INK }[user.role] || INK;

  return (
    <div className="min-h-screen" style={{ background: "#F1F5F9" }}>
      <header style={{ background: INK }} className="px-4 pt-4 pb-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div><div className="text-white font-bold text-sm leading-tight">Cross-Mentoring Digital Banking</div><div className="text-white/50 text-xs">Crédit du Congo · Groupe Attijariwafa Bank</div></div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1" style={{ background: "rgba(255,255,255,.1)" }}>
              <span className="rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ width: 26, height: 26, background: roleColor }}>{(user.full_name || "?")[0]}</span>
              <span className="text-white text-xs">{roleLabel}</span>
            </span>
            <button onClick={logout} title="Se déconnecter" className="rounded-full p-1.5" style={{ background: "rgba(255,255,255,.1)" }}><LogOut size={15} className="text-white/80" /></button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-10 pt-3 max-w-xl mx-auto">
        {user.role === "mentee" && <Mentee me={user} />}
        {user.role === "mentor" && <Mentor />}
        {(user.role === "rh" || user.role === "admin") && <RH />}
      </main>

      <footer className="text-center text-xs text-slate-400 pb-6 px-4">8 niveaux · Firewall côté serveur · Mesurer → Développer → Accompagner → Prouver</footer>
    </div>
  );
}
