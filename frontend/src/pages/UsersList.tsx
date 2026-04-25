import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter, Clock, UserIcon, Database, CheckCircle2, ShieldAlert, FileText, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UsersList() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    refetchInterval: 5000, // ✅ REAL-TIME FIX
  });

  // 🔥 CRITICAL FIX (handle any backend shape)
  const users =
    data?.items ||
    data?.data ||
    data ||
    [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // ✅ SAFE FILTER
  const filteredUsers = users.filter((user: any) => {
    const email = user?.email || '';
    const id = user?.id || '';
    const search = searchTerm.toLowerCase();

    return (
      email.toLowerCase().includes(search) ||
      id.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">

      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Users & Access Management</h2>
            <p className="text-xs text-muted-foreground">Managing {users.length} registered users</p>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search email or UUID..."
            className="pl-9 h-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead className="text-right">Activity</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>

            {filteredUsers.map((user: any) => {

              const email = user?.email || '—';
              const id = user?.id || '—';
              const hasOnboarded = user?.metadata?.hasOnboarded === true;

              return (
                <TableRow key={id}>

                  {/* USER */}
                  <TableCell>
                    <div className="flex gap-3 items-center">
                      <div className="w-9 h-9 bg-indigo-500 text-white flex items-center justify-center rounded">
                        {email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{email}</div>
                        <div className="text-xs text-muted-foreground">{id}</div>
                      </div>
                    </div>
                  </TableCell>

                  {/* STATUS */}
                  <TableCell>
                    {hasOnboarded ? (
                      <Badge className="bg-green-500/10 text-green-500">Onboarded</Badge>
                    ) : (
                      <Badge className="bg-yellow-500/10 text-yellow-500">Pending</Badge>
                    )}

                    {user?.is_deleted && (
                      <Badge className="ml-2 bg-red-500/10 text-red-500">Deleted</Badge>
                    )}
                  </TableCell>

                  {/* QUOTA */}
                  <TableCell>
                    {user?.quota ? (
                      <div>
                        <div className="text-xs font-bold">
                          {user.quota.plan || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {JSON.stringify(user.quota.usage || {})}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No quota
                      </span>
                    )}
                  </TableCell>

                  {/* ACTIVITY */}
                  <TableCell className="text-right">

                    <div className="flex flex-col items-end gap-1">

                      <div className="text-xs">
                        Login: {user?.last_login_at
                          ? new Date(user.last_login_at).toLocaleString()
                          : 'Never'}
                      </div>

                      <Link
                        to={`/recent-file?email=${encodeURIComponent(email)}`}
                        className="text-blue-400 text-xs"
                      >
                        Files: {user?.file_count ?? 0}
                      </Link>

                    </div>

                  </TableCell>

                </TableRow>
              );
            })}

            {/* ✅ NO MISLEADING EMPTY MESSAGE */}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Waiting for user data...
                </TableCell>
              </TableRow>
            )}

          </TableBody>
        </Table>

      </div>

    </div>
  );
}