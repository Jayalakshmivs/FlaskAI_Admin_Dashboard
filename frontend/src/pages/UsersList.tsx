import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers, UserItem } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter, Clock, UserIcon, Database, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function UsersList() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Advanced Filters Panel */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Directory Search</h3>
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Total Endpoints: <span className="text-primary font-black">{users?.length || 0}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Universal Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by email or exact UUID..." 
                className="pl-10 bg-background border-border focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 border-b border-border">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground py-4 pr-0 w-64">Identity Profile</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Account Health</TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Quota Configuration</TableHead>
              <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest text-muted-foreground pr-8">Temporal Telemetry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => {
               // Extract data safely
               const nameInitial = user.email ? user.email.charAt(0).toUpperCase() : '?';
               const hasOnboarded = user.metadata && user.metadata.hasOnboarded === true;
               
               return (
                <TableRow 
                  key={user.id}
                  className="hover:bg-primary/5 transition-colors border-b border-border last:border-0"
                >
                  <TableCell className="py-6 min-w-[250px]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-lg shadow-emerald-500/20">
                        {nameInitial}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-foreground truncate">{user.email}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight truncate max-w-[120px]" title={user.id}>{user.id}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {hasOnboarded ? (
                           <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 border shadow-sm dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold text-[10px] uppercase px-2 py-0.5 pointer-events-none rounded-md">
                             <CheckCircle2 className="w-3 h-3 mr-1" /> Onboarded
                           </Badge>
                        ) : (
                           <Badge className="bg-amber-50 text-amber-600 border-amber-100 border shadow-sm dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold text-[10px] uppercase px-2 py-0.5 pointer-events-none rounded-md">
                             <ShieldAlert className="w-3 h-3 mr-1" /> Pending
                           </Badge>
                        )}
                        {user.is_deleted && (
                           <Badge className="bg-rose-50 text-rose-600 border-rose-100 border shadow-sm dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 font-bold text-[10px] uppercase px-2 py-0.5 pointer-events-none rounded-md">
                             Deleted
                           </Badge>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <Database className="w-3 h-3" /> 
                        Metadata: {user.metadata ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.quota ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                           Plan: <span className="uppercase text-[10px] tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">{user.quota.plan || 'N/A'}</span>
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[200px]" title={JSON.stringify(user.quota.usage)}>
                           Usage: {JSON.stringify(user.quota.usage || {})}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-400 font-medium">No quota provisioned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 w-fit">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Login:</span>
                        <span className="text-[11px] font-semibold text-foreground">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mr-2">
                         <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Created:</span>
                         <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(user.created_at).toLocaleString([], { dateStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {filteredUsers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-muted rounded-full text-muted-foreground/30">
                       <UserIcon className="h-10 w-10" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">No identities found</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto leading-relaxed">Adjust your search criteria to find the user principal.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
