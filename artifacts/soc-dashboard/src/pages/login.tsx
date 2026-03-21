import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, Lock, User } from 'lucide-react';
import { CyberCard, CyberButton, CyberInput } from '@/components/cyber-ui';
import { useAuthStore } from '@/lib/store';
import { useAuthLogin } from '@workspace/api-client-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const setAuth = useAuthStore(s => s.setAuth);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [errorMsg, setErrorMsg] = useState('');

  const loginMutation = useAuthLogin({
    mutation: {
      onSuccess: (data) => {
        setAuth(data.user, data.token);
        const lastDash = localStorage.getItem('soc_last_dashboard') || '/s1';
        setLocation(lastDash);
      },
      onError: (error: any) => {
        setErrorMsg(error.response?.data?.message || 'Authentication failed. Access Denied.');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background visual elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <CyberCard className="w-full max-w-md p-8 z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 cyber-glow">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-widest text-shadow-cyber uppercase">
            SOC_MAP_CENTER
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-2 uppercase tracking-wide">
            Global Operations Terminal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest pl-1">Operator ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <CyberInput 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="pl-10" 
                placeholder="Enter ID..."
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest pl-1">Passcode</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <CyberInput 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="pl-10" 
                placeholder="••••••••"
                required 
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/50 rounded text-destructive text-sm font-mono text-center animate-pulse">
              {errorMsg}
            </div>
          )}

          <CyberButton 
            type="submit" 
            className="w-full mt-6"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Authenticating...' : 'Establish Connection'}
          </CyberButton>
        </form>

        <div className="mt-8 pt-6 border-t border-border/50 text-center flex flex-col gap-1">
          <span className="text-[10px] font-mono text-muted-foreground">UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED</span>
          <span className="text-[10px] font-mono text-primary/50">SYSTEM VERSION v0.1.0-alpha</span>
        </div>
      </CyberCard>
    </div>
  );
}
