import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

usersRouter.get("/", async (_req, res) => {
  const users = await db.user.findMany({
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

const createSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "CASHIER"]).default("CASHIER"),
});

usersRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { username, password, name, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({ data: { username, passwordHash, name, role } });
  res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role, active: user.active });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "CASHIER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

usersRouter.put("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }
  try {
    const user = await db.user.update({ where: { id: req.params.id }, data });
    res.json({ id: user.id, username: user.username, name: user.name, role: user.role, active: user.active });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

usersRouter.delete("/:id", async (req, res) => {
  try {
    await db.user.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});
