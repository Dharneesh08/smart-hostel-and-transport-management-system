import { ReactNode, useState } from 'react';
import { Menu, X, Bell, Moon, Sun, LogOut, ChevronLeft } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export interface NavItem {
  label: string;
  icon: ReactNode;
  key: string;
  badge?: number;
}

export function DashboardLayout({
  navItems,
  activeKey,
  onNavigate,
  title,
  subtitle,
  children,
  onBack,
  notifications,
  onMarkNotificationRead,
}: {
  navItems: NavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  title: string;
  subtitle: string;
  children: ReactNode;
  onBack?: () => void;
  notifications?: { id: string; title: string; message: string; priority: string; is_read: boolean; created_at: string }[];
  onMarkNotificationRead?: (id: string) => void;
}) {
  const { theme, toggle } = useTheme();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-40 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200 dark:border-slate-700">
          {onBack && (
            <button onClick={onBack} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{title}</span>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeKey === item.key
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-slate-800 dark:text-slate-100 text-sm lg:text-base">{subtitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications && (
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-40 max-h-96 overflow-y-auto">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Notifications</span>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">No notifications</div>
                      ) : (
                        notifications.slice(0, 10).map(n => (
                          <button
                            key={n.id}
                            onClick={() => onMarkNotificationRead?.(n.id)}
                            className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                              !n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                n.priority === 'High' ? 'bg-red-500' : n.priority === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'
                              }`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
