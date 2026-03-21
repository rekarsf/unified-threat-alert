import { Router } from "express";
import crypto from "crypto";
import {
  getAuthData, saveAuthData, createPasswordHash, ROLE_SCOPES, addAuditEntry,
  type CustomRole, type VendorConfig, type VendorCategory
} from "../lib/auth.js";
import { requireAuth, requireScope, type AuthenticatedRequest } from "../middlewares/requireAuth.js";
import { getActiveSessions } from "../lib/sessionStore.js";

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
    createdAt: u.createdAt,
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
    details: `Role: ${role}`,
    ip: req.ip,
  });
  saveAuthData(data);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    scopes: newUser.scopes,
    lastLogin: null,
    createdAt: newUser.createdAt,
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

  const changes: string[] = [];
  if (role && role !== user.role) {
    changes.push(`role: ${user.role} → ${role}`);
    user.role = role;
    user.scopes = scopes ?? ROLE_SCOPES[role] ?? [];
  } else if (scopes) {
    const added = scopes.filter(s => !user.scopes.includes(s));
    const removed = user.scopes.filter(s => !scopes.includes(s));
    if (added.length) changes.push(`+scopes: ${added.join(", ")}`);
    if (removed.length) changes.push(`-scopes: ${removed.join(", ")}`);
    user.scopes = scopes;
  }

  if (password) {
    const { hash, salt } = createPasswordHash(password);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    changes.push("password changed");
  }

  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "update_user",
    resource: user.username,
    details: changes.join("; ") || "no changes",
    ip: req.ip,
  });
  saveAuthData(data);

  res.json({ id: user.id, username: user.username, role: user.role, scopes: user.scopes, lastLogin: user.lastLogin, createdAt: user.createdAt });
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
    details: `Role was: ${removed.role}`,
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
  data.settings = { ...(data.settings as Record<string, unknown> ?? {}), ...body };

  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "update_settings",
    details: `Keys updated: ${Object.keys(body).join(", ")}`,
    ip: req.ip,
  });
  saveAuthData(data);

  res.json({ success: true, message: "Settings saved" });
});

// GET /api/admin/audit
router.get("/audit", requireScope("admin.settings"), (req, res) => {
  const data = getAuthData();
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
  const filterUser = (req.query.user as string) || "";
  const filterAction = (req.query.action as string) || "";
  const since = (req.query.since as string) || "";
  const until = (req.query.until as string) || "";

  let entries = data.auditLog;

  if (filterUser) {
    const u = filterUser.toLowerCase();
    entries = entries.filter(e => e.username.toLowerCase().includes(u));
  }
  if (filterAction) {
    const a = filterAction.toLowerCase();
    entries = entries.filter(e => e.action.toLowerCase().includes(a));
  }
  if (since) {
    const sinceTs = new Date(since).getTime();
    entries = entries.filter(e => new Date(e.timestamp).getTime() >= sinceTs);
  }
  if (until) {
    const untilTs = new Date(until).getTime();
    entries = entries.filter(e => new Date(e.timestamp).getTime() <= untilTs);
  }

  const total = entries.length;
  entries = entries.slice(0, limit);
  res.json({ data: entries, total });
});

// GET /api/admin/sessions
router.get("/sessions", requireScope("admin.users"), (req, res) => {
  const sessions = getActiveSessions();
  res.json({ sessions, total: sessions.length });
});

// GET /api/admin/roles — built-in + custom
router.get("/roles", requireScope("admin.roles"), (req, res) => {
  const data = getAuthData();
  const builtIn = Object.entries(ROLE_SCOPES).map(([name, scopes]) => ({
    id: `builtin:${name}`,
    name,
    description: BUILT_IN_DESCRIPTIONS[name] ?? "",
    scopes,
    builtIn: true,
    createdAt: "",
    updatedAt: "",
  }));
  res.json({ builtIn, custom: data.customRoles });
});

// POST /api/admin/roles — create custom role
router.post("/roles", requireScope("admin.roles"), (req: AuthenticatedRequest, res) => {
  const { name, description, scopes } = req.body as { name?: string; description?: string; scopes?: string[] };
  if (!name || !scopes) {
    res.status(400).json({ error: "bad_request", message: "Name and scopes are required" });
    return;
  }

  const data = getAuthData();
  const nameLower = name.toLowerCase().replace(/\s+/g, "-");
  if (data.customRoles.find(r => r.name.toLowerCase() === name.toLowerCase())) {
    res.status(409).json({ error: "conflict", message: "A role with that name already exists" });
    return;
  }

  const now = new Date().toISOString();
  const role: CustomRole = {
    id: crypto.randomUUID(),
    name: nameLower,
    description: description ?? "",
    scopes,
    createdAt: now,
    updatedAt: now,
  };
  data.customRoles.push(role);
  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "create_role",
    resource: role.name,
    details: `${scopes.length} scopes`,
    ip: req.ip,
  });
  saveAuthData(data);
  res.status(201).json(role);
});

// PUT /api/admin/roles/:roleId — update custom role
router.put("/roles/:roleId", requireScope("admin.roles"), (req: AuthenticatedRequest, res) => {
  const { roleId } = req.params;
  const { name, description, scopes } = req.body as { name?: string; description?: string; scopes?: string[] };

  const data = getAuthData();
  const role = data.customRoles.find(r => r.id === roleId);
  if (!role) {
    res.status(404).json({ error: "not_found", message: "Custom role not found" });
    return;
  }

  const changes: string[] = [];
  if (name && name !== role.name) { changes.push(`name: ${role.name} → ${name}`); role.name = name.toLowerCase().replace(/\s+/g, "-"); }
  if (description !== undefined) role.description = description;
  if (scopes) {
    const added = scopes.filter(s => !role.scopes.includes(s));
    const removed = role.scopes.filter(s => !scopes.includes(s));
    if (added.length) changes.push(`+scopes: ${added.join(", ")}`);
    if (removed.length) changes.push(`-scopes: ${removed.join(", ")}`);
    role.scopes = scopes;
  }
  role.updatedAt = new Date().toISOString();

  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "update_role",
    resource: role.name,
    details: changes.join("; ") || "no changes",
    ip: req.ip,
  });
  saveAuthData(data);
  res.json(role);
});

