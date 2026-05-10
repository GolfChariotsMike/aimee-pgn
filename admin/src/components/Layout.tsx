import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { clearAuth, getUser } from '../lib/auth'
import {
  LayoutDashboard, BookOpen, MessageSquare, Mail, Settings, LogOut, Bot
} from 'lucide-react'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
  { to: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { to: '/email-ingestion', icon: Mail, label: 'Email Ingestion' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#1a3a2a' }}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#c9a84c' }}>
              <Bot size={20} color="#1a3a2a" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none">AImee</div>
              <div className="text-xs mt-0.5" style={{ color: '#c9a84c' }}>Perth Golf Network</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: '#c9a84c', color: '#1a3a2a' } : {}}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-white/40 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 w-full transition-colors"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
