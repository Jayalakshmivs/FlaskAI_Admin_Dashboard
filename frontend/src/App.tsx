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
import { LayoutDashboard, List, FileText, Users, RefreshCw, ChevronDown, Sun, Moon, LogOut, ArrowLeft, Briefcase, Activity } from 'lucide-react'
import { cn } from './lib/utils'

const queryClient = new QueryClient()
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

  const handleRefresh = () => {
    // Refresh the current route by invalidating all queries and reloading the page
    queryClient.invalidateQueries()
    window.location.reload()
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
    <div className={cn("min-h-screen flex flex-col font-sans transition-colors duration-200", theme === 'dark' ? 'dark bg-background text-foreground' : 'bg-background text-foreground')}>

      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-30 px-6 py-3 flex items-center justify-between border-b bg-card border-border">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-card-foreground text-sm">Flask AI</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-xs font-medium">Admin Dashboard</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 relative">
          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-1">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button onClick={handleRefresh} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium border bg-secondary border-border text-foreground hover:bg-muted transition-colors">
            <RefreshCw size={12} />
            Refresh
          </button>

          {/* User avatar Dropdown */}
          <div className="relative ml-2 pl-2 border-l border-border">
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium hover:bg-muted transition-colors text-foreground">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-primary">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {user.name.split(' ')[0]}
              <ChevronDown size={12} />
            </button>
            {isProfileOpen && (
              <div className="absolute top-full mt-1 right-0 w-48 bg-popover border border-border rounded-md shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-medium text-popover-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted">
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <nav className="flex items-center gap-1 px-6 pt-4 pb-0 bg-background border-b border-border">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2',
              location.pathname === path || (path === '/recent-file' && location.pathname.startsWith('/file-details'))
                ? 'border-blue-500 bg-card text-foreground'
                : 'border-transparent hover:border-muted-foreground text-muted-foreground',
            )}
          >
            <Icon size={13} />
            {label}
          </Link>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto">
        <div className="mx-6 my-0 rounded-b-xl rounded-tr-xl border bg-card border-border min-h-[calc(100vh-180px)]">
          <div className="px-8 pt-6 pb-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PageIcon size={16} className="text-blue-400" />
              <span className="font-bold text-sm text-foreground">{pageTitle}</span>
            </div>
            {location.pathname !== '/overview' && location.pathname !== '/' && (
              <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <Routes location={location}>
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/recent-file" element={<FileList onSelectFile={(id) => navigate(`/file-details/${id}`)} />} />
                  <Route path="/files" element={<RecentFiles onSelectFile={(id) => navigate(`/file-details/${id}`)} />} />
                  <Route path="/file-details/:id" element={<FileDetailsWrapper />} />
                  <Route path="/file-details" element={
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <FileText size={48} className="text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Select a file from <Link to="/recent-file" className="text-blue-400 underline hover:text-blue-500 transition-colors">Recent Files</Link> to view its details.</p>
                    </div>
                  } />
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/jobs" element={<JobsList />} />
                  <Route path="/jobs/:jobId" element={<JobsList />} />
                  <Route path="/step-metrics" element={<StepMetricsList />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
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