// DELETE /api/admin/roles/:roleId — delete custom role
router.delete("/roles/:roleId", requireScope("admin.roles"), (req: AuthenticatedRequest, res) => {
  const { roleId } = req.params;
  const data = getAuthData();
  const idx = data.customRoles.findIndex(r => r.id === roleId);
  if (idx === -1) {
    res.status(404).json({ error: "not_found", message: "Custom role not found" });
    return;
  }
  const [removed] = data.customRoles.splice(idx, 1);
  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "delete_role",
    resource: removed.name,
    ip: req.ip,
  });
  saveAuthData(data);
  res.json({ success: true, message: `Role ${removed.name} deleted` });
});

const BUILT_IN_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access to all systems and administration",
  analyst: "Read and investigate across EDR, SIEM, and Threat Intel",
  "s1-operator": "Full EDR operations + Threat Intel",
  "lr-operator": "Full SIEM operations + Threat Intel",
  readonly: "View-only access across EDR and SIEM dashboards",
};

// ─── Vendor CRUD ─────────────────────────────────────────────────────────────

const VALID_CATEGORIES: VendorCategory[] = ['edr', 'xdr', 'siem', 'soar'];

// GET /api/admin/vendors — all users with auth can read (for nav display names)
router.get("/vendors", (req, res) => {
  const data = getAuthData();
  // Mask API keys for GET requests
  const vendors = data.vendors.map(v => ({ ...v, apiKey: v.apiKey ? '••••••••' : '' }));
  res.json({ vendors });
});

// POST /api/admin/vendors — create vendor
router.post("/vendors", requireScope("admin.settings"), (req: AuthenticatedRequest, res) => {
  const { category, displayName, baseUrl, apiKey, apiDocsUrl, description, enabled } =
    req.body as Partial<VendorConfig>;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: "bad_request", message: "Valid category (edr|xdr|siem|soar) required" });
    return;
  }
  if (!displayName?.trim()) {
    res.status(400).json({ error: "bad_request", message: "Display name required" });
    return;
  }

  const data = getAuthData();
  const inCategory = data.vendors.filter(v => v.category === category);
  if (inCategory.length >= 3) {
    res.status(409).json({ error: "limit_reached", message: `Maximum 3 vendors per category (${category})` });
    return;
  }

  const now = new Date().toISOString();
  const vendor: VendorConfig = {
    id: crypto.randomUUID(),
    category,
    displayName: displayName.trim(),
    baseUrl: baseUrl ?? '',
    apiKey: apiKey ?? '',
    apiDocsUrl: apiDocsUrl ?? '',
    description: description ?? '',
    enabled: enabled !== false,
    order: inCategory.length + 1,
    createdAt: now,
    updatedAt: now,
  };

  data.vendors.push(vendor);
  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "create_vendor",
    resource: vendor.displayName,
    details: `category: ${category}`,
    ip: req.ip,
  });
  saveAuthData(data);
  res.status(201).json({ ...vendor, apiKey: vendor.apiKey ? '••••••••' : '' });
});

// PUT /api/admin/vendors/:vendorId — update vendor
router.put("/vendors/:vendorId", requireScope("admin.settings"), (req: AuthenticatedRequest, res) => {
  const { vendorId } = req.params;
  const { displayName, baseUrl, apiKey, apiDocsUrl, description, enabled } =
    req.body as Partial<VendorConfig>;

  const data = getAuthData();
  const vendor = data.vendors.find(v => v.id === vendorId);
  if (!vendor) {
    res.status(404).json({ error: "not_found", message: "Vendor not found" });
    return;
  }

  if (displayName !== undefined) vendor.displayName = displayName.trim();
  if (baseUrl !== undefined) vendor.baseUrl = baseUrl;
  if (apiKey !== undefined && apiKey !== '••••••••') vendor.apiKey = apiKey;
  if (apiDocsUrl !== undefined) vendor.apiDocsUrl = apiDocsUrl;
  if (description !== undefined) vendor.description = description;
  if (enabled !== undefined) vendor.enabled = enabled;
  vendor.updatedAt = new Date().toISOString();

  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "update_vendor",
    resource: vendor.displayName,
    details: `category: ${vendor.category}`,
    ip: req.ip,
  });
  saveAuthData(data);
  res.json({ ...vendor, apiKey: vendor.apiKey ? '••••••••' : '' });
});

// DELETE /api/admin/vendors/:vendorId
router.delete("/vendors/:vendorId", requireScope("admin.settings"), (req: AuthenticatedRequest, res) => {
  const { vendorId } = req.params;
  const data = getAuthData();
  const idx = data.vendors.findIndex(v => v.id === vendorId);
  if (idx === -1) {
    res.status(404).json({ error: "not_found", message: "Vendor not found" });
    return;
  }
  const [removed] = data.vendors.splice(idx, 1);
  addAuditEntry(data, {
    userId: req.auth!.id,
    username: req.auth!.username,
    action: "delete_vendor",
    resource: removed.displayName,
    ip: req.ip,
  });
  saveAuthData(data);
  res.json({ success: true });
});

export default router;
