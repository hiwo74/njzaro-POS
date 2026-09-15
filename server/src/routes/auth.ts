import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db.js";
import { signSession, SESSION_COOKIE } from "../lib/auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const { username, password } = parsed.data;

  const user = await db.user.findUnique({ where: { username } });
  if (!user || !user.active) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signSession({ userId: user.id, username: user.username, role: user.role as "ADMIN" | "CASHIER" });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
  });
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
});
