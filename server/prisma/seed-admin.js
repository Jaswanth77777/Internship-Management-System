import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "InternHub Administrator";
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before running the admin seed.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "ADMIN", isActive: true },
    create: { name, email, passwordHash, role: "ADMIN" }
  });
  console.log(`Admin account ready: ${admin.email}`);
} finally {
  await prisma.$disconnect();
}
