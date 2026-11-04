import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, BriefcaseBusiness, ClipboardList, GraduationCap, LogOut, Search, ShieldCheck, Users } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const roles = ["STUDENT", "FACULTY", "COMPANY", "ADMIN"];
const demo = { STUDENT: "student@internhub.demo", FACULTY: "faculty@internhub.demo", COMPANY: "company@internhub.demo", ADMIN: "admin@internhub.demo" };

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("internhub-session") || "null"); } catch { return null; }
  });
  const [email, setEmail] = useState(demo.STUDENT);
  const [password, setPassword] = useState("demo123");
  const [role, setRole] = useState("STUDENT");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [internships, setInternships] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState("");
  const [hours, setHours] = useState(40);

  async function request(path, options = {}) {
    const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}), ...options.headers } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  async function login(event) {
    event.preventDefault(); setError("");
    try {
      const data = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const next = { token: data.token, user: data.user };
      localStorage.setItem("internhub-session", JSON.stringify(next)); setSession(next);
    } catch (e) { setError(e.message); }
  }
  function logout() { localStorage.removeItem("internhub-session"); setSession(null); }
  useEffect(() => {
    if (!session) return;
    request("/internships").then(setInternships).catch(() => {});
    if (session.user.role === "STUDENT") request("/logbook").then(setLogs).catch(() => {});
  }, [session]);
  async function submitLog(event) {
    event.preventDefault();
    try {
      const start = new Date(); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      await request("/logbook", { method: "POST", body: JSON.stringify({ weekStart: start.toISOString(), weekEnd: end.toISOString(), summary, hours: Number(hours) }) });
      setLogs(await request("/logbook")); setSummary("");
    } catch (e) { setError(e.message); }
  }
  if (!session) return <main className="login-shell"><div className="orb orb-a"/><div className="orb orb-b"/><motion.form initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="login-card" onSubmit={login}>
    <div className="brand-mark">IH</div><p className="eyebrow">INTERNSHIP MANAGEMENT PLATFORM</p><h1>Welcome to <span>InternHub</span></h1><p className="muted">One workspace for students, faculty and industry.</p>
    <label>Portal</label><select value={role} onChange={e=>{setRole(e.target.value);setEmail(demo[e.target.value]);}}>{roles.map(r=><option key={r}>{r}</option>)}</select>
    <label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
    <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
    {error && <p className="error">{error}</p>}<button className="primary">Sign in <span>→</span></button>
    <p className="hint">API-backed sign-in. Demo accounts must be created by an administrator.</p>
  </motion.form></main>;

  const user = session.user;
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">IH</div><b>InternHub</b></div><div className="side-label">WORKSPACE</div><a className="active"><Activity size={17}/> Overview</a><a><BriefcaseBusiness size={17}/> Internships</a><a><ClipboardList size={17}/> Weekly Logbook</a><a><Users size={17}/> Applications</a><a><ShieldCheck size={17}/> Documents</a><div className="side-bottom"><span>{user.name}</span><small>{user.role}</small><button className="ghost" onClick={logout}><LogOut size={16}/> Sign out</button></div></aside>
  <main className="content"><header><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Good day, {user.name.split(" ")[0]}</h1><p className="muted">Here is your internship activity at a glance.</p></div><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div></header>
    <section className="stats"><Stat icon={<GraduationCap/>} label="Portal" value={user.role}/><Stat icon={<BriefcaseBusiness/>} label="Open internships" value={internships.length}/><Stat icon={<ClipboardList/>} label="Weekly logs" value={logs.length}/></section>
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">OPPORTUNITIES</p><h2>Explore internships</h2></div><div className="search"><Search size={16}/><input placeholder="Search opportunities" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
      <div className="opportunities">{internships.filter(i=>(i.title+" "+i.description).toLowerCase().includes(query.toLowerCase())).map(i=><article className="opportunity" key={i.id}><div className="company-icon"><BriefcaseBusiness/></div><div><b>{i.title}</b><p>{i.company?.legalName || "Company"} · {i.location || "Location not specified"}</p><small>{i.stipend || "Stipend not listed"} · {i.durationWeeks ? i.durationWeeks+" weeks" : "Flexible duration"}</small></div><span className="status">{i.status}</span></article>)}{!internships.length && <p className="muted">No approved internships are available yet.</p>}</div>
    </section>
    {user.role==="STUDENT" && <section className="panel"><div className="panel-head"><div><p className="eyebrow">PRESERVED CORE WORKFLOW</p><h2>Weekly Logbook</h2></div><span className="status">Weekly progress</span></div><form className="log-form" onSubmit={submitLog}><textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Describe your work, learning and achievements this week..." minLength={10} required/><div className="log-actions"><label>Hours worked <input type="number" min="0" max="168" value={hours} onChange={e=>setHours(e.target.value)}/></label><button className="primary">Submit weekly log</button></div></form><div className="log-list">{logs.map(log=><article className="log-item" key={log.id}><div><b>{new Date(log.weekStart).toLocaleDateString()} – {new Date(log.weekEnd).toLocaleDateString()}</b><p>{log.summary}</p><small>{log.hours} hours · {log.status.replaceAll("_"," ")}</small></div></article>)}{!logs.length&&<p className="muted">Your submitted weekly logs will appear here.</p>}</div></section>}
    <footer>InternHub · Internship Management System</footer>
  </main></div>;
}
function Stat({icon,label,value}) { return <motion.div whileHover={{y:-4}} className="stat"><div className="stat-icon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></motion.div>; }
