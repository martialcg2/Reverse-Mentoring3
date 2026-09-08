// Client API — parle à la FastAPI. Le jeton JWT est conservé en localStorage.
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
let token = localStorage.getItem("cdc_token") || null;

async function req(path, { method = "GET", body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const opts = { method, headers };
  if (form) { headers["Content-Type"] = "application/x-www-form-urlencoded"; opts.body = new URLSearchParams(form).toString(); }
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(`${BASE}${path}`, opts); }
  catch (e) { throw { status: 0, detail: "Impossible de joindre l'API. Vérifiez VITE_API_URL et la connexion." }; }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, detail: data.detail || `Erreur ${res.status}` };
  return data;
}

export const API_BASE = BASE;
export const api = {
  base: BASE,
  setToken(t) { token = t; t ? localStorage.setItem("cdc_token", t) : localStorage.removeItem("cdc_token"); },
  getToken() { return token; },

  login: (email, password) => req("/auth/login", { method: "POST", form: { username: email, password } }),
  me: () => req("/me"),
  myCompetencies: () => req("/me/competencies"),
  submitDiagnostic: (answers, declared, dont_know) => req("/me/diagnostic", { method: "POST", body: { answers, declared, dont_know } }),

  mentees: () => req("/mentor/mentees"),
  menteeCompetencies: (id) => req(`/mentor/mentees/${id}/competencies`),
  logSession: (mentee_id, family, notes = "") => req("/mentor/sessions", { method: "POST", body: { mentee_id, family, notes } }),

  participants: () => req("/rh/participants"),
  createParticipant: (p) => req("/rh/participants", { method: "POST", body: p }),
  updateParticipant: (id, p) => req(`/rh/participants/${id}`, { method: "PUT", body: p }),
  deleteParticipant: (id) => req(`/rh/participants/${id}`, { method: "DELETE" }),

  matchingProposals: () => req("/rh/matching/proposals"),
  validateMatch: (mentee_id, mentor_id) => req("/rh/matching/validate", { method: "POST", body: { mentee_id, mentor_id } }),

  cartography: (seg) => req(`/rh/reporting/cartography${seg && seg !== "Tous" ? `?segment=${encodeURIComponent(seg)}` : ""}`),
  summary: () => req("/rh/reporting/summary"),
  tracking: () => req("/rh/reporting/tracking"),

  async reportPptxBlob() {
    const res = await fetch(`${BASE}/rh/reporting/pptx`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw { status: res.status, detail: d.detail || `Erreur ${res.status}` }; }
    return res.blob();
  },
};
