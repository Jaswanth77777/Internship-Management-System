import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, BriefcaseBusiness, ClipboardList, GraduationCap, LogOut, Search, ShieldCheck, Users, Bell, FileCheck, Building2, LayoutDashboard, Plus } from "lucide-react";

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
  if (!session) return <main className="login-shell"><div className="orb orb-a"/><div className="orb orb-b"/><motion.form initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="login-card" onSubmit={login}>
    <div className="brand-mark">IH</div><p className="eyebrow">INTERNSHIP MANAGEMENT PLATFORM</p><h1>Welcome to <span>InternHub</span></h1><p className="muted">One workspace for students, faculty and industry.</p>
    <label>Portal</label><select value={role} onChange={e=>{setRole(e.target.value);setEmail(demo[e.target.value]);}}>{roles.map(r=><option key={r}>{r}</option>)}</select>
    <label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
    <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
    {error && <p className="error">{error}</p>}<button className="primary">Sign in <span>→</span></button>
    <p className="hint">API-backed sign-in. Demo accounts must be created by an administrator.</p>
  </motion.form></main>;
  return <Workspace user={session.user} request={request} logout={logout}/>;
}

function Workspace({user,request,logout}) {
  const [tab,setTab]=useState("Overview"), [data,setData]=useState({}), [error,setError]=useState(""), [message,setMessage]=useState("");
  const [query,setQuery]=useState(""), [purpose,setPurpose]=useState(""), [summary,setSummary]=useState(""), [hours,setHours]=useState(40);
  const [job,setJob]=useState({title:"",description:"",department:"",skills:"",stipend:"",durationWeeks:12,location:"",eligibility:""});
  const [studentId,setStudentId]=useState("");
  const [review,setReview]=useState({});
  const role=user.role;
  const common=[["Overview",LayoutDashboard],["Notifications",Bell]];
  const menus=role==="STUDENT"?[...common,["Internships",BriefcaseBusiness],["My Applications",ClipboardList],["Weekly Logbook",FileCheck],["NOC Requests",ShieldCheck]]:
    role==="FACULTY"?[...common,["My Students",Users],["NOC Approvals",ShieldCheck],["Logbook Reviews",ClipboardList]]:
    role==="COMPANY"?[...common,["My Internships",BriefcaseBusiness],["Applicants",Users]]:
    [...common,["Users",Users],["Companies",Building2],["Internship Approvals",BriefcaseBusiness]];
  async function load(target=tab) {
    setError("");
    const calls={
      Overview: role==="ADMIN"?["/admin/overview"]:role==="STUDENT"?["/internships","/applications/mine","/logbook","/nocs/mine"]:role==="COMPANY"?["/company/internships","/company/applications"]:["/faculty/students","/faculty/nocs","/faculty/logbook"],
      Internships:["/internships"],"My Applications":["/applications/mine"],"Weekly Logbook":["/logbook"],"NOC Requests":["/nocs/mine"],
      "My Students":["/faculty/students","/faculty/available-students"],"NOC Approvals":["/faculty/nocs"],"Logbook Reviews":["/faculty/logbook"],
      "My Internships":["/company/internships"],Applicants:["/company/applications"],
      Users:["/admin/users"],Companies:["/admin/companies"],"Internship Approvals":["/admin/internships"],Notifications:["/notifications"]
    };
    try { const paths=calls[target]||[]; const vals=await Promise.all(paths.map(p=>request(p))); setData(old=>({...old,[target]:vals})); }
    catch(e){setError(e.message);}
  }
  useEffect(()=>{load("Overview");},[]);
  useEffect(()=>{load(tab);},[tab]);
  async function act(path,body,method="POST",success="Saved successfully") {
    try { await request(path,{method,body:JSON.stringify(body)});setMessage(success);await load(tab);if(tab!=="Overview")load("Overview"); }
    catch(e){setError(e.message);}
  }
  const overview=data.Overview||[];
  const internships=tab==="Overview"?(overview[0]||[]):(data[tab]?.[0]||[]);
  const apps=data["My Applications"]?.[0]||[];
  const logs=data["Weekly Logbook"]?.[0]||[];
  const nocs=data["NOC Requests"]?.[0]||[];
  const students=data["My Students"]?.[0]||[]; const availableStudents=data["My Students"]?.[1]||[];
  const facultyNocs=data["NOC Approvals"]?.[0]||[];
  const facultyLogs=data["Logbook Reviews"]?.[0]||[];
  const companyJobs=data["My Internships"]?.[0]||[];
  const applicants=data.Applicants?.[0]||[];
  const users=data.Users?.[0]||[];
  const companies=data.Companies?.[0]||[];
  const adminJobs=data["Internship Approvals"]?.[0]||[];
  const notifications=data.Notifications?.[0]||[];
  const visibleInternships=(tab==="Overview"&&role==="STUDENT"?internships:data.Internships?.[0]||[]).filter(i=>(i.title+" "+i.description).toLowerCase().includes(query.toLowerCase()));
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">IH</div><b>InternHub</b></div><div className="side-label">WORKSPACE</div>
    {menus.map(([name,Icon])=><button key={name} className={tab===name?"nav-item active":"nav-item"} onClick={()=>setTab(name)}><Icon size={17}/>{name}</button>)}
    <div className="side-bottom"><span>{user.name}</span><small>{role}</small><button className="ghost" onClick={logout}><LogOut size={16}/> Sign out</button></div></aside>
    <main className="content"><header><div><p className="eyebrow">{role} WORKSPACE</p><h1>{tab==="Overview"?"Good day, "+user.name.split(" ")[0]:tab}</h1><p className="muted">Manage your internship activity in one place.</p></div><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div></header>
    {error&&<p className="error banner">{error}</p>}{message&&<p className="success banner">{message}</p>}
    {tab==="Overview"&&<><section className="stats">{role==="ADMIN"?Object.entries(overview[0]||{}).map(([k,v])=><Stat key={k} icon={<Activity/>} label={k} value={v}/>):<><Stat icon={<GraduationCap/>} label="Portal" value={role}/><Stat icon={<BriefcaseBusiness/>} label="Open internships" value={role==="STUDENT"?internships.length:role==="COMPANY"?(overview[0]?.length||0):(adminJobs.length)}/><Stat icon={<ClipboardList/>} label="Applications / Logs" value={role==="STUDENT"?(overview[1]?.length||0):role==="COMPANY"?(overview[1]?.length||0):(overview[2]?.length||0)}/></>}</section>
    {role==="STUDENT"&&<section className="panel"><h2>Explore internships</h2><div className="search"><Search size={16}/><input placeholder="Search opportunities" value={query} onChange={e=>setQuery(e.target.value)}/></div><InternshipList rows={internships} onApply={id=>act("/applications",{internshipId:id},"POST","Application submitted")}/></section>}
    {role==="COMPANY"&&<section className="panel"><h2>Company workspace</h2><p className="muted">Post roles and review applicants from the menu.</p><p>{overview[0]?.length||0} internships · {overview[1]?.length||0} applications</p></section>}
    {role==="FACULTY"&&<section className="panel"><h2>Faculty workspace</h2><p>{overview[0]?.length||0} allocated students · {overview[1]?.length||0} pending NOC requests · {overview[2]?.length||0} logbook entries</p></section>}
    </>}
    {tab==="Internships"&&<section className="panel"><div className="panel-head"><h2>Available internships</h2><div className="search"><Search size={16}/><input placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)}/></div></div><InternshipList rows={visibleInternships} onApply={id=>act("/applications",{internshipId:id},"POST","Application submitted")}/></section>}
    {tab==="My Applications"&&<section className="panel"><h2>Application tracking</h2><Rows rows={apps} empty="You have not applied to an internship yet." render={a=><><b>{a.internship?.title}</b><p>{a.internship?.company?.legalName} · Applied {new Date(a.appliedAt).toLocaleDateString()}</p><span className="status">{a.status}</span></>}/></section>}
    {tab==="Weekly Logbook"&&<section className="panel"><h2>Weekly Logbook</h2><form className="log-form" onSubmit={e=>{e.preventDefault();const start=new Date();start.setDate(start.getDate()-((start.getDay()+6)%7));start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+6);act("/logbook",{weekStart:start.toISOString(),weekEnd:end.toISOString(),summary,hours:Number(hours)});setSummary("");}}><textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Describe your work, learning and achievements this week..." minLength={10} required/><div className="log-actions"><label>Hours worked <input type="number" min="0" max="168" value={hours} onChange={e=>setHours(e.target.value)}/></label><button className="primary">Submit weekly log</button></div></form><Rows rows={logs} empty="Your submitted weekly logs will appear here." render={l=><><b>{new Date(l.weekStart).toLocaleDateString()} – {new Date(l.weekEnd).toLocaleDateString()}</b><p>{l.summary}</p><span className="status">{l.status}</span>{l.feedback&&<p>{l.feedback}</p>}</>}/></section>}
    {tab==="NOC Requests"&&<section className="panel"><h2>Request a No Objection Certificate</h2><form className="inline-form" onSubmit={e=>{e.preventDefault();act("/nocs",{purpose});setPurpose("");}}><textarea value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="Explain why you need an NOC..." minLength={5} required/><button className="primary">Submit NOC request</button></form><Rows rows={nocs} empty="No NOC requests yet." render={n=><><b>{n.purpose}</b><span className="status">{n.status}</span>{n.remarks&&<p>{n.remarks}</p>}</>}/></section>}
    {tab==="My Students"&&<section className="panel"><h2>Allocated students</h2><form className="inline-form" onSubmit={e=>{e.preventDefault();act("/faculty/allocations",{studentId});setStudentId("");}}><select value={studentId} onChange={e=>setStudentId(e.target.value)} required><option value="">Select a student to assign</option>{availableStudents.filter(s=>!students.some(a=>a.id===s.id)).map(s=><option key={s.id} value={s.id}>{s.user?.name} · {s.user?.email}</option>)}</select><button className="primary">Assign student</button></form><Rows rows={students} empty="No students allocated. Assign a student using their profile ID." render={s=><><b>{s.user?.name}</b><p>{s.user?.email} · {s.department||"Department not set"}</p><small>{s.weeklyLogs?.length||0} weekly logs · {s.applications?.length||0} applications</small></>}/></section>}
    {tab==="NOC Approvals"&&<section className="panel"><h2>Pending NOC approvals</h2><Rows rows={facultyNocs} empty="No pending NOC requests." render={n=><><b>{n.student?.user?.name}</b><p>{n.purpose}</p><div className="action-row"><button className="primary" onClick={()=>act("/faculty/nocs/"+n.id,{status:"APPROVED"},"PATCH","NOC approved")}>Approve</button><button className="secondary" onClick={()=>act("/faculty/nocs/"+n.id,{status:"REJECTED"},"PATCH","NOC rejected")}>Reject</button></div></>}/></section>}
    {tab==="Logbook Reviews"&&<section className="panel"><h2>Student logbook reviews</h2><Rows rows={facultyLogs} empty="No allocated student log entries." render={l=><><b>{l.student?.user?.name} · {l.hours} hours</b><p>{l.summary}</p><input placeholder="Feedback (optional)" value={review[l.id]||""} onChange={e=>setReview(o=>({...o,[l.id]:e.target.value}))}/><div className="action-row"><button className="primary" onClick={()=>act("/faculty/logbook/"+l.id,{status:"APPROVED",feedback:review[l.id]},"PATCH","Log approved")}>Approve</button><button className="secondary" onClick={()=>act("/faculty/logbook/"+l.id,{status:"REVISION_REQUIRED",feedback:review[l.id]},"PATCH","Revision requested")}>Request revision</button></div></>}/></section>}
    {tab==="My Internships"&&<section className="panel"><h2>Post an internship</h2><form className="job-form" onSubmit={e=>{e.preventDefault();act("/internships",{...job,skills:job.skills.split(",").map(x=>x.trim()).filter(Boolean),durationWeeks:Number(job.durationWeeks)});setJob({title:"",description:"",department:"",skills:"",stipend:"",durationWeeks:12,location:"",eligibility:""});}}><input placeholder="Internship title" value={job.title} onChange={e=>setJob({...job,title:e.target.value})} required minLength={3}/><textarea placeholder="Description" value={job.description} onChange={e=>setJob({...job,description:e.target.value})} required minLength={10}/><input placeholder="Department" value={job.department} onChange={e=>setJob({...job,department:e.target.value})}/><input placeholder="Skills (comma separated)" value={job.skills} onChange={e=>setJob({...job,skills:e.target.value})}/><input placeholder="Stipend" value={job.stipend} onChange={e=>setJob({...job,stipend:e.target.value})}/><input placeholder="Location" value={job.location} onChange={e=>setJob({...job,location:e.target.value})}/><input placeholder="Eligibility" value={job.eligibility} onChange={e=>setJob({...job,eligibility:e.target.value})}/><button className="primary"><Plus size={15}/> Submit for approval</button></form><h2 className="subheading">Your postings</h2><Rows rows={companyJobs} empty="No internships posted yet." render={j=><><b>{j.title}</b><p>{j.description}</p><span className="status">{j.status}</span><small>{j._count?.applications||0} applicants</small></>}/></section>}
    {tab==="Applicants"&&<section className="panel"><h2>Applicants</h2><Rows rows={applicants} empty="No applications received." render={a=><><b>{a.student?.user?.name} · {a.internship?.title}</b><p>{a.student?.user?.email} · {new Date(a.appliedAt).toLocaleDateString()}</p><span className="status">{a.status}</span><div className="action-row">{["UNDER_REVIEW","SHORTLISTED","OFFERED","REJECTED","ACCEPTED"].map(st=><button key={st} className="secondary" onClick={()=>act("/company/applications/"+a.id+"/status",{status:st},"PATCH","Application updated")}>{st.replaceAll("_"," ")}</button>)}</div></>}/></section>}
    {tab==="Users"&&<section className="panel"><h2>User management</h2><Rows rows={users} empty="No users registered." render={u=><><b>{u.name} · {u.role}</b><p>{u.email}</p><span className="status">{u.isActive?"ACTIVE":"INACTIVE"}</span><button className="secondary" onClick={()=>act("/admin/users/"+u.id,{isActive:!u.isActive},"PATCH","User updated")}>{u.isActive?"Deactivate":"Activate"}</button></>}/></section>}
    {tab==="Companies"&&<section className="panel"><h2>Company verification</h2><Rows rows={companies} empty="No companies registered." render={c=><><b>{c.legalName}</b><p>{c.user?.email} · {c._count?.internships||0} internships</p><span className="status">{c.verified?"VERIFIED":"PENDING"}</span><button className="secondary" onClick={()=>act("/admin/companies/"+c.id+"/verify",{verified:!c.verified},"PATCH","Company updated")}>{c.verified?"Remove verification":"Verify company"}</button></>}/></section>}
    {tab==="Internship Approvals"&&<section className="panel"><h2>Internship moderation</h2><Rows rows={adminJobs} empty="No internships submitted." render={j=><><b>{j.title} · {j.company?.legalName}</b><p>{j.description}</p><span className="status">{j.status}</span><div className="action-row"><button className="primary" onClick={()=>act("/admin/internships/"+j.id+"/status",{status:"OPEN"},"PATCH","Internship approved")}>Approve / Publish</button><button className="secondary" onClick={()=>act("/admin/internships/"+j.id+"/status",{status:"CLOSED"},"PATCH","Internship closed")}>Close</button></div></>}/></section>}
    {tab==="Notifications"&&<section className="panel"><h2>Notifications</h2><Rows rows={notifications} empty="You have no notifications." render={n=><><b>{n.title}</b><p>{n.body}</p><small>{new Date(n.createdAt).toLocaleString()}</small>{!n.readAt&&<button className="secondary" onClick={()=>act("/notifications/"+n.id+"/read",{},"PATCH","Marked as read")}>Mark as read</button>}</>}/></section>}
    <footer>InternHub · Internship Management System</footer></main></div>;
}
function InternshipList({rows,onApply}) { return <div className="opportunities">{rows.map(i=><article className="opportunity" key={i.id}><div className="company-icon"><BriefcaseBusiness/></div><div><b>{i.title}</b><p>{i.company?.legalName||"Company"} · {i.location||"Location not specified"}</p><small>{i.stipend||"Stipend not listed"} · {i.durationWeeks?i.durationWeeks+" weeks":"Flexible duration"}</small></div><button className="primary" onClick={()=>onApply(i.id)}>Apply</button></article>)}{!rows.length&&<p className="muted">No approved internships are available yet.</p>}</div>; }
function Rows({rows,empty,render}) { return <div className="data-list">{rows.map((r,i)=><article className="data-row" key={r.id||i}>{render(r)}</article>)}{!rows.length&&<p className="muted">{empty}</p>}</div>; }
function Stat({icon,label,value}) { return <motion.div whileHover={{y:-4}} className="stat"><div className="stat-icon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></motion.div>; }
