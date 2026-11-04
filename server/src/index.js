import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { registerWorkflowRoutes } from "./workflows.js";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required. Copy .env.example to .env and set a secret.");

app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map(value => value.trim());
app.use(cors({ origin: (origin, callback) => !origin || allowedOrigins.includes(origin) ? callback(null, true) : callback(new Error("Origin not allowed by CORS")) }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });
app.use(express.json({ limit: "1mb" }));

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "8h" });

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return res.status(401).json({ error: "Account unavailable" });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: "Invalid or expired session" }); }
}
const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: "You do not have permission" });

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "InternHub API" }));

registerWorkflowRoutes(app, { prisma, authenticate, allow, asyncRoute });

app.post("/api/auth/register", authLimiter, asyncRoute(async (req, res) => {
  const input = z.object({
    name: z.string().min(2), email: z.string().email(),
    password: z.string().min(8), role: z.enum(["STUDENT", "FACULTY", "COMPANY"])
  }).parse(req.body);
  const email = input.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: "Email already registered" });
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { name: input.name, email, passwordHash, role: input.role,
      ...(input.role === "STUDENT" ? { student: { create: {} } } : {}),
      ...(input.role === "FACULTY" ? { faculty: { create: {} } } : {}),
      ...(input.role === "COMPANY" ? { company: { create: { legalName: input.name } } } : {})
    }
  });
  res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.post("/api/auth/login", authLimiter, asyncRoute(async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ error: "Invalid email or password" });
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.get("/api/auth/me", authenticate, (req, res) => res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role }));

app.get("/api/internships", asyncRoute(async (req, res) => {
  const q = String(req.query.q || "");
  const rows = await prisma.internship.findMany({
    where: { status: "OPEN", company: { verified: true }, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
    include: { company: { select: { legalName: true, verified: true } } }, orderBy: { createdAt: "desc" }, take: 50
  });
  res.json(rows);
}));

app.post("/api/internships", authenticate, allow("COMPANY"), asyncRoute(async (req, res) => {
  const input = z.object({ title: z.string().min(3), description: z.string().min(10), department: z.string().optional(), skills: z.array(z.string()).default([]), eligibility: z.string().optional(), stipend: z.string().optional(), durationWeeks: z.number().int().positive().optional(), location: z.string().optional(), applicationDeadline: z.string().datetime().optional() }).parse(req.body);
  const company = await prisma.company.findUnique({ where: { userId: req.user.id } });
  if (!company) return res.status(404).json({ error: "Company profile not found" });
  if (!company.verified) return res.status(403).json({ error: "Your company must be verified by an administrator before posting internships" });
  const internship = await prisma.internship.create({ data: { ...input, applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null, companyId: company.id, status: "PENDING_APPROVAL" } });
  res.status(201).json(internship);
}));

app.post("/api/applications", authenticate, allow("STUDENT"), asyncRoute(async (req, res) => {
  const input = z.object({ internshipId: z.string(), coverLetter: z.string().optional(), resumeUrl: z.string().url().optional() }).parse(req.body);
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  const internship = await prisma.internship.findUnique({ where: { id: input.internshipId } });
  if (!student || !internship || internship.status !== "OPEN") return res.status(400).json({ error: "Internship is not available" });
  const application = await prisma.application.create({ data: { ...input, studentId: student.id } });
  const company = await prisma.company.findUnique({ where: { id: internship.companyId } });
  if (company) await prisma.notification.create({ data: { userId: company.userId, title: "New internship application", body: `${req.user.name} applied for ${internship.title}.` } });
  res.status(201).json(application);
}));

app.get("/api/applications/mine", authenticate, allow("STUDENT"), asyncRoute(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  const rows = await prisma.application.findMany({ where: { studentId: student.id }, include: { internship: { include: { company: true } }, interview: true, offer: true }, orderBy: { appliedAt: "desc" } });
  res.json(rows);
}));

app.get("/api/logbook", authenticate, allow("STUDENT"), asyncRoute(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  res.json(await prisma.weeklyLog.findMany({ where: { studentId: student.id }, orderBy: { weekStart: "desc" } }));
}));

app.post("/api/logbook", authenticate, allow("STUDENT"), asyncRoute(async (req, res) => {
  const input = z.object({ weekStart: z.string().datetime(), weekEnd: z.string().datetime(), summary: z.string().min(10), hours: z.number().min(0).max(168) }).parse(req.body);
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  const log = await prisma.weeklyLog.create({ data: { ...input, weekStart: new Date(input.weekStart), weekEnd: new Date(input.weekEnd), studentId: student.id } });
  res.status(201).json(log);
}));

app.get("/api/admin/overview", authenticate, allow("ADMIN"), asyncRoute(async (_req, res) => {
  const [students, faculty, companies, internships, applications] = await Promise.all([
    prisma.student.count(), prisma.faculty.count(), prisma.company.count(), prisma.internship.count(), prisma.application.count()
  ]);
  res.json({ students, faculty, companies, internships, applications });
}));

app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.flatten() });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => console.log(`InternHub API listening on :${PORT}`));
process.on("SIGINT", async () => { server.close(); await prisma.$disconnect(); process.exit(0); });
