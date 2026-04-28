import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers, UserItem } from '@/lib/api';
import { 
  Loader2, Search, Clock, UserIcon, 
  ShieldAlert, FileText, 
  RefreshCw, Users, ShieldCheck,
  Mail, BarChart3, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export default function UsersList() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading, isFetching, refetch } = useQuery<UserItem[]>({
    queryKey: ['users', searchTerm],
    queryFn: getUsers,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">
          Loading User Directory...
        </p>
      </div>
    );
  }

  const filteredUsers = users?.filter(user => {
    const email = user.email || '';
    const id = user.id || '';
    const searchLower = searchTerm.toLowerCase();
    return email.toLowerCase().includes(searchLower) || id.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-6 page-transition">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage system identities and node principals.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
            <Users size={18} className="text-primary" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Nodes</p>
              <p className="text-sm font-bold">{users?.length || 0}</p>
            </div>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors shadow-sm">
            <RefreshCw size={18} className={cn("text-muted-foreground", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search by email or principal UUID..." 
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="px-6 py-2.5 bg-card border border-border text-foreground hover:bg-muted rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2">
          <Filter size={14} /> Filter Set
        </button>
      </div>

      {/* Table Structure */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Identity Profile</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resource Quota</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Audit Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers?.map((user) => {
                const nameInitial = user.email ? user.email.charAt(0).toUpperCase() : '?';
                const hasOnboarded = user.metadata && user.metadata.hasOnboarded === true;
                
                return (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                          {nameInitial}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{user.email}</span>
                          <span className="text-[10px] font-mono text-muted-foreground tracking-tighter">UID: {user.id.slice(0, 18)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {hasOnboarded ? (
                            <div className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1.5">
                              <ShieldCheck size={12} /> Onboarded
                            </div>
                          ) : (
                            <div className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase tracking-widest border border-amber-100 dark:border-amber-500/20 flex items-center gap-1.5">
                              <ShieldAlert size={12} /> Pending
                            </div>
                          )}
                          {user.is_deleted && (
                            <div className="px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold uppercase tracking-widest border border-rose-100 dark:border-rose-500/20">
                              Deleted
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1"><Mail size={10} /> Email Verified</span>
                          <span className="flex items-center gap-1"><ShieldCheck size={10} /> MFA Active</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                         <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-foreground">Plan:</span>
                           <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                             {user.quota?.plan || 'STANDARD'}
                           </span>
                         </div>
                         <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                           <BarChart3 size={12} />
                           Registry Objects: {user.file_count ?? 0}
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                         <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 border border-border rounded-lg">
                            <Clock size={12} className="text-muted-foreground" />
                            <span className="text-[10px] font-bold text-foreground">
                              {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never Access'}
                            </span>
                         </div>
                         <Link
                            to={`/recent-file?email=${encodeURIComponent(user.email)}`}
                            className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest flex items-center gap-1"
                          >
                            <FileText size={12} /> View User Files
                          </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers?.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-6 bg-muted rounded-full text-muted-foreground/30">
              <UserIcon size={48} />
            </div>
            <div>
              <h4 className="font-bold text-foreground uppercase tracking-tight">No Principal Found</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-[300px] mx-auto leading-relaxed">The identity you are searching for is not provisioned in this directory.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
