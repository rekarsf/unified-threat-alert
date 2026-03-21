import React, { useState } from 'react';
import {
  useAdminGetUsers, useAdminGetSettings, useAdminGetAuditLog,
  useAdminSaveSettings
} from '@workspace/api-client-react';
import { Users, Settings, FileText, Shield, Plus, Trash2, Edit, Save } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'settings' | 'audit'>('users');
  const { hasScope } = useAuthStore();

  const tabs = [
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, scope: 'admin.users' },
    { id: 'settings', label: 'API Settings', icon: <Settings className="w-4 h-4" />, scope: 'admin.settings' },
    { id: 'audit', label: 'Audit Log', icon: <FileText className="w-4 h-4" />, scope: 'admin.settings' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Admin Panel
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card/30 flex gap-0">
        {tabs.filter(t => hasScope(t.scope)).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 font-mono text-sm border-b-2 transition-all ${
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
        {tab === 'users' && <UsersTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  const { data, isLoading, refetch } = useAdminGetUsers();
  const users = data?.users || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-widest">User Management</h2>
        <button className="flex items-center gap-2 text-xs font-mono text-primary border border-primary/30 bg-primary/10 px-3 py-2 rounded-md hover:bg-primary/20 transition-colors">
          <Plus className="w-3 h-3" /> Add User
        </button>
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>{['Username', 'Role', 'Scopes', 'Last Login', 'Actions'].map(h =>
              <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading...</td></tr>
            : users.map((user, i) => (
              <tr key={user.id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-mono text-sm text-foreground font-bold">{user.username}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                  {user.scopes.length} scopes
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useAdminGetSettings();
  const saveSettings = useAdminSaveSettings();
  const [form, setForm] = useState({
    s1BaseUrl: '', s1ApiToken: '', lrBaseUrl: '', lrApiToken: '',
  });

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
    saveSettings.mutate(form as any);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-6">API Integration Settings</h2>

      {/* SentinelOne */}
      <div className="mb-6 border border-border rounded-lg p-4">
        <h3 className="font-mono text-sm text-primary font-bold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" /> SentinelOne EDR
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Base URL</label>
            <input
              type="text"
              placeholder="https://your-tenant.sentinelone.net"
              value={form.s1BaseUrl}
              onChange={e => setForm(f => ({ ...f, s1BaseUrl: e.target.value }))}
              className="w-full bg-background border border-border rounded-md h-9 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">API Token</label>
            <input
              type="password"
              placeholder="ApiToken xxxx..."
              value={form.s1ApiToken}
              onChange={e => setForm(f => ({ ...f, s1ApiToken: e.target.value }))}
              className="w-full bg-background border border-border rounded-md h-9 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      {/* LogRhythm */}
      <div className="mb-6 border border-border rounded-lg p-4">
        <h3 className="font-mono text-sm text-primary font-bold mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" /> LogRhythm SIEM
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Base URL</label>
            <input
              type="text"
              placeholder="https://your-lr-server/lr-api"
              value={form.lrBaseUrl}
              onChange={e => setForm(f => ({ ...f, lrBaseUrl: e.target.value }))}
              className="w-full bg-background border border-border rounded-md h-9 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">API Token</label>
            <input
              type="password"
              placeholder="Bearer token..."
              value={form.lrApiToken}
              onChange={e => setForm(f => ({ ...f, lrApiToken: e.target.value }))}
              className="w-full bg-background border border-border rounded-md h-9 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs font-mono text-muted-foreground mb-4">
        When API credentials are configured, the dashboard will proxy real API calls to your SentinelOne and LogRhythm instances. Without credentials, realistic mock data is displayed.
      </div>

      <button
        onClick={handleSave}
        disabled={saveSettings.isPending}
        className="flex items-center gap-2 px-6 py-2.5 bg-primary/20 border border-primary/40 text-primary font-mono text-sm rounded-md hover:bg-primary/30 transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function AuditTab() {
  const { data, isLoading } = useAdminGetAuditLog({ limit: 100 });
  const entries = data?.data || [];

  return (
    <div className="p-6">
      <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-widest mb-4">Audit Log</h2>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>{['Timestamp', 'User', 'Action', 'Resource', 'IP'].map(h =>
              <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
            )}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading...</td></tr>
            : entries.map((entry, i) => (
              <tr key={entry.id} className={`border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">
                  {new Date(entry.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-primary">{entry.username}</td>
                <td className="px-4 py-2 font-mono text-xs text-foreground">{entry.action}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{entry.resource || '—'}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{entry.ip || '—'}</td>
              </tr>
            ))}
            {!isLoading && entries.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">No audit entries</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
