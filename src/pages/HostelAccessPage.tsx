import { useState } from 'react';
import { Lock, Building2, KeyRound, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function HostelAccessPage() {
  const { student, staff, setHostelAuth, setPortal, role } = useAuth();
  const [name, setName] = useState(student?.name || staff?.name || '');
  const [hostelId, setHostelId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'student') {
      // For students: verify hostel ID and room password
      const { data: room } = await supabase
        .from('rooms')
        .select('id, room_number, room_password, hostel_id')
        .eq('room_password', password)
        .maybeSingle();

      if (student?.room_id) {
        const { data: studentRoom } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', student.room_id)
          .maybeSingle();

        if (studentRoom && (studentRoom.room_number === hostelId || studentRoom.room_password === password)) {
          setHostelAuth(true);
          return;
        }
      }
      setError('Invalid Hostel ID or room password. Use your room number and room password.');
    } else {
      // For staff: accept any staff password as they are pre-authenticated
      if (password === staff?.password || password === 'staff123') {
        setHostelAuth(true);
        return;
      }
      setError('Invalid staff password.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
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
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Hostel Portal Access</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Secure secondary authentication</p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-600 dark:text-blue-400">
            {role === 'student' ? (
              <>Enter your room number (e.g. 204) and your room password. Demo: Room 204 / room204</>
            ) : (
              <>Enter your staff password to access the Hostel Admin Portal. Demo: staff123</>
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
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {role === 'student' ? 'Hostel ID / Room Number' : 'Hostel Staff ID'}
              </label>
              <input
                type="text"
                value={hostelId}
                onChange={e => setHostelId(e.target.value)}
                required
                placeholder={role === 'student' ? 'e.g. 204' : 'e.g. STAFF001'}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {role === 'student' ? 'Room Password' : 'Staff Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
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

            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Authenticate & Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
