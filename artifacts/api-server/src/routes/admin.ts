import { Router } from "express";
import crypto from "crypto";
import {
  getAuthData, saveAuthData, createPasswordHash, ROLE_SCOPES, addAuditEntry
} from "../lib/auth.js";
import { requireAuth, requireScope, type AuthenticatedRequest } from "../middlewares/requireAuth.js";

const router = Router();

router.use(requireAuth);

// GET /api/admin/users
router.get("/users", requireScope("admin.users"), (req: AuthenticatedRequest, res) => {
  const data = getAuthData();
  const users = data.users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    scopes: u.scopes,
    lastLogin: u.lastLogin,
  }));
  res.json({ users });
});

// POST /api/admin/users
router.post("/users", requireScope("admin.users"), (req: AuthenticatedRequest, res) => {
  const { username, password, role, scopes } = req.body as {
    username?: string; password?: string; role?: string; scopes?: string[];
  };

  if (!username || !password || !role) {
    res.status(400).json({ error: "bad_request", message: "Username, password and role required" });
    return;
  }

  const data = getAuthData();
  if (data.users.find((u) => u.username === username)) {
    res.status(409).json({ error: "conflict", message: "Username already exists" });
    return;
  }

  const { hash, salt } = createPasswordHash(password);
  const newUser = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hash,
    passwordSalt: salt,
    role,
    scopes: scopes ?? ROLE_SCOPES[role] ?? [],
    lastLogin: null,
    createdAt: new Date().toISOString(),
  };

  data.users.push(newUser);
  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "create_user",
    resource: username,
    ip: req.ip,
  });
  saveAuthData(data);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    scopes: newUser.scopes,
    lastLogin: null,
  });
});

// PUT /api/admin/users/:userId
router.put("/users/:userId", requireScope("admin.users"), (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { role, scopes, password } = req.body as { role?: string; scopes?: string[]; password?: string };

  const data = getAuthData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  if (role) {
    user.role = role;
    user.scopes = scopes ?? ROLE_SCOPES[role] ?? [];
  } else if (scopes) {
    user.scopes = scopes;
  }

  if (password) {
    const { hash, salt } = createPasswordHash(password);
    user.passwordHash = hash;
    user.passwordSalt = salt;
  }

  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "update_user",
    resource: user.username,
    ip: req.ip,
  });
  saveAuthData(data);

  res.json({ id: user.id, username: user.username, role: user.role, scopes: user.scopes, lastLogin: user.lastLogin });
});

// DELETE /api/admin/users/:userId
router.delete("/users/:userId", requireScope("admin.users"), (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  if (userId === req.auth!.id) {
    res.status(400).json({ error: "bad_request", message: "Cannot delete your own account" });
    return;
  }

  const data = getAuthData();
  const idx = data.users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const [removed] = data.users.splice(idx, 1);
  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "delete_user",
    resource: removed.username,
    ip: req.ip,
  });
  saveAuthData(data);

  res.json({ success: true, message: `User ${removed.username} deleted` });
});

// GET /api/admin/settings
router.get("/settings", requireScope("admin.settings"), (req, res) => {
  const data = getAuthData();
  res.json(data.settings);
});

// POST /api/admin/settings
router.post("/settings", requireScope("admin.settings"), (req: AuthenticatedRequest, res) => {
  const body = req.body as Record<string, unknown>;

  const data = getAuthData();
  // Merge all provided fields into settings; preserve existing keys not sent in this request
  data.settings = { ...(data.settings as Record<string, unknown> ?? {}), ...body };

  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "update_settings",
    ip: req.ip,
  });
  saveAuthData(data);

  res.json({ success: true, message: "Settings saved" });
});

// GET /api/admin/audit
router.get("/audit", requireScope("admin.settings"), (req, res) => {
  const data = getAuthData();
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const entries = data.auditLog.slice(0, limit);
  res.json({ data: entries, total: data.auditLog.length });
});

export default router;
