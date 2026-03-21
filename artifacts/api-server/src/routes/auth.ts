import { Router } from "express";
import crypto from "crypto";
import {
  getAuthData, saveAuthData, verifyPassword, createPasswordHash,
  signToken, addAuditEntry
} from "../lib/auth.js";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth.js";

const router = Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "bad_request", message: "Username and password required" });
    return;
  }

  const data = getAuthData();
  const user = data.users.find((u) => u.username === username);

  if (!user || !verifyPassword(user, password)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid username or password" });
    return;
  }

  user.lastLogin = new Date().toISOString();
  addAuditEntry(data, {
    userId: user.id,
    username: user.username,
    action: "login",
    ip: req.ip,
  });
  saveAuthData(data);

  const token = signToken({ id: user.id, username: user.username, role: user.role, scopes: user.scopes });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      scopes: user.scopes,
      lastLogin: user.lastLogin,
    },
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  const data = getAuthData();
  const user = data.users.find((u) => u.id === req.auth!.id);

  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    scopes: user.scopes,
    lastLogin: user.lastLogin,
  });
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "bad_request", message: "Current and new password required" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "bad_request", message: "New password must be at least 6 characters" });
    return;
  }

  const data = getAuthData();
  const user = data.users.find((u) => u.id === req.auth!.id);

  if (!user || !verifyPassword(user, currentPassword)) {
    res.status(401).json({ error: "unauthorized", message: "Current password is incorrect" });
    return;
  }

  const { hash, salt } = createPasswordHash(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;

  addAuditEntry(data, {
    userId: user.id,
    username: user.username,
    action: "change_password",
    ip: req.ip,
  });

  saveAuthData(data);
  res.json({ success: true, message: "Password changed successfully" });
});

export default router;
