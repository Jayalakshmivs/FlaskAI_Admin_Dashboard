import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

import { LayoutDashboard, List, FileText, Users, RefreshCw, Sun, Moon, LogOut, Briefcase, Activity, ChevronRight, Menu, Bell, Settings } from 'lucide-react'
import { cn } from './lib/utils'

const queryClient = new QueryClient()

function AppContent() {
  const [user, setUser] = useState<{ name: string, email: string, role: string, picture?: string } | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return localStorage.getItem('dashpro_theme') === 'light' ? 'light' : 'dark'
  })

  const [isSidebarOpen, setSidebarOpen] = useState(true)

  // 🔹 Theme toggle
  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('dashpro_theme', newTheme)
      return newTheme
    })
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // 🔹 Restore user session
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
    navigate('/overview')
  }

  const handleSignOut = () => {
    setUser(null)
    localStorage.removeItem('dashpro_user')
    navigate('/login')
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries()
    window.location.reload()
  }

  // 🔐 AUTH GUARD
  if (!user) {
    return <Login onLoginSuccess={handleLogin} />
  }

  const navItems = [
    { path: '/overview', label: 'Overview', icon: LayoutDashboard },
    { path: '/recent-file', label: 'Files Explorer', icon: List },
    { path: '/jobs', label: 'Jobs Pipeline', icon: Briefcase },
    { path: '/step-metrics', label: 'Step Metrics', icon: Activity },
    { path: '/users', label: 'Users & Access', icon: Users },
  ]

  const pageVariants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2, ease: 'easeIn' } }
  }

  const getPageTitle = (path: string) => {
    if (path === '/overview' || path === '/') return { title: 'Processing Overview', subtitle: 'High-level analytics and pipeline health' }
    if (path.startsWith('/recent-file') || path.startsWith('/files')) return { title: 'Files Explorer', subtitle: 'Manage and track processed documents' }
    if (path.startsWith('/file-details')) return { title: 'File Details', subtitle: 'Granular processing step breakdown' }
    if (path.startsWith('/users')) return { title: 'Users Management', subtitle: 'Control access and quotas' }
    if (path.startsWith('/jobs')) return { title: 'Jobs Pipeline', subtitle: 'Monitor active and historical processing jobs' }
    if (path.startsWith('/step-metrics')) return { title: 'Step Metrics', subtitle: 'Detailed performance data across all tasks' }
    return { title: 'Dashboard', subtitle: '' }
  }

  const { title: pageTitle, subtitle: pageSubtitle } = getPageTitle(location.pathname)

  return (
    <div className={cn("min-h-screen flex bg-background text-foreground overflow-hidden font-sans", theme)}>
      
      {/* SIDEBAR */}
      <aside className={cn(
        "bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col z-40 relative",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black tracking-tighter shadow-lg shadow-primary/20">
                FA
              </div>
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Flask AI
              </span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-auto"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-6 flex flex-col gap-1 px-3 overflow-y-auto overflow-x-hidden">
          {isSidebarOpen && <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</p>}
          
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(path) || (path === '/overview' && location.pathname === '/')
            return (
              <Link 
                key={path} 
                to={path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                  />
                )}
                <Icon size={18} className={cn("flex-shrink-0", isActive ? "text-primary" : "group-hover:text-foreground")} />
                {isSidebarOpen && (
                  <span className="truncate">{label}</span>
                )}
                {isSidebarOpen && isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
              </Link>
            )
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className={cn("flex items-center", isSidebarOpen ? "gap-3" : "justify-center")}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              {user.picture ? <img src={user.picture} alt="Profile" className="w-full h-full rounded-full" /> : user.name.charAt(0).toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        
        {/* TOP HEADER */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-background/80 backdrop-blur-md z-30 shrink-0">
          
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              {pageTitle}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{pageSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            
            <div className="hidden sm:flex items-center bg-muted/50 rounded-full p-1 border border-border">
              <button 
                onClick={() => setTheme('light')}
                className={cn("p-1.5 rounded-full transition-all", theme === 'light' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Sun size={14} />
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={cn("p-1.5 rounded-full transition-all", theme === 'dark' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Moon size={14} />
              </button>
            </div>

            <div className="h-6 w-px bg-border hidden sm:block mx-1"></div>

            <button 
              onClick={handleRefresh}
              className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors relative group"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>

            <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors">
              <Bell size={18} />
            </button>

            <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors hidden sm:block">
              <Settings size={18} />
            </button>

            <button 
              onClick={handleSignOut}
              className="p-2 text-red-500/70 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div 
                key={location.pathname} 
                initial="initial" 
                animate="animate" 
                exit="exit" 
                variants={pageVariants}
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/overview" />} />
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/recent-file" element={<FileList onSelectFile={(id) => navigate(`/file-details/${id}`)} />} />
                  <Route path="/files" element={<RecentFiles onSelectFile={(id) => navigate(`/file-details/${id}`)} />} />
                  <Route path="/file-details/:id" element={<FileDetailsWrapper />} />
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/jobs" element={<JobsList />} />
                  <Route path="/step-metrics" element={<StepMetricsList />} />
                  <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
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