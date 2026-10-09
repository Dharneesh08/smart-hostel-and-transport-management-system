import { useState } from 'react';
import { Lock, Bus, KeyRound, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function TransportAccessPage() {
  const { student, staff, setTransportAuth, setPortal, role } = useAuth();
  const [name, setName] = useState(student?.name || staff?.name || '');
  const [busNumber, setBusNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'student') {
      // For students: verify bus assignment and bus password
      const { data: bus } = await supabase
        .from('buses')
        .select('*')
        .eq('bus_number', busNumber)
        .maybeSingle();

      if (!bus) { setError('Bus not found. Please check the bus number.'); return; }

      if (student?.bus_id === bus.id && bus.bus_password === password) {
        setTransportAuth(true);
        return;
      }
      setError('You are not assigned to this bus, or the bus password is incorrect.');
    } else {
      // For staff: accept staff password
      if (password === staff?.password || password === 'staff123') {
        setTransportAuth(true);
        return;
      }
      setError('Invalid staff password.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <button
          onClick={() => setPortal(null as never)}
          className="text-sm text-slate-400 hover:text-slate-200 mb-4 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to portal selection
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 animate-fadeIn">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Bus className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Transport Portal Access</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Secure secondary authentication</p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">
            {role === 'student' ? (
              <>Enter your assigned bus number and bus password. Demo: TN-28-1234 / bus1234</>
            ) : (
              <>Enter your staff password to access the Transport Admin Portal. Demo: staff123</>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {role === 'student' ? 'Student Name' : 'Staff Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {role === 'student' ? 'Registration Number / Password' : 'Staff ID'}
              </label>
              <input
                type="text"
                value={busNumber}
                onChange={e => setBusNumber(e.target.value)}
                required
                placeholder={role === 'student' ? 'e.g. TN-28-1234' : 'e.g. STAFF002'}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {role === 'student' ? 'Bus Password' : 'Staff Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Authenticate & Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
