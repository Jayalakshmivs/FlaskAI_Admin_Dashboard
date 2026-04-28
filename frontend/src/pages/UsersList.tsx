import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers, UserItem } from '@/lib/api';
import { 
  Loader2, Search, Clock, UserIcon, 
  Database, ShieldAlert, FileText, 
  RefreshCw, Users, ShieldCheck, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';


export default function UsersList() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading, isFetching } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest text-center">
          Querying Neural Nodes...<br/>
          <span className="text-[10px] opacity-60 font-mono italic">Synchronizing identity database</span>
        </span>
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
            Identity Management
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-border text-[10px] font-black uppercase tracking-widest ${isFetching ? 'text-blue-400' : 'text-muted-foreground'}`}>
              <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Syncing' : 'Connected'}
            </div>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Managing authorized principal entities and neural network nodes.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-card border border-border rounded-2xl px-5 py-2.5 flex items-center gap-4 shadow-sm">
            <div className="text-right">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Active Nodes</p>
              <p className="text-xl font-black text-foreground">{users?.length || 0}</p>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <Users size={20} className="text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-2 rounded-2xl flex flex-col md:flex-row gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text"
            placeholder="Search by identity email or principal UUID..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-white/5 focus:border-blue-500/50 rounded-xl text-sm outline-none transition-all placeholder:text-slate-600 font-medium"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="px-6 py-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95">
          Filter Cluster
        </button>
      </div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredUsers?.map((user, idx) => {
            const nameInitial = user.email ? user.email.charAt(0).toUpperCase() : '?';
            const hasOnboarded = user.metadata && user.metadata.hasOnboarded === true;
            
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (idx % 10) * 0.05 }}
                className="group relative bg-slate-900/30 hover:bg-slate-900/50 border border-white/5 hover:border-blue-500/30 rounded-3xl p-6 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl blur-sm opacity-0 group-hover:opacity-40 transition-opacity" />
                      <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-center font-black text-2xl text-blue-400 overflow-hidden">
                        {nameInitial}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-black text-white truncate text-lg tracking-tight group-hover:text-blue-400 transition-colors">{user.email}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">ID: {user.id.slice(0, 13)}...</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {user.is_deleted ? 'DECOMMISSIONED' : 'OPERATIONAL'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {hasOnboarded ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                        <ShieldCheck size={10} /> SECURE
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest">
                        <ShieldAlert size={10} /> PENDING
                      </div>
                    )}
                    <div className="px-3 py-1 rounded-full bg-slate-950 border border-white/5 text-slate-500 text-[9px] font-bold">
                      {user.quota?.plan || 'STANDARD'}
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <FileText size={10} className="text-blue-400" /> FILE COUNT
                    </span>
                    <span className="text-lg font-black text-white">{user.file_count ?? 0}</span>
                  </div>
                  <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Zap size={10} className="text-purple-400" /> METADATA
                    </span>
                    <span className="text-lg font-black text-white uppercase">{user.metadata ? 'SYNCED' : 'NONE'}</span>
                  </div>
                  <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10} className="text-emerald-400" /> LAST ACCESS
                    </span>
                    <span className="text-[10px] font-black text-white mt-1">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'NEVER'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
                    <Database size={10} />
                    PROVISIONED {new Date(user.created_at).toLocaleDateString()}
                  </div>
                  <Link
                    to={`/recent-file?email=${encodeURIComponent(user.email)}`}
                    className="flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-[0.2em] group/link"
                  >
                    INSPECT NODES
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center group-hover/link:bg-blue-500/20 transition-colors">
                      <FileText size={10} />
                    </div>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredUsers?.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center gap-6">
            <div className="p-8 bg-slate-900 border border-white/5 rounded-full text-slate-700">
              <UserIcon size={48} />
            </div>
            <div className="text-center">
              <h4 className="text-xl font-black text-white uppercase tracking-tight">No Identities Found</h4>
              <p className="text-sm text-slate-500 mt-2">The principal entity "{searchTerm}" does not exist in this cluster.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

