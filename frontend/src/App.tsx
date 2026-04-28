import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Overview from './pages/Overview'
import RecentFiles from './pages/RecentFiles'
import FileList from './pages/FileList'
import FileDetails from './pages/FileDetails'
import UsersList from './pages/UsersList'
import JobsList from './pages/JobsList'
import StepMetricsList from './pages/StepMetricsList'
import Login from './pages/Login'
import { 
  LayoutDashboard, List, FileText, Users, 
  RefreshCw, ChevronDown, Sun, Moon, 
  LogOut, ArrowLeft, Briefcase, Activity,
  Layers, Terminal, Shield, Zap
} from 'lucide-react'
import { cn } from './lib/utils'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
    },
  },
})

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

function AppContent() {
  const [user, setUser] = useState<{ name: string, email: string, role: string } | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return localStorage.getItem('dashpro_theme') === 'light' ? 'light' : 'dark'
  })

  // Dropdown states
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('dashpro_theme', newTheme)
      return newTheme
    })
  }

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    const savedUser = localStorage.getItem('dashpro_user')
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)) }
      catch { localStorage.removeItem('dashpro_user') }
    }
  }, [])

  const handleLogin = (userData: any) => {
    setUser(userData)
    localStorage.setItem('dashpro_user', JSON.stringify(userData))
  }

  const handleSignOut = () => {
    setUser(null)
    localStorage.removeItem('dashpro_user')
    setIsProfileOpen(false)
    navigate('/')
  }

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Login onLoginSuccess={handleLogin} />
      </GoogleOAuthProvider>
    )
  }

  const navItems = [
    { path: '/overview', label: 'NEURAL NET', icon: LayoutDashboard },
    { path: '/recent-file', label: 'REGISTRY', icon: List },
    { path: '/jobs', label: 'CLUSTERS', icon: Briefcase },
    { path: '/step_metrics', label: 'TELEMETRY', icon: Activity },
    { path: '/users', label: 'NODES', icon: Users },
  ]

  const getPageTitle = (path: string) => {
    if (path === '/overview' || path === '/') return 'System Overview'
    if (path.startsWith('/recent-file')) return 'File Registry'
    if (path.startsWith('/file-details')) return 'Object Inspection'
    if (path.startsWith('/users')) return 'Identity Management'
    if (path.startsWith('/jobs')) return 'Compute Clusters'
    if (path.startsWith('/step_metrics')) return 'Signal Telemetry'
    return 'Dashboard'
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans transition-all duration-500 selection:bg-blue-500/30",
      theme === 'dark' ? 'dark bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-900'
    )}>
      
      {/* Background Aurora Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse [animation-delay:4s]" />
      </div>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950 border border-white/10">
              <Zap size={20} className="text-blue-400 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">FLASK AI</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/80">Command Center</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mainnet Connected</span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <button 
            onClick={toggleTheme} 
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)} 
              className="flex items-center gap-3 pl-3 pr-2 py-1 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-slate-200">{user.name.split(' ')[0]}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{user.role || 'Admin'}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-blue-500/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={14} className={cn("text-slate-500 transition-transform", isProfileOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 right-0 w-56 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/5 mb-1 bg-white/5">
                    <p className="text-sm font-black text-white">{user.name}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate italic">{user.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <Shield size={14} /> SECURITY CLEARANCE
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <Terminal size={14} /> SYSTEM LOGS
                  </button>
                  <div className="h-px bg-white/5 my-1" />
                  <button 
                    onClick={handleSignOut} 
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-rose-500 hover:bg-rose-500/10 transition-all"
                  >
                    <LogOut size={14} /> DEAUTHENTICATE
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex flex-col z-10 relative">
        {/* Sub-Nav / Tabs */}
        <div className="bg-slate-950/20 border-b border-white/5 px-6 pt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-1 overflow-x-auto pb-px">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path || (path === '/recent-file' && location.pathname.startsWith('/file-details'));
                return (
                  <Link
                    key={path}
                    to={isActive ? '#' : path}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-3.5 text-[10px] font-black tracking-[0.2em] transition-all relative whitespace-nowrap",
                      isActive 
                        ? "text-blue-400" 
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <Icon size={14} className={isActive ? "animate-pulse" : ""} />
                    {label}
                    {isActive && (
                      <motion.div 
                        layoutId="nav-active"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-full shadow-[0_-4px_12px_rgba(37,99,235,0.5)]" 
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mb-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Vector</span>
                <span className="text-xs font-black text-white uppercase tracking-tighter">{getPageTitle(location.pathname)}</span>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                <Layers size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Viewport */}
        <main className="flex-1 p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="min-h-full"
            >
              <Routes location={location}>
                <Route path="/" element={<Navigate to="/overview" replace />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/recent-file" element={<FileList onSelectFile={(id) => navigate(`/file-details/${id}`)} />} />
                <Route path="/files" element={<RecentFiles onSelectFile={(id) => navigate(`/file-details/${id}`)} />} />
                <Route path="/file-details/:id" element={<FileDetailsWrapper />} />
                <Route path="/users" element={<UsersList />} />
                <Route path="/jobs" element={<JobsList />} />
                <Route path="/jobs/:jobId" element={<JobsList />} />
                <Route path="/step_metrics" element={<StepMetricsList />} />
                <Route path="*" element={
                  <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl shadow-2xl">
                      <Zap size={64} className="text-slate-700" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Segment Not Found</h2>
                      <p className="text-sm text-slate-500 font-medium mt-2">The requested neural path does not exist in this cluster.</p>
                    </div>
                    <Link to="/overview" className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                      Return to Core
                    </Link>
                  </div>
                } />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Status Bar */}
      <footer className="px-6 py-2 bg-slate-950 border-t border-white/5 flex items-center justify-between text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-500" /> LATENCY: 24ms</span>
          <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-emerald-500" /> HEALTH: OPTIMAL</span>
        </div>
        <div className="flex items-center gap-4">
          <span>&copy; 2026 FLASK AI SYSTEMS v4.0.2</span>
        </div>
      </footer>
    </div>
  )
}

function FileDetailsWrapper() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  if (!id) return <Navigate to="/recent-file" replace />
  return <FileDetails fileId={id} onBack={() => navigate('/recent-file')} />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  )
}

export default App
