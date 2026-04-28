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
  LayoutDashboard, List, Users, 
  ChevronDown, Sun, Moon, 
  LogOut, Briefcase, Activity,
  Terminal, Shield, Zap,
  Menu, Bell
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return localStorage.getItem('dashpro_theme') === 'light' ? 'light' : 'dark'
  })

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
    { path: '/overview', label: 'Overview', icon: LayoutDashboard },
    { path: '/recent-file', label: 'Recent Files', icon: List },
    { path: '/jobs', label: 'Jobs', icon: Briefcase },
    { path: '/step_metrics', label: 'Step Metrics', icon: Activity },
    { path: '/users', label: 'Users', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      
      {/* Sidebar */}
      <aside className={cn(
        "bg-card border-r border-border transition-all duration-300 flex flex-col z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Zap size={20} fill="currentColor" />
          </div>
          {isSidebarOpen && <span className="font-bold tracking-tight text-xl">FlaskAI</span>}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/recent-file' && location.pathname.startsWith('/file-details'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon size={20} className={cn("shrink-0", !isActive && "group-hover:scale-110 transition-transform")} />
                {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {isSidebarOpen && <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            {isSidebarOpen ? <Menu size={20} /> : <Menu size={20} />}
            {isSidebarOpen && <span className="font-medium text-sm">Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
               {navItems.find(n => n.path === location.pathname || (n.path === '/recent-file' && location.pathname.startsWith('/file-details')))?.label || 'Dashboard'}
             </h2>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-muted-foreground hover:text-foreground relative transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] text-primary-foreground rounded-full flex items-center justify-center font-bold">3</span>
            </button>

            <div className="h-8 w-px bg-border" />

            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{user.role || 'Administrator'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-bold shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isProfileOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full mt-2 right-0 w-56 bg-card border border-border rounded-xl shadow-xl py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-border mb-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Signed in as</p>
                      <p className="text-sm font-bold truncate">{user.email}</p>
                    </div>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-left">
                      <Shield size={16} /> Profile Settings
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-left">
                      <Terminal size={16} /> System Status
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto w-full h-full"
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
                <Route path="*" element={<Navigate to="/overview" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
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
