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

import { LayoutDashboard, List, FileText, Users, RefreshCw, ChevronDown, Sun, Moon, LogOut, ArrowLeft, Briefcase, Activity } from 'lucide-react'
import { cn } from './lib/utils'

const queryClient = new QueryClient()

function AppContent() {
  const [user, setUser] = useState<{ name: string, email: string, role: string } | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return localStorage.getItem('dashpro_theme') === 'light' ? 'light' : 'dark'
  })

  const [isProfileOpen, setIsProfileOpen] = useState(false)

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

  // 🔹 LOGIN FIX
  const handleLogin = (userData: any) => {
    setUser(userData)
    localStorage.setItem('dashpro_user', JSON.stringify(userData))
    navigate('/overview') // ✅ IMPORTANT FIX
  }

  // 🔹 LOGOUT FIX
  const handleSignOut = () => {
    setUser(null)
    localStorage.removeItem('dashpro_user')
    setIsProfileOpen(false)
    navigate('/login') // ✅ FIXED
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
    { path: '/recent-file', label: 'Files', icon: List },
    { path: '/jobs', label: 'Jobs', icon: Briefcase },
    { path: '/step-metrics', label: 'Step Metrics', icon: Activity },
    { path: '/users', label: 'Users', icon: Users },
  ]

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }

  const getPageTitle = (path: string) => {
    if (path === '/overview' || path === '/') return { title: 'Processing Overview', icon: LayoutDashboard }
    if (path.startsWith('/recent-file')) return { title: 'Recent Files', icon: List }
    if (path.startsWith('/file-details')) return { title: 'File Details', icon: FileText }
    if (path.startsWith('/users')) return { title: 'Users Management', icon: Users }
    if (path.startsWith('/jobs')) return { title: 'Jobs', icon: Briefcase }
    if (path.startsWith('/step-metrics')) return { title: 'Step Metrics', icon: Activity }
    return { title: 'Dashboard', icon: LayoutDashboard }
  }

  const { title: pageTitle, icon: PageIcon } = getPageTitle(location.pathname)

  return (
    <div className={cn("min-h-screen flex flex-col", theme === 'dark' ? 'dark bg-background text-foreground' : 'bg-background text-foreground')}>

      {/* HEADER */}
      <header className="sticky top-0 z-30 px-6 py-3 flex justify-between border-b bg-card border-border">
        <div className="flex items-center gap-2">
          <span className="font-bold">Flask AI</span>
        </div>

        <div className="flex items-center gap-3">

          <button onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
          </button>

          <button onClick={handleRefresh}>
            <RefreshCw size={14}/>
          </button>

          <button onClick={handleSignOut}>
            <LogOut size={14}/>
          </button>

        </div>
      </header>

      {/* NAV */}
      <nav className="flex gap-2 p-4 border-b">
        {navItems.map(({ path, label }) => (
          <Link key={path} to={path}>
            {label}
          </Link>
        ))}
      </nav>

      {/* CONTENT */}
      <main className="flex-1 p-6">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial="initial" animate="animate" exit="exit" variants={pageVariants}>
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
      </main>
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
