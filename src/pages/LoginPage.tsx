import { useState } from 'react';
import { GraduationCap, Shield, Users, Lock, ArrowRight, Eye, EyeOff, Building2, Bus, AlertCircle, ShipWheel } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Student, Staff, Driver } from '@/lib/types';

export function LoginPage() {
  const { loginStudent, loginStaff, loginDriver } = useAuth();
  const [mode, setMode] = useState<'select' | 'student' | 'staff' | 'driver'>('select');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('students')
      .select('*')
      .eq('reg_number', identifier)
      .eq('password', password)
      .maybeSingle();
    setLoading(false);
    if (queryError) { setError('Login failed. Please try again.'); return; }
    if (!data) { setError('Invalid registration number or password.'); return; }
    loginStudent(data as Student);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('staff')
      .select('*')
      .eq('staff_id', identifier)
      .eq('password', password)
      .maybeSingle();
    setLoading(false);
    if (queryError) { setError('Login failed. Please try again.'); return; }
    if (!data) { setError('Invalid Staff ID or password.'); return; }
    loginStaff(data as Staff);
  };

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('drivers')
      .select('*')
      .eq('driver_id', identifier)
      .eq('password', password)
      .maybeSingle();
    setLoading(false);
    if (queryError) { setError('Login failed. Please try again.'); return; }
    if (!data) { setError('Invalid Driver ID or password.'); return; }
    loginDriver(data as Driver);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Hostel & Transport Management</h1>
          <p className="text-slate-400 mt-1 text-sm">College Management Platform</p>
        </div>

        {mode === 'select' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            <button
              onClick={() => { setMode('student'); setError(''); }}
              className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-left hover:bg-white/10 transition-all hover:scale-[1.02] hover:border-blue-400/30"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                  <Users className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Student Login</h2>
                  <p className="text-sm text-slate-400">Access your hostel & transport</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">View your room, electricity, complaints, bills, bus tracking, and alerts.</p>
              <div className="flex items-center gap-2 mt-4 text-blue-400 text-sm font-medium">
                Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => { setMode('staff'); setError(''); }}
              className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-left hover:bg-white/10 transition-all hover:scale-[1.02] hover:border-emerald-400/30"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
                  <Shield className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Staff Login</h2>
                  <p className="text-sm text-slate-400">Admin & management access</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">Monitor rooms, manage complaints, track buses, and view analytics.</p>
              <div className="flex items-center gap-2 mt-4 text-emerald-400 text-sm font-medium">
                Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => { setMode('driver'); setError(''); }}
              className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-left hover:bg-white/10 transition-all hover:scale-[1.02] hover:border-amber-400/30"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-amber-500/20 rounded-xl group-hover:bg-amber-500/30 transition-colors">
                  <ShipWheel className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Driver Login</h2>
                  <p className="text-sm text-slate-400">Transport management only</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">Report bus issues, track complaint status, and receive transport instructions.</p>
              <div className="flex items-center gap-2 mt-4 text-amber-400 text-sm font-medium">
                Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        )}

        {mode !== 'select' && (
          <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 animate-fadeIn">
            <button
              onClick={() => { setMode('select'); setError(''); setName(''); setIdentifier(''); setPassword(''); }}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-4"
            >
              ← Back to login options
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2.5 rounded-xl ${mode === 'student' ? 'bg-blue-100 text-blue-600' : mode === 'staff' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {mode === 'student' ? <Users className="w-6 h-6" /> : mode === 'staff' ? <Shield className="w-6 h-6" /> : <ShipWheel className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {mode === 'student' ? 'Student Login' : mode === 'staff' ? 'Staff Login' : 'Driver Login'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {mode === 'student' ? 'Enter your credentials to continue' : mode === 'staff' ? 'Enter your staff credentials' : 'Enter your driver credentials (Transport only)'}
                </p>
              </div>
            </div>

            <form onSubmit={mode === 'student' ? handleStudentLogin : mode === 'staff' ? handleStaffLogin : handleDriverLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {mode === 'student' ? 'Student Name' : mode === 'staff' ? 'Staff Name' : 'Driver Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder={mode === 'student' ? 'e.g. Arjun S' : mode === 'staff' ? 'e.g. Rajesh Kumar' : 'e.g. Murugan'}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {mode === 'student' ? 'Registration Number' : mode === 'staff' ? 'Staff ID' : 'Driver ID'}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  placeholder={mode === 'student' ? 'e.g. STU2024001' : mode === 'staff' ? 'e.g. STAFF001' : 'e.g. DRV001'}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {loading ? 'Authenticating...' : 'Secure Login'}
              </button>
            </form>

            <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Demo Credentials:</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {mode === 'student' ? 'STU2024001 / student123' : mode === 'staff' ? 'STAFF001 / staff123' : 'DRV001 / driver123'}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 mt-8 text-slate-500 text-sm">
          <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Hostel Portal</div>
          <div className="flex items-center gap-1.5"><Bus className="w-4 h-4" /> Transport Portal</div>
          <div className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Secure Access</div>
        </div>
      </div>
    </div>
  );
}
