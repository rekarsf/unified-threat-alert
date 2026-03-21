import React, { useState, useMemo } from 'react';
import {
  useAdminGetUsers, useAdminGetSettings, useAdminGetAuditLog,
  useAdminSaveSettings, useAdminCreateUser, useAdminUpdateUser, useAdminDeleteUser
} from '@workspace/api-client-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Settings, FileText, Shield, Plus, Trash2, Edit, Save,
  Monitor, Globe, Eye, EyeOff, CheckSquare, Square, RefreshCw,
  Wifi, Clock, Filter, Search, X, ChevronDown, UserPlus, Key,
  Lock, Unlock, Tag, Copy
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// ─── Scope Definitions ────────────────────────────────────────────────────────

const SCOPE_GROUPS = [
  {
    id: 'map',
    label: 'World Map',
    icon: '🗺',
    color: 'text-cyan-400',
    scopes: [
      { key: 'map.view', label: 'View World Map & Threat Arcs' },
    ],
  },
  {
    id: 's1',
    label: 'SentinelOne EDR',
    icon: '🛡',
    color: 'text-primary',
    scopes: [
      { key: 's1.dashboard', label: 'S1 Dashboard' },
      { key: 's1.endpoints.view', label: 'View Endpoints' },
      { key: 's1.endpoints.manage', label: 'Manage Endpoints' },
      { key: 's1.alerts.view', label: 'View Alerts' },
      { key: 's1.alerts.manage', label: 'Manage Alerts' },
      { key: 's1.iocs.view', label: 'View IOCs' },
    ],
  },
  {
    id: 'lr',
    label: 'LogRhythm SIEM',
    icon: '📊',
    color: 'text-violet-400',
    scopes: [
      { key: 'lr.dashboard', label: 'LR Dashboard' },
      { key: 'lr.alarms.view', label: 'View Alarms' },
      { key: 'lr.alarms.manage', label: 'Manage Alarms' },
      { key: 'lr.cases.view', label: 'View Cases' },
      { key: 'lr.cases.manage', label: 'Manage Cases' },
      { key: 'lr.logs.view', label: 'View Log Entries' },
      { key: 'lr.logs.search', label: 'Search Logs' },
      { key: 'lr.admin', label: 'LR Administration' },
    ],
  },
  {
    id: 'threatintel',
    label: 'Threat Intelligence',
    icon: '🔍',
    color: 'text-amber-400',
    scopes: [
      { key: 'threatintel.view', label: 'View Threat Intel' },
      { key: 'threatintel.manage', label: 'Manage Threat Intel' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: '⚙',
    color: 'text-red-400',
    scopes: [
      { key: 'admin.users', label: 'User Management' },
      { key: 'admin.roles', label: 'Role Management' },
      { key: 'admin.settings', label: 'System Settings' },
    ],
  },
];

const ROLE_TEMPLATES: Record<string, string[]> = {
  admin: [
    'map.view',
    's1.dashboard', 's1.endpoints.view', 's1.endpoints.manage',
    's1.alerts.view', 's1.alerts.manage', 's1.iocs.view',
    'lr.dashboard', 'lr.alarms.view', 'lr.alarms.manage',
    'lr.cases.view', 'lr.cases.manage', 'lr.logs.view', 'lr.logs.search', 'lr.admin',
    'threatintel.view', 'threatintel.manage',
    'admin.users', 'admin.roles', 'admin.settings',
  ],
  analyst: [
    'map.view',
    's1.dashboard', 's1.endpoints.view', 's1.alerts.view', 's1.iocs.view',
    'lr.dashboard', 'lr.alarms.view', 'lr.cases.view', 'lr.logs.view', 'lr.logs.search',
    'threatintel.view',
  ],
  's1-operator': [
    'map.view',
    's1.dashboard', 's1.endpoints.view', 's1.endpoints.manage',
    's1.alerts.view', 's1.alerts.manage', 's1.iocs.view',
    'threatintel.view',
  ],
  'lr-operator': [
    'map.view',
    'lr.dashboard', 'lr.alarms.view', 'lr.alarms.manage',
    'lr.cases.view', 'lr.cases.manage', 'lr.logs.view', 'lr.logs.search',
    'threatintel.view',
  ],
  readonly: [
    'map.view',
    's1.dashboard', 's1.endpoints.view', 's1.alerts.view',
    'lr.dashboard', 'lr.alarms.view', 'lr.cases.view',
    'threatintel.view',
  ],
};

const AUDIT_ACTIONS = [
  'all', 'login', 'logout', 'create_user', 'update_user', 'delete_user',
  'update_settings', 'failed_login',
];

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
    analyst: 'bg-primary/10 text-primary border-primary/20',
    's1-operator': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'lr-operator': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    readonly: 'bg-secondary/30 text-muted-foreground border-border',
  };
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${colors[role] ?? 'bg-secondary/30 text-muted-foreground border-border'}`}>
      {role}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'rbac' | 'roles' | 'sessions' | 'audit' | 'settings'>('users');
  const { hasScope } = useAuthStore();

  const tabs = [
    { id: 'users',    label: 'Users',           icon: <Users className="w-4 h-4" />,    scope: 'admin.users' },
    { id: 'rbac',     label: 'RBAC',            icon: <Key className="w-4 h-4" />,      scope: 'admin.users' },
    { id: 'roles',    label: 'Roles',           icon: <Tag className="w-4 h-4" />,      scope: 'admin.roles' },
    { id: 'sessions', label: 'Active Sessions', icon: <Wifi className="w-4 h-4" />,    scope: 'admin.users' },
    { id: 'audit',    label: 'Audit Log',       icon: <FileText className="w-4 h-4" />, scope: 'admin.settings' },
    { id: 'settings', label: 'API Settings',    icon: <Settings className="w-4 h-4" />, scope: 'admin.settings' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase">Admin Panel</h1>
      </div>

      <div className="border-b border-border bg-card/30 flex gap-0 overflow-x-auto">
        {tabs.filter(t => hasScope(t.scope)).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 font-mono text-sm border-b-2 whitespace-nowrap transition-all ${
              tab === t.id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'users'    && <UsersTab />}
        {tab === 'rbac'     && <RbacTab />}
        {tab === 'roles'    && <RolesTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'audit'    && <AuditTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminGetUsers();
  const users = data?.users || [];
  const deleteUser = useAdminDeleteUser();
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'analyst' });
  const createUser = useAdminCreateUser();

  const handleAdd = () => {
    if (!newUser.username || !newUser.password) return;
    createUser.mutate(
      { data: { username: newUser.username, password: newUser.password, role: newUser.role } } as any,
      {
        onSuccess: () => {
          toast({ title: 'User created', description: `${newUser.username} added as ${newUser.role}` });
          setShowAdd(false);
          setNewUser({ username: '', password: '', role: 'analyst' });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        },
        onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
      }
    );
  };

  const handleDelete = (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    deleteUser.mutate({ userId: id } as any, {
      onSuccess: () => {
        toast({ title: 'User deleted', description: `${username} removed` });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      },
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-widest">User Management</h2>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 text-xs font-mono text-primary border border-primary/30 bg-primary/10 px-3 py-2 rounded-md hover:bg-primary/20 transition-colors"
        >
          <UserPlus className="w-3 h-3" /> Add User
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 border border-primary/30 bg-primary/5 rounded-lg p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Username</label>
            <input
              value={newUser.username}
              onChange={e => setNewUser(n => ({ ...n, username: e.target.value }))}
              placeholder="analyst01"
              className="bg-background border border-border rounded h-8 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 w-40"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Password</label>
            <input
              type="password"
              value={newUser.password}
              onChange={e => setNewUser(n => ({ ...n, password: e.target.value }))}
              placeholder="••••••••"
              className="bg-background border border-border rounded h-8 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 w-36"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Role</label>
            <select
              value={newUser.role}
              onChange={e => setNewUser(n => ({ ...n, role: e.target.value }))}
              className="bg-background border border-border rounded h-8 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
            >
              {Object.keys(ROLE_TEMPLATES).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={createUser.isPending || !newUser.username || !newUser.password}
            className="flex items-center gap-2 text-xs font-mono text-primary border border-primary/30 bg-primary/10 px-3 h-8 rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3 h-3" /> {createUser.isPending ? 'Creating…' : 'Create'}
          </button>
          <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>{['Username', 'Role', 'Scopes', 'Created', 'Last Login', 'Actions'].map(h =>
              <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {isLoading
              ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading…</td></tr>
              : users.map((user, i) => (
                <tr key={user.id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                  <td className="px-4 py-3 font-mono text-sm font-bold text-foreground">{user.username}</td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{user.scopes.length} scopes</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {(user as any).createdAt ? format(new Date((user as any).createdAt), 'yyyy-MM-dd') : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── RBAC Tab ─────────────────────────────────────────────────────────────────

function RbacTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminGetUsers();
  const users = data?.users || [];
  const updateUser = useAdminUpdateUser();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const selectedUser = users.find(u => u.id === selectedId);

  const selectUser = (user: any) => {
    setSelectedId(user.id);
    setEditScopes([...user.scopes]);
    setDirty(false);
  };

  const toggleScope = (scope: string) => {
    setEditScopes(prev => {
      const next = prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope];
      return next;
    });
    setDirty(true);
  };

  const applyTemplate = (role: string) => {
    setEditScopes([...(ROLE_TEMPLATES[role] ?? [])]);
    setDirty(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    updateUser.mutate(
      { userId: selectedUser.id, data: { scopes: editScopes } as any },
      {
        onSuccess: () => {
          toast({ title: 'Scopes updated', description: `${selectedUser.username} now has ${editScopes.length} scopes` });
          setDirty(false);
          queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        },
        onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
      }
    );
  };

  if (isLoading) return <div className="p-6 text-muted-foreground font-mono text-sm">Loading…</div>;

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* User list */}
      <div className="w-56 border-r border-border flex-shrink-0 overflow-y-auto custom-scrollbar">
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Select User</p>
        </div>
        {users.map(user => (
          <button
            key={user.id}
            onClick={() => selectUser(user)}
            className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
              selectedId === user.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/20'
            }`}
          >
            <p className="font-mono text-sm font-bold text-foreground">{user.username}</p>
            <div className="mt-0.5"><RoleBadge role={user.role} /></div>
          </button>
        ))}
      </div>

      {/* Scope editor */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-mono text-sm gap-2">
            <Key className="w-8 h-8 opacity-30" />
            <span>Select a user to manage their scopes</span>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-mono text-base font-bold text-foreground">{selectedUser.username}</h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{editScopes.length} of {SCOPE_GROUPS.flatMap(g => g.scopes).length} scopes granted</p>
              </div>
              {dirty && (
                <button
                  onClick={handleSave}
                  disabled={updateUser.isPending}
                  className="flex items-center gap-2 text-xs font-mono text-primary border border-primary/40 bg-primary/10 px-4 py-2 rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  {updateUser.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>

            {/* Role templates */}
            <div className="p-4 border border-border rounded-lg">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Apply Role Template</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ROLE_TEMPLATES).map(role => (
                  <button
                    key={role}
                    onClick={() => applyTemplate(role)}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope groups */}
            {SCOPE_GROUPS.map(group => {
              const grantedCount = group.scopes.filter(s => editScopes.includes(s.key)).length;
              const allGranted = grantedCount === group.scopes.length;

              return (
                <div key={group.id} className="border border-border rounded-lg overflow-hidden">
                  <div className={`flex items-center justify-between px-4 py-3 bg-card/50 border-b border-border`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{group.icon}</span>
                      <span className={`font-mono text-sm font-bold ${group.color}`}>{group.label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{grantedCount}/{group.scopes.length}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (allGranted) {
                          setEditScopes(p => p.filter(s => !group.scopes.map(g => g.key).includes(s)));
                        } else {
                          setEditScopes(p => [...new Set([...p, ...group.scopes.map(g => g.key)])]);
                        }
                        setDirty(true);
                      }}
                      className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
                    >
                      {allGranted ? 'Revoke all' : 'Grant all'}
                    </button>
                  </div>
                  <div className="divide-y divide-border/50">
                    {group.scopes.map(scope => {
                      const granted = editScopes.includes(scope.key);
                      return (
                        <button
                          key={scope.key}
                          onClick={() => toggleScope(scope.key)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-secondary/10 ${granted ? 'bg-primary/5' : ''}`}
                        >
                          <div>
                            <span className="font-mono text-sm text-foreground">{scope.label}</span>
                            <span className="ml-2 font-mono text-[10px] text-muted-foreground">{scope.key}</span>
                          </div>
                          {granted
                            ? <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                            : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          }
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {dirty && (
              <button
                onClick={handleSave}
                disabled={updateUser.isPending}
                className="w-full flex items-center justify-center gap-2 text-sm font-mono text-primary border border-primary/40 bg-primary/10 py-3 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateUser.isPending ? 'Saving…' : 'Save Scope Changes'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

interface AnyRole {
  id: string;
  name: string;
  description: string;
  scopes: string[];
  builtIn: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const BUILT_IN_ORDER = ['admin', 'analyst', 's1-operator', 'lr-operator', 'readonly'];

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-400 bg-red-500/10 border-red-500/20',
  analyst: 'text-primary bg-primary/10 border-primary/20',
  's1-operator': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'lr-operator': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  readonly: 'text-muted-foreground bg-secondary/20 border-border',
};

function apiCall(path: string, method: string, body?: unknown) {
  const token = localStorage.getItem('soc_token');
  return fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
    return data;
  });
}

function RolesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/roles'],
    queryFn: () => apiCall('/api/admin/roles', 'GET'),
  });

  const builtIn: AnyRole[] = (data?.builtIn || []).map((r: any) => ({ ...r, builtIn: true }));
  const custom: AnyRole[] = (data?.custom || []).map((r: any) => ({ ...r, builtIn: false }));
  const total = builtIn.length + custom.length;

  const [selected, setSelected] = useState<AnyRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', scopes: [] as string[] });
  const [dirty, setDirty] = useState(false);

  const createMut = useMutation({
    mutationFn: (body: { name: string; description: string; scopes: string[] }) =>
      apiCall('/api/admin/roles', 'POST', body),
    onSuccess: (role) => {
      toast({ title: 'Role created', description: `"${role.name}" is now available` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      setCreating(false);
      setSelected({ ...role, builtIn: false });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<{ name: string; description: string; scopes: string[] }> }) =>
      apiCall(`/api/admin/roles/${id}`, 'PUT', body),
    onSuccess: (role) => {
      toast({ title: 'Role saved', description: `"${role.name}" updated` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      setSelected({ ...role, builtIn: false });
      setDirty(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiCall(`/api/admin/roles/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: 'Role deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      setSelected(null);
      setCreating(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const startCreate = (templateScopes: string[] = []) => {
    setCreating(true);
    setSelected(null);
    setForm({ name: '', description: '', scopes: [...templateScopes] });
    setDirty(false);
  };

  const selectRole = (role: AnyRole) => {
    setCreating(false);
    setSelected(role);
    setForm({ name: role.name, description: role.description, scopes: [...role.scopes] });
    setDirty(false);
  };

  const toggleScope = (scope: string) => {
    setForm(f => {
      const next = f.scopes.includes(scope) ? f.scopes.filter(s => s !== scope) : [...f.scopes, scope];
      return { ...f, scopes: next };
    });
    setDirty(true);
  };

  const toggleGroupAll = (group: typeof SCOPE_GROUPS[0], grantAll: boolean) => {
    setForm(f => {
      const keys = group.scopes.map(s => s.key);
      const next = grantAll
        ? [...new Set([...f.scopes, ...keys])]
        : f.scopes.filter(s => !keys.includes(s));
      return { ...f, scopes: next };
    });
    setDirty(true);
  };

  const handleSave = () => {
    if (creating) {
      if (!form.name.trim()) return toast({ title: 'Role name is required', variant: 'destructive' });
      createMut.mutate({ name: form.name.trim(), description: form.description, scopes: form.scopes });
    } else if (selected && !selected.builtIn) {
      updateMut.mutate({ id: selected.id, body: { description: form.description, scopes: form.scopes } });
    }
  };

  const isMutating = createMut.isPending || updateMut.isPending;
  const isEditing = creating || (selected && !selected.builtIn);

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* ── Left: role list ───────────────────────────────── */}
      <div className="w-64 border-r border-border flex-shrink-0 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Roles ({total})
          </p>
          <button
            onClick={() => creating ? (setCreating(false), setSelected(null)) : startCreate()}
            className={`flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded border transition-colors ${
              creating
                ? 'border-border text-muted-foreground hover:text-foreground'
                : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            {creating ? <><X className="w-3 h-3" /> Cancel</> : <><Plus className="w-3 h-3" /> New Role</>}
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          {/* Built-in section */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Built-in
            </p>
          </div>
          {isLoading
            ? <p className="px-3 py-2 text-xs text-muted-foreground font-mono">Loading…</p>
            : builtIn.map(role => (
              <button
                key={role.id}
                onClick={() => selectRole(role)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors ${
                  selected?.id === role.id && !creating ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className={`font-mono text-xs font-bold ${ROLE_COLORS[role.name]?.split(' ')[0] ?? 'text-foreground'}`}>{role.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5 pl-5 truncate">{role.description}</p>
              </button>
            ))
          }

          {/* Custom section */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <Unlock className="w-2.5 h-2.5" /> Custom {custom.length > 0 && `(${custom.length})`}
            </p>
          </div>
          {custom.length === 0 && !isLoading && (
            <p className="px-3 py-2 text-[10px] text-muted-foreground font-mono italic">No custom roles yet</p>
          )}
          {custom.map(role => (
            <button
              key={role.id}
              onClick={() => selectRole(role)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors ${
                selected?.id === role.id && !creating ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-primary truncate">{role.name}</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Delete role "${role.name}"?`)) deleteMut.mutate(role.id); }}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1 flex-shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 pl-5 truncate">{role.description || 'No description'}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: editor / viewer ────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!creating && !selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Tag className="w-10 h-10 opacity-20" />
            <p className="font-mono text-sm">Select a role to view or</p>
            <button
              onClick={() => startCreate()}
              className="flex items-center gap-2 text-xs font-mono text-primary border border-primary/30 bg-primary/10 px-4 py-2 rounded-md hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3 h-3" /> Create a new role
            </button>
          </div>
        ) : (
          <div className="p-6 max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {creating ? (
                  <h2 className="font-mono text-base font-bold text-foreground">New Custom Role</h2>
                ) : (
                  <div className="flex items-center gap-2">
                    {selected!.builtIn
                      ? <Lock className="w-4 h-4 text-muted-foreground" />
                      : <Tag className="w-4 h-4 text-primary" />
                    }
                    <h2 className="font-mono text-base font-bold text-foreground">{selected!.name}</h2>
                    {selected!.builtIn && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/40 text-muted-foreground border border-border">BUILT-IN</span>
                    )}
                  </div>
                )}
              </div>
              {/* Fork button for built-in roles */}
              {selected?.builtIn && (
                <button
                  onClick={() => startCreate(selected.scopes)}
                  className="flex items-center gap-1.5 text-[10px] font-mono text-primary border border-primary/30 bg-primary/10 px-3 py-1.5 rounded hover:bg-primary/20 transition-colors whitespace-nowrap"
                >
                  <Copy className="w-3 h-3" /> Fork as Custom
                </button>
              )}
            </div>

            {/* Name field (create mode or custom role) */}
            {(creating || (selected && !selected.builtIn)) && (
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-1.5">Role Name</label>
                <input
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (!creating) setDirty(true); }}
                  placeholder="e.g. tier-2-analyst"
                  disabled={!creating}
                  className="w-full bg-background border border-border rounded-md h-9 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-60"
                />
                {creating && <p className="text-[10px] font-mono text-muted-foreground mt-1">Spaces converted to hyphens, lowercase.</p>}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-1.5">Description</label>
              {selected?.builtIn ? (
                <p className="font-mono text-sm text-foreground">{selected.description}</p>
              ) : (
                <textarea
                  value={form.description}
                  onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setDirty(true); }}
                  placeholder="Describe this role's responsibilities…"
                  rows={2}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
              )}
            </div>

            {/* Permissions header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Permissions
                  <span className="ml-2 text-primary">{(creating || !selected?.builtIn ? form.scopes : selected!.scopes).length} granted</span>
                </label>
                {isEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setForm(f => ({ ...f, scopes: SCOPE_GROUPS.flatMap(g => g.scopes.map(s => s.key)) })); setDirty(true); }}
                      className="text-[10px] font-mono px-2.5 py-1 rounded border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                    >All</button>
                    <button
                      onClick={() => { setForm(f => ({ ...f, scopes: [] })); setDirty(true); }}
                      className="text-[10px] font-mono px-2.5 py-1 rounded border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                    >None</button>
                  </div>
                )}
              </div>

              {/* Scope groups */}
              <div className="space-y-4">
                {SCOPE_GROUPS.map(group => {
                  const activeScopes = creating || !selected?.builtIn ? form.scopes : selected!.scopes;
                  const grantedCount = group.scopes.filter(s => activeScopes.includes(s.key)).length;
                  const allGranted = grantedCount === group.scopes.length;

                  return (
                    <div key={group.id} className="border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-card/50 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{group.icon}</span>
                          <span className={`font-mono text-xs font-bold uppercase tracking-wide ${group.color}`}>{group.label}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{grantedCount}/{group.scopes.length}</span>
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => toggleGroupAll(group, !allGranted)}
                            className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
                          >
                            {allGranted ? 'Revoke all' : 'Grant all'}
                          </button>
                        )}
                      </div>

                      {/* Two-column grid of checkboxes */}
                      <div className="grid grid-cols-2 divide-x divide-border/30">
                        {group.scopes.map((scope, idx) => {
                          const granted = activeScopes.includes(scope.key);
                          return (
                            <button
                              key={scope.key}
                              onClick={() => isEditing && toggleScope(scope.key)}
                              disabled={!isEditing}
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors border-b border-border/30 ${
                                isEditing ? 'hover:bg-secondary/10 cursor-pointer' : 'cursor-default'
                              } ${granted ? 'bg-primary/5' : ''}`}
                            >
                              {granted
                                ? <CheckSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                : <Square className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              }
                              <span className={`font-mono text-xs ${granted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {scope.label}
                              </span>
                            </button>
                          );
                        })}
                        {/* Pad to even columns */}
                        {group.scopes.length % 2 !== 0 && <div className="border-b border-border/30" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer action */}
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isMutating || (creating && !form.name.trim())}
                className="w-full flex items-center justify-center gap-2 text-sm font-mono text-primary border border-primary/40 bg-primary/10 py-3 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isMutating ? 'Saving…' : creating ? 'Create Role' : 'Save Changes'}
              </button>
            )}

            {/* Metadata for custom roles */}
            {selected && !selected.builtIn && selected.createdAt && (
              <div className="text-[10px] font-mono text-muted-foreground/60 space-y-0.5 pt-2 border-t border-border/30">
                <p>Created: {format(new Date(selected.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                {selected.updatedAt && selected.updatedAt !== selected.createdAt && (
                  <p>Updated: {format(new Date(selected.updatedAt), 'yyyy-MM-dd HH:mm')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/sessions'],
    queryFn: async () => {
      const token = localStorage.getItem('soc_token');
      const res = await fetch('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load sessions');
      return res.json() as Promise<{ sessions: any[]; total: number }>;
    },
    refetchInterval: 15_000,
  });

  const sessions = data?.sessions || [];

  const parseUA = (ua: string) => {
    if (!ua || ua === 'unknown') return { browser: 'Unknown', os: 'Unknown' };
    const browser =
      /Edg\//.test(ua) ? 'Edge' :
      /Chrome\//.test(ua) ? 'Chrome' :
      /Firefox\//.test(ua) ? 'Firefox' :
      /Safari\//.test(ua) ? 'Safari' :
      /curl/.test(ua) ? 'curl' : 'Other';
    const os =
      /Windows/.test(ua) ? 'Windows' :
      /Mac OS/.test(ua) ? 'macOS' :
      /Linux/.test(ua) ? 'Linux' :
      /Android/.test(ua) ? 'Android' :
      /iOS/.test(ua) ? 'iOS' : 'Unknown';
    return { browser, os };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-widest">Active Sessions</h2>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Users active within the last 30 minutes · auto-refreshes every 15 s</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 text-xs font-mono text-primary border border-primary/30 bg-primary/10 px-3 py-2 rounded hover:bg-primary/20 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Sessions', value: sessions.length, icon: <Wifi className="w-4 h-4" /> },
          { label: 'Unique Users', value: new Set(sessions.map((s: any) => s.userId)).size, icon: <Users className="w-4 h-4" /> },
          { label: 'Roles Online', value: new Set(sessions.map((s: any) => s.role)).size, icon: <Shield className="w-4 h-4" /> },
        ].map(stat => (
          <div key={stat.label} className="border border-border rounded-lg p-4 bg-card/30 flex items-center gap-3">
            <div className="text-primary">{stat.icon}</div>
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>{['User', 'Role', 'IP Address', 'Browser / OS', 'Login Time', 'Last Seen'].map(h =>
              <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {isLoading
              ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading…</td></tr>
              : sessions.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Wifi className="w-8 h-8 opacity-30" />
                        <span className="font-mono text-sm">No active sessions</span>
                      </div>
                    </td>
                  </tr>
                )
                : sessions.map((s: any, i: number) => {
                  const { browser, os } = parseUA(s.userAgent);
                  const lastSeenAgo = formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true });
                  const isRecent = Date.now() - new Date(s.lastSeen).getTime() < 60_000;
                  return (
                    <tr key={s.userId} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-foreground flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isRecent ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        {s.username}
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={s.role} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.ip}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{browser} / {os}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                        {format(new Date(s.loginTime), 'HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{lastSeenAgo}</td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────

function AuditTab() {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const params: Record<string, string> = { limit: '500' };
  if (filterUser) params.user = filterUser;
  if (filterAction !== 'all') params.action = filterAction;
  if (since) params.since = new Date(since).toISOString();
  if (until) params.until = new Date(until + 'T23:59:59').toISOString();

  const { data, isLoading, refetch } = useAdminGetAuditLog(params as any);

  const entries = useMemo(() => {
    let list = data?.data || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e: any) =>
        e.username?.toLowerCase().includes(q) ||
        e.action?.toLowerCase().includes(q) ||
        e.resource?.toLowerCase().includes(q) ||
        e.details?.toLowerCase().includes(q) ||
        e.ip?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search]);

  const clearFilters = () => {
    setSearch(''); setFilterAction('all');
    setFilterUser(''); setSince(''); setUntil('');
  };

  const hasFilters = search || filterAction !== 'all' || filterUser || since || until;

  const actionColor = (action: string) => {
    if (action.includes('delete')) return 'text-red-400';
    if (action.includes('create')) return 'text-green-400';
    if (action.includes('update')) return 'text-yellow-400';
    if (action.includes('login')) return 'text-primary';
    if (action.includes('failed')) return 'text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-widest">Audit Log</h2>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}{data?.total && data.total > entries.length ? ` (filtered from ${data.total})` : ''}
          </p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 text-xs font-mono text-primary border border-primary/30 bg-primary/10 px-3 py-2 rounded hover:bg-primary/20 transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search all fields…"
            className="pl-8 pr-3 h-8 bg-background border border-border rounded text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 w-52"
          />
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="h-8 bg-background border border-border rounded px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
        >
          {AUDIT_ACTIONS.map(a => <option key={a} value={a}>{a === 'all' ? 'All actions' : a}</option>)}
        </select>
        <div className="relative">
          <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            placeholder="Filter by user…"
            className="pl-8 pr-3 h-8 bg-background border border-border rounded text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 w-36"
          />
        </div>
        <input
          type="date"
          value={since}
          onChange={e => setSince(e.target.value)}
          className="h-8 bg-background border border-border rounded px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
          title="Since date"
        />
        <span className="text-muted-foreground font-mono text-xs">–</span>
        <input
          type="date"
          value={until}
          onChange={e => setUntil(e.target.value)}
          className="h-8 bg-background border border-border rounded px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
          title="Until date"
        />
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 h-8 px-3 text-xs font-mono text-muted-foreground border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>{['Timestamp', 'User', 'Action', 'Resource', 'Details', 'IP'].map(h =>
              <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {isLoading
              ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading…</td></tr>
              : entries.length === 0
                ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">No entries match the current filters</td></tr>
                : entries.map((entry: any, i: number) => (
                  <tr key={entry.id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                    <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-primary font-bold">{entry.username}</td>
                    <td className={`px-4 py-2 font-mono text-xs font-bold ${actionColor(entry.action)}`}>{entry.action}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{entry.resource || '—'}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground max-w-xs truncate" title={entry.details}>{entry.details || '—'}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">{entry.ip || '—'}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── API Settings Tab ─────────────────────────────────────────────────────────

function SettingsTab() {
  const { data, isLoading } = useAdminGetSettings();
  const saveSettings = useAdminSaveSettings();
  const { toast } = useToast();
  const [form, setForm] = useState({ s1BaseUrl: '', s1ApiToken: '', lrBaseUrl: '', lrApiToken: '' });

  React.useEffect(() => {
    if (data) {
      setForm({
        s1BaseUrl: (data as any).s1BaseUrl || '',
        s1ApiToken: (data as any).s1ApiToken || '',
        lrBaseUrl: (data as any).lrBaseUrl || '',
        lrApiToken: (data as any).lrApiToken || '',
      });
    }
  }, [data]);

  const handleSave = () => {
    saveSettings.mutate(form as any, {
      onSuccess: () => toast({ title: 'Settings saved', description: 'API integration settings updated.' }),
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });
  };

  const field = (label: string, key: keyof typeof form, placeholder: string, type = 'text') => (
    <div>
      <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-background border border-border rounded-md h-9 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
      />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-6">API Integration Settings</h2>

      <div className="mb-6 border border-border rounded-lg p-4 space-y-3">
        <h3 className="font-mono text-sm text-primary font-bold flex items-center gap-2">
          <Shield className="w-4 h-4" /> SentinelOne EDR
        </h3>
        {field('Base URL', 's1BaseUrl', 'https://your-tenant.sentinelone.net')}
        {field('API Token', 's1ApiToken', 'ApiToken xxxx…', 'password')}
      </div>

      <div className="mb-6 border border-border rounded-lg p-4 space-y-3">
        <h3 className="font-mono text-sm text-violet-400 font-bold flex items-center gap-2">
          <Settings className="w-4 h-4" /> LogRhythm SIEM
        </h3>
        {field('Base URL', 'lrBaseUrl', 'https://your-lr-server/lr-api')}
        {field('API Token', 'lrApiToken', 'Bearer token…', 'password')}
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs font-mono text-muted-foreground mb-4">
        When API credentials are configured, the dashboard proxies live requests to your SentinelOne and LogRhythm instances. Without credentials, realistic mock data is shown.
      </div>

      <button
        onClick={handleSave}
        disabled={saveSettings.isPending || isLoading}
        className="flex items-center gap-2 px-6 py-2.5 bg-primary/20 border border-primary/40 text-primary font-mono text-sm rounded-md hover:bg-primary/30 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saveSettings.isPending ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
