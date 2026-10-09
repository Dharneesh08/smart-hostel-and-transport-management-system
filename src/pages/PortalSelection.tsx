import { Building2, Bus, ChevronRight, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function PortalSelection() {
  const { student, staff, setPortal, logout } = useAuth();
  const userName = student?.name || staff?.name;
  const userRole = student ? `Student • ${student.reg_number}` : `Staff • ${staff?.staff_id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${student ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
              {student ? <User className="w-6 h-6 text-blue-400" /> : <Shield className="w-6 h-6 text-emerald-400" />}
            </div>
            <div>
              <p className="text-white font-semibold">{userName}</p>
              <p className="text-slate-400 text-sm">{userRole}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <h1 className="text-center text-2xl font-bold text-white mb-2">Select a Portal</h1>
        <p className="text-center text-slate-400 text-sm mb-8">Choose which system you'd like to access. Each portal requires additional secure authentication.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => setPortal('hostel')}
            className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-left hover:bg-white/10 transition-all hover:scale-[1.02] hover:border-blue-400/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Hostel Portal</h2>
            <p className="text-slate-400 text-sm mb-4">Electricity monitoring, complaints, bills, room expenses, and maintenance.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded">Electricity</span>
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded">Complaints</span>
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded">Bills</span>
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded">Analytics</span>
            </div>
          </button>

          <button
            onClick={() => setPortal('transport')}
            className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-left hover:bg-white/10 transition-all hover:scale-[1.02] hover:border-emerald-400/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
                <Bus className="w-8 h-8 text-emerald-400" />
              </div>
              <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Transport Portal</h2>
            <p className="text-slate-400 text-sm mb-4">Live bus tracking, routes, schedules, emergency alerts, and timing history.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded">Live Tracking</span>
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded">Schedule</span>
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded">Alerts</span>
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded">Analytics</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
