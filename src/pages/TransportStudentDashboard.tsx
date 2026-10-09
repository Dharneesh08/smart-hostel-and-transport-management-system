import { useState, useEffect, useCallback } from 'react';
import {
  Bus as BusIcon, MapPin, Clock, Bell, Route, AlertTriangle,
  Navigation, Calendar, TrendingUp, Home, Zap,
  CheckCircle, X, Info, Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, NavItem } from '@/components/ui/DashboardLayout';
import { Card, CardHeader, CardBody, StatCard, Badge, StatusDot } from '@/components/ui/Card';
import { BarChart, ProgressBar } from '@/components/ui/Charts';
import {
  STATUS_COLORS, ALERT_SEVERITY_COLORS, formatTime, formatDateTime,
} from '@/lib/constants';
import type { Bus, BusStop, BusLocation, BusTimingHistory, TransportAlert, Notification } from '@/lib/types';

export function TransportStudentDashboard() {
  const { student, transportAuthenticated, setTransportAuth, setPortal } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [bus, setBus] = useState<Bus | null>(null);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [location, setLocation] = useState<BusLocation | null>(null);
  const [timingHistory, setTimingHistory] = useState<BusTimingHistory[]>([]);
  const [alerts, setAlerts] = useState<TransportAlert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!student?.bus_id) { setLoading(false); return; }
    setLoading(true);

    const { data: busData } = await supabase.from('buses').select('*').eq('id', student.bus_id).maybeSingle();
    setBus(busData as Bus | null);

    const { data: stopsData } = await supabase.from('bus_stops').select('*').eq('bus_id', student.bus_id).order('stop_order');
    setStops(stopsData as BusStop[] || []);

    const { data: locData } = await supabase.from('bus_locations').select('*').eq('bus_id', student.bus_id).maybeSingle();
    setLocation(locData as BusLocation | null);

    const { data: timingData } = await supabase.from('bus_timing_history').select('*').eq('bus_id', student.bus_id).order('record_date', { ascending: false });
    setTimingHistory(timingData as BusTimingHistory[] || []);

    const { data: alertsData } = await supabase.from('transport_alerts').select('*').eq('bus_id', student.bus_id).order('created_at', { ascending: false });
    setAlerts(alertsData as TransportAlert[] || []);

    const { data: notifs } = await supabase.from('notifications').select('*').eq('target_type', 'student').order('created_at', { ascending: false });
    const studentNotifs = (notifs as Notification[] || []).filter(n =>
      !n.related_bus_id || n.related_bus_id === student.bus_id
    );
    setNotifications(studentNotifs);

    setLoading(false);
  }, [student]);

  useEffect(() => {
    if (transportAuthenticated) loadData();
  }, [transportAuthenticated, loadData]);

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  if (!transportAuthenticated) return null;

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const activeAlerts = alerts.filter(a => !a.resolved);

  const navItems: NavItem[] = [
    { label: 'Overview', icon: <Home className="w-5 h-5" />, key: 'overview' },
    { label: 'Live Tracking', icon: <MapPin className="w-5 h-5" />, key: 'tracking' },
    { label: 'Route & Schedule', icon: <Route className="w-5 h-5" />, key: 'schedule' },
    { label: 'Timing History', icon: <Clock className="w-5 h-5" />, key: 'timing' },
    { label: 'Alerts', icon: <AlertTriangle className="w-5 h-5" />, key: 'alerts', badge: activeAlerts.length },
    { label: 'Notifications', icon: <Bell className="w-5 h-5" />, key: 'notifications', badge: unreadNotifs },
  ];

  const todayTiming = timingHistory.filter(t => t.record_date === new Date().toISOString().split('T')[0]);
  const yesterdayTiming = timingHistory.filter(t => t.record_date === new Date(Date.now() - 86400000).toISOString().split('T')[0]);
  const avgVariation = todayTiming.length > 0 ? todayTiming.reduce((s, t) => s + t.variation_minutes, 0) / todayTiming.length : 0;

  // Simulated map position
  const mapLat = location?.latitude || 11.6643;
  const mapLng = location?.longitude || 78.1467;

  return (
    <DashboardLayout
      navItems={navItems}
      activeKey={activeSection}
      onNavigate={setActiveSection}
      title="Transport Portal"
      subtitle={`Welcome, ${student?.name} • Bus ${bus?.bus_number || 'N/A'}`}
      onBack={() => { setTransportAuth(false); setPortal(null as never); }}
      notifications={notifications}
      onMarkNotificationRead={markNotificationRead}
    >
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && activeSection === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Bus Number" value={bus?.bus_number || 'N/A'} icon={<BusIcon className="w-6 h-6" />} color="green" />
            <StatCard label="Current Status" value={location?.status || 'On Time'} icon={<Navigation className="w-6 h-6" />} color={location?.status === 'Delayed' ? 'orange' : 'green'} />
            <StatCard label="Next Stop" value={location?.next_stop || 'N/A'} icon={<MapPin className="w-6 h-6" />} color="blue" />
            <StatCard label="Avg Delay" value={`${avgVariation > 0 ? '+' : ''}${avgVariation.toFixed(0)} min`} icon={<Clock className="w-6 h-6" />} color={avgVariation > 0 ? 'red' : 'green'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader title="Live Bus Location" subtitle="Simulated GPS tracking" icon={<MapPin className="w-5 h-5" />} />
              <CardBody>
                <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Simulated map grid */}
                      <div className="absolute inset-0 -m-32 opacity-20" style={{
                        backgroundImage: `linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                      }} />
                      {/* Route line */}
                      <svg className="absolute -inset-20" width="400" height="300" viewBox="0 0 400 300">
                        <path d="M 50 250 Q 150 200 200 150 T 350 50" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="8 4" />
                      </svg>
                      {/* Bus marker */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg shadow-lg flex items-center gap-1.5 text-sm font-medium animate-pulse">
                          <BusIcon className="w-4 h-4" /> {bus?.bus_number}
                        </div>
                        <div className="w-3 h-3 bg-emerald-600 rounded-full mt-1 shadow-lg" />
                        <div className="w-12 h-12 bg-emerald-600/20 rounded-full absolute -top-2 animate-ping" />
                      </div>
                      {/* Stop markers */}
                      <div className="absolute -left-16 top-16 flex flex-col items-center">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] text-slate-500">Start</span>
                      </div>
                      <div className="absolute -right-16 -top-8 flex flex-col items-center">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 font-medium">College</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-md">
                    <p className="text-xs text-slate-400">Current Location</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{location?.current_stop || 'N/A'}</p>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-md">
                    <p className="text-xs text-slate-400">Speed</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{location?.speed_kmh || 0} km/h</p>
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] rounded flex items-center gap-1">
                    <Info className="w-3 h-3" /> Simulated Data
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Route</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.route_name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Driver</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.driver_name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Start Time</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatTime(bus?.start_time || '')}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Return Time</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatTime(bus?.return_time || '')}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Emergency Alerts" icon={<AlertTriangle className="w-5 h-5" />} />
              <CardBody className="space-y-3">
                {activeAlerts.map(a => (
                  <div key={a.id} className={`p-3 rounded-lg border ${
                    a.severity === 'Emergency' ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                    : a.severity === 'High Priority' ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20'
                    : a.severity === 'Warning' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-slate-200 bg-slate-50 dark:bg-slate-700/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className={`w-4 h-4 ${a.severity === 'Emergency' ? 'text-red-500' : 'text-amber-500'}`} />
                      <Badge className={ALERT_SEVERITY_COLORS[a.severity] || ''}>{a.severity}</Badge>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{a.message}</p>
                    {a.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reason: {a.reason}</p>}
                    {a.expected_recovery && <p className="text-xs text-slate-500 dark:text-slate-400">Expected Recovery: {formatTime(a.expected_recovery)}</p>}
                    {a.revised_arrival && <p className="text-xs text-slate-500 dark:text-slate-400">Revised Arrival: {formatTime(a.revised_arrival)}</p>}
                  </div>
                ))}
                {activeAlerts.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">No active alerts. Bus running normally.</span>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Route Progress" subtitle={`${stops.length} stops`} icon={<Route className="w-5 h-5" />} />
            <CardBody>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {stops.map((stop, i) => {
                  const isActive = stop.stop_name === location?.current_stop;
                  const isPast = stop.stop_order < (stops.find(s => s.stop_name === location?.current_stop)?.stop_order || 0);
                  return (
                    <div key={stop.id} className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          isActive ? 'bg-emerald-500 border-emerald-500 animate-pulse'
                          : isPast ? 'bg-emerald-300 border-emerald-300'
                          : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                        }`} />
                        <span className={`text-[10px] text-center max-w-[80px] ${isActive ? 'font-bold text-emerald-600' : isPast ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {stop.stop_name}
                        </span>
                        <span className="text-[9px] text-slate-400">{formatTime(stop.arrival_time || '')}</span>
                      </div>
                      {i < stops.length - 1 && <div className={`w-8 h-0.5 mx-1 ${isPast ? 'bg-emerald-300' : 'bg-slate-200 dark:bg-slate-600'}`} />}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'tracking' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Bus" value={bus?.bus_number || 'N/A'} icon={<BusIcon className="w-6 h-6" />} color="green" />
            <StatCard label="Current Location" value={location?.current_stop || 'N/A'} icon={<MapPin className="w-6 h-6" />} color="blue" />
            <StatCard label="Next Stop" value={location?.next_stop || 'N/A'} icon={<Navigation className="w-6 h-6" />} color="amber" />
            <StatCard label="Speed" value={`${location?.speed_kmh || 0} km/h`} icon={<Zap className="w-6 h-6" />} color="orange" />
          </div>

          <Card>
            <CardHeader title="Live Map Tracking" subtitle="Simulated GPS data — not real-world location" icon={<MapPin className="w-5 h-5" />} />
            <CardBody>
              <div className="relative w-full h-80 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 -m-40 opacity-20" style={{
                      backgroundImage: `linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)`,
                      backgroundSize: '40px 40px',
                    }} />
                    <svg className="absolute -inset-32" width="500" height="400" viewBox="0 0 500 400">
                      <path d="M 80 350 Q 200 280 250 200 T 420 60" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="8 4" />
                      {stops.map((stop, i) => {
                        const x = 80 + (i / (stops.length - 1)) * 340;
                        const y = 350 - (i / (stops.length - 1)) * 290;
                        return <circle key={stop.id} cx={x} cy={y} r="6" fill={stop.is_college_stop ? "#10b981" : "#94a3b8"} stroke="white" strokeWidth="2" />;
                      })}
                    </svg>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg shadow-lg flex items-center gap-1.5 text-sm font-medium">
                        <BusIcon className="w-4 h-4" /> {bus?.bus_number}
                      </div>
                      <div className="w-3 h-3 bg-emerald-600 rounded-full mt-1" />
                      <div className="w-14 h-14 bg-emerald-600/20 rounded-full absolute -top-3 animate-ping" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 left-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-md space-y-1">
                  <div><span className="text-xs text-slate-400">Bus:</span> <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.bus_number}</span></div>
                  <div><span className="text-xs text-slate-400">Route:</span> <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.route_name}</span></div>
                  <div><span className="text-xs text-slate-400">Current:</span> <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{location?.current_stop}</span></div>
                  <div><span className="text-xs text-slate-400">Next:</span> <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{location?.next_stop}</span></div>
                  <div><span className="text-xs text-slate-400">ETA:</span> <span className="text-sm font-medium text-emerald-600">{formatTime(bus?.start_time ? addMinutes(bus.start_time, 80) : '')}</span></div>
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] rounded flex items-center gap-1">
                  <Info className="w-3 h-3" /> Simulated GPS
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'schedule' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Bus Route & Schedule" subtitle={`${bus?.route_name}`} icon={<Route className="w-5 h-5" />} />
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="text-left px-5 py-3 font-medium">Stop</th>
                    <th className="text-center px-5 py-3 font-medium">Arrival</th>
                    <th className="text-center px-5 py-3 font-medium">Departure</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map(s => (
                    <tr key={s.id} className={`border-b border-slate-50 dark:border-slate-700/50 ${s.is_college_stop ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {s.is_college_stop ? <MapPin className="w-4 h-4 text-emerald-500" /> : <MapPin className="w-4 h-4 text-slate-400" />}
                        {s.stop_name}
                        {s.is_college_stop && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Destination</Badge>}
                      </td>
                      <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300">{formatTime(s.arrival_time || '')}</td>
                      <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300">{s.departure_time ? formatTime(s.departure_time) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Return Journey & Special Events" icon={<Calendar className="w-5 h-5" />} />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Start Time</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatTime(bus?.start_time || '')}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Return Time</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatTime(bus?.return_time || '')}</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-xs text-amber-600 dark:text-amber-400">Special Event</p>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">No special events scheduled</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'timing' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Historical Timing & Variation" subtitle="Today vs Yesterday comparison" icon={<Clock className="w-5 h-5" />} />
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="text-left px-5 py-3 font-medium">Stop</th>
                    <th className="text-center px-5 py-3 font-medium">Scheduled</th>
                    <th className="text-center px-5 py-3 font-medium">Today</th>
                    <th className="text-center px-5 py-3 font-medium">Yesterday</th>
                    <th className="text-center px-5 py-3 font-medium">Variation</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTiming.map(t => {
                    const yest = yesterdayTiming.find(y => y.stop_name === t.stop_name);
                    return (
                      <tr key={t.id} className="border-b border-slate-50 dark:border-slate-700/50">
                        <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{t.stop_name}</td>
                        <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300">{formatTime(t.scheduled_arrival || '')}</td>
                        <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300">{formatTime(t.actual_arrival || '')}</td>
                        <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300">{yest ? formatTime(yest.actual_arrival || '') : '—'}</td>
                        <td className="px-5 py-3 text-center">
                          <Badge className={t.variation_minutes > 0 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}>
                            {t.variation_minutes > 0 ? '+' : ''}{t.variation_minutes} min
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Today's Variation by Stop" icon={<TrendingUp className="w-5 h-5" />} />
              <CardBody>
                <BarChart
                  data={todayTiming.map(t => ({ label: t.stop_name.split(' ')[0], value: t.variation_minutes }))}
                  color="orange"
                  valueFormat={(v) => `${v}m`}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Recommendations" icon={<Info className="w-5 h-5" />} />
              <CardBody className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {avgVariation > 0
                      ? `Bus is running ${avgVariation.toFixed(0)} minutes late on average. Students travelling from this route are advised to arrive 5-10 minutes earlier than scheduled.`
                      : 'Bus is running on time. No action needed.'}
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Navigation className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">Typical travel duration from start to college is approximately 80 minutes.</p>
                </div>
                <p className="text-xs text-slate-400 italic">AI recommendations are advisory and should not replace official decisions.</p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {!loading && activeSection === 'alerts' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Transport Alerts" subtitle={`${activeAlerts.length} active alerts`} icon={<AlertTriangle className="w-5 h-5" />} />
            <CardBody className="space-y-3">
              {alerts.map(a => (
                <div key={a.id} className={`p-4 rounded-lg border ${
                  a.severity === 'Emergency' ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  : a.severity === 'High Priority' ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20'
                  : a.severity === 'Warning' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'
                } ${a.resolved ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-5 h-5 ${a.severity === 'Emergency' ? 'text-red-500' : a.severity === 'Warning' ? 'text-amber-500' : 'text-slate-400'}`} />
                      <Badge className={ALERT_SEVERITY_COLORS[a.severity] || ''}>{a.severity}</Badge>
                      {a.resolved && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Resolved</Badge>}
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.message}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    {a.current_location && <div><span className="text-slate-400">Location:</span> <span className="text-slate-600 dark:text-slate-300">{a.current_location}</span></div>}
                    {a.reason && <div><span className="text-slate-400">Reason:</span> <span className="text-slate-600 dark:text-slate-300">{a.reason}</span></div>}
                    {a.expected_recovery && <div><span className="text-slate-400">Recovery:</span> <span className="text-slate-600 dark:text-slate-300">{formatTime(a.expected_recovery)}</span></div>}
                    {a.revised_arrival && <div><span className="text-slate-400">Revised Arrival:</span> <span className="text-slate-600 dark:text-slate-300">{formatTime(a.revised_arrival)}</span></div>}
                    {a.alternative_bus && <div><span className="text-slate-400">Alternative Bus:</span> <span className="text-slate-600 dark:text-slate-300">{a.alternative_bus}</span></div>}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-center text-slate-400 py-8">No alerts</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'notifications' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="All Notifications" subtitle={`${notifications.length} total, ${unreadNotifs} unread`} icon={<Bell className="w-5 h-5" />} />
            <CardBody className="space-y-2">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    n.is_read ? 'border-slate-100 dark:border-slate-700' : 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                  } hover:bg-slate-50 dark:hover:bg-slate-700/30`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.priority === 'High' ? 'bg-red-500' : n.priority === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
              {notifications.length === 0 && <p className="text-center text-slate-400 py-8">No notifications</p>}
            </CardBody>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
