import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, "../../soc-auth-data.json");

const JWT_SECRET = process.env.JWT_SECRET || "soc-map-center-secret-key-2024";

export const ROLE_SCOPES: Record<string, string[]> = {
  admin: [
    "map.view",
    "s1.dashboard", "s1.endpoints.view", "s1.endpoints.manage",
    "s1.alerts.view", "s1.alerts.manage", "s1.iocs.view",
    "lr.dashboard", "lr.alarms.view", "lr.alarms.manage",
    "lr.cases.view", "lr.cases.manage", "lr.logs.view", "lr.logs.search", "lr.admin",
    "threatintel.view", "threatintel.manage",
    "admin.users", "admin.roles", "admin.settings",
  ],
  analyst: [
    "map.view",
    "s1.dashboard", "s1.endpoints.view", "s1.alerts.view", "s1.iocs.view",
    "lr.dashboard", "lr.alarms.view", "lr.cases.view", "lr.logs.view", "lr.logs.search",
    "threatintel.view",
  ],
  "s1-operator": [
    "map.view",
    "s1.dashboard", "s1.endpoints.view", "s1.endpoints.manage",
    "s1.alerts.view", "s1.alerts.manage", "s1.iocs.view",
    "threatintel.view",
  ],
  "lr-operator": [
    "map.view",
    "lr.dashboard", "lr.alarms.view", "lr.alarms.manage",
    "lr.cases.view", "lr.cases.manage", "lr.logs.view", "lr.logs.search",
    "threatintel.view",
  ],
  readonly: [
    "map.view",
    "s1.dashboard", "s1.endpoints.view", "s1.alerts.view",
    "lr.dashboard", "lr.alarms.view", "lr.cases.view",
    "threatintel.view",
  ],
};

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  role: string;
  scopes: string[];
  lastLogin: string | null;
  createdAt: string;
}

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthData {
  users: StoredUser[];
  customRoles: CustomRole[];
  settings: {
    s1BaseUrl?: string;
    s1ApiToken?: string;
    lrBaseUrl?: string;
    lrApiToken?: string;
  };
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resource?: string;
  details?: string;
  ip?: string;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(32).toString("hex");
}

function loadData(): AuthData {
  if (!fs.existsSync(DATA_FILE)) {
    const salt = generateSalt();
    const data: AuthData = {
      users: [
        {
          id: crypto.randomUUID(),
          username: "admin",
          passwordHash: hashPassword("admin", salt),
          passwordSalt: salt,
          role: "admin",
          scopes: ROLE_SCOPES.admin,
          lastLogin: null,
          createdAt: new Date().toISOString(),
        },
      ],
      customRoles: [],
      settings: {},
      auditLog: [],
    };
    saveData(data);
    return data;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as AuthData;
  // Migrate existing files that predate the customRoles field
  if (!data.customRoles) {
    data.customRoles = [];
    saveData(data);
  }
  return data;
}

function saveData(data: AuthData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getAuthData(): AuthData {
  return loadData();
}

export function saveAuthData(data: AuthData): void {
  saveData(data);
}

export function verifyPassword(user: StoredUser, password: string): boolean {
  const hash = hashPassword(password, user.passwordSalt);
  return hash === user.passwordHash;
}

export function createPasswordHash(password: string): { hash: string; salt: string } {
  const salt = generateSalt();
  return { hash: hashPassword(password, salt), salt };
}

export function signToken(payload: { id: string; username: string; role: string; scopes: string[] }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): { id: string; username: string; role: string; scopes: string[] } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string; scopes: string[] };
  } catch {
    return null;
  }
}

export function addAuditEntry(data: AuthData, entry: Omit<AuditEntry, "id" | "timestamp">): void {
  data.auditLog.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (data.auditLog.length > 1000) {
    data.auditLog = data.auditLog.slice(0, 1000);
  }
}
