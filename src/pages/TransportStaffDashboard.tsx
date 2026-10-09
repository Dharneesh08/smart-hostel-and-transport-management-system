import { useState, useEffect, useCallback } from 'react';
import {
  Bus as BusIcon, MapPin, Bell, Route, AlertTriangle, BarChart3,
  Search, Home, Users, Lock, EyeOff, Eye, KeyRound, X,
  Wrench, Clock, Navigation, Info, CheckCircle, FileText, ShipWheel,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, NavItem } from '@/components/ui/DashboardLayout';
import { Card, CardHeader, CardBody, StatCard, Badge } from '@/components/ui/Card';
import { BarChart, DonutChart } from '@/components/ui/Charts';
import {
  ALERT_SEVERITY_COLORS, STATUS_COLORS, formatTime, formatDateTime,
  DRIVER_COMPLAINT_STATUS_FLOW, DRIVER_COMPLAINT_STATUS_COLORS, DRIVER_ISSUE_TYPES,
} from '@/lib/constants';
import type { Bus, BusStop, BusLocation, TransportAlert, Student, Notification, BusTimingHistory, DriverComplaint, Driver } from '@/lib/types';

export function TransportStaffDashboard() {
  const { staff, transportAuthenticated, setTransportAuth, setPortal } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [locations, setLocations] = useState<BusLocation[]>([]);
  const [alerts, setAlerts] = useState<TransportAlert[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [timingHistory, setTimingHistory] = useState<BusTimingHistory[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [driverComplaints, setDriverComplaints] = useState<DriverComplaint[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [complaintFilterBus, setComplaintFilterBus] = useState('all');
  const [complaintFilterIssue, setComplaintFilterIssue] = useState('all');
  const [complaintFilterEmergency, setComplaintFilterEmergency] = useState('all');
  const [complaintFilterStatus, setComplaintFilterStatus] = useState('all');
  const [editingComplaint, setEditingComplaint] = useState<DriverComplaint | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [revealStudentId, setRevealStudentId] = useState<string | null>(null);
  const [pinModal, setPinModal] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [notifyModal, setNotifyModal] = useState<{ busId: string } | null>(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: busesData } = await supabase.from('buses').select('*').order('bus_number');
    setBuses(busesData as Bus[] || []);

    const { data: stopsData } = await supabase.from('bus_stops').select('*').order('bus_id, stop_order');
    setStops(stopsData as BusStop[] || []);

    const { data: locData } = await supabase.from('bus_locations').select('*');
    setLocations(locData as BusLocation[] || []);

    const { data: alertsData } = await supabase.from('transport_alerts').select('*').order('created_at', { ascending: false });
    setAlerts(alertsData as TransportAlert[] || []);

    const { data: studentsData } = await supabase.from('students').select('*');
    setStudents(studentsData as Student[] || []);

    const { data: timingData } = await supabase.from('bus_timing_history').select('*').order('record_date', { ascending: false });
    setTimingHistory(timingData as BusTimingHistory[] || []);

    const { data: notifs } = await supabase.from('notifications').select('*').eq('target_type', 'staff').order('created_at', { ascending: false });
    setNotifications(notifs as Notification[] || []);

    const { data: compData } = await supabase.from('driver_complaints').select('*').order('created_at', { ascending: false });
    setDriverComplaints(compData as DriverComplaint[] || []);

    const { data: driverData } = await supabase.from('drivers').select('*');
    setDrivers(driverData as Driver[] || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (transportAuthenticated) loadData();
  }, [transportAuthenticated, loadData]);

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const verifyPin = () => {
    if (pinInput !== staff?.pin) { setPinError('Invalid PIN. Access denied.'); return; }
    if (pinModal) {
      // Log the access
      supabase.from('audit_logs').insert({
        staff_id: staff?.id,
        action: 'VIEW_STUDENT_CONTACT',
        resource_type: 'bus',
        resource_id: pinModal,
        details: `Staff ${staff?.name} viewed student contact details for bus ${pinModal}`,
      });
      setRevealStudentId(pinModal);
    }
    setPinModal(null);
    setPinInput('');
    setPinError('');
  };

  const sendNotification = async () => {
    if (!notifyModal || !notifyMessage) return;
    const busStudents = students.filter(s => s.bus_id === notifyModal.busId);
    for (const s of busStudents) {
      await supabase.from('notifications').insert({
        target_type: 'student',
        target_id: s.id,
        title: 'Transport Emergency Notification',
        message: notifyMessage,
        category: 'Transport',
        priority: 'High',
      });
    }
    setNotifyModal(null);
    setNotifyMessage('');
    loadData();
  };

  if (!transportAuthenticated) return null;

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const activeBuses = buses.filter(b => b.status === 'Active').length;
  const inactiveBuses = buses.filter(b => b.status !== 'Active').length;
  const activeAlerts = alerts.filter(a => !a.resolved);

  const navItems: NavItem[] = [
    { label: 'Overview', icon: <Home className="w-5 h-5" />, key: 'overview' },
    { label: 'Bus Management', icon: <BusIcon className="w-5 h-5" />, key: 'buses' },
    { label: 'Routes', icon: <Route className="w-5 h-5" />, key: 'routes' },
    { label: 'Alerts', icon: <AlertTriangle className="w-5 h-5" />, key: 'alerts', badge: activeAlerts.length },
    { label: 'Students', icon: <Users className="w-5 h-5" />, key: 'students' },
    { label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, key: 'analytics' },
    { label: 'Driver Complaints', icon: <ShipWheel className="w-5 h-5" />, key: 'driver-complaints', badge: driverComplaints.filter(c => c.is_emergency && c.status !== 'Closed' && c.status !== 'Resolved').length },
    { label: 'Notifications', icon: <Bell className="w-5 h-5" />, key: 'notifications', badge: unreadNotifs },
  ];

  const filteredBuses = buses.filter(b => {
    if (!searchQuery) return true;
    return b.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.route_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredDriverComplaints = driverComplaints.filter(c => {
    if (complaintFilterBus !== 'all' && c.bus_id !== complaintFilterBus) return false;
    if (complaintFilterIssue !== 'all' && c.issue_type !== complaintFilterIssue) return false;
    if (complaintFilterEmergency === 'yes' && !c.is_emergency) return false;
    if (complaintFilterEmergency === 'no' && c.is_emergency) return false;
    if (complaintFilterStatus !== 'all' && c.status !== complaintFilterStatus) return false;
    return true;
  });

  // Analytics data
  const todayTiming = timingHistory.filter(t => t.record_date === new Date().toISOString().split('T')[0]);
  const avgDelay = todayTiming.length > 0 ? todayTiming.reduce((s, t) => s + t.variation_minutes, 0) / todayTiming.length : 0;
  const frequentlyDelayedStops = todayTiming.filter(t => t.variation_minutes > 3).sort((a, b) => b.variation_minutes - a.variation_minutes);

  return (
    <DashboardLayout
      navItems={navItems}
      activeKey={activeSection}
      onNavigate={setActiveSection}
      title="Transport Admin"
      subtitle={`Staff: ${staff?.name} • Transport Management`}
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
            <StatCard label="Total Buses" value={buses.length} icon={<BusIcon className="w-6 h-6" />} color="blue" />
            <StatCard label="Active Buses" value={activeBuses} icon={<CheckCircle className="w-6 h-6" />} color="green" />
            <StatCard label="Inactive" value={inactiveBuses} icon={<Wrench className="w-6 h-6" />} color="amber" />
            <StatCard label="Active Alerts" value={activeAlerts.length} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Students" value={students.length} icon={<Users className="w-6 h-6" />} color="purple" />
            <StatCard label="Avg Delay Today" value={`${avgDelay > 0 ? '+' : ''}${avgDelay.toFixed(0)} min`} icon={<Clock className="w-6 h-6" />} color={avgDelay > 0 ? 'red' : 'green'} />
            <StatCard label="Routes" value={new Set(buses.map(b => b.route_name)).size} icon={<Route className="w-5 h-5" />} color="blue" />
            <StatCard label="Unread Alerts" value={unreadNotifs} icon={<Bell className="w-6 h-6" />} color="orange" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Bus Fleet Status" icon={<BusIcon className="w-5 h-5" />} />
              <CardBody className="space-y-3">
                {buses.map(bus => {
                  const loc = locations.find(l => l.bus_id === bus.id);
                  const busAlerts = alerts.filter(a => a.bus_id === bus.id && !a.resolved);
                  return (
                    <div key={bus.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${bus.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
                          <BusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{bus.bus_number}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{bus.route_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {busAlerts.length > 0 && <Badge className="bg-red-100 text-red-700 border-red-300">{busAlerts.length} alert(s)</Badge>}
                        <Badge className={bus.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'}>{bus.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Active Emergency Alerts" icon={<AlertTriangle className="w-5 h-5" />} />
              <CardBody className="space-y-3">
                {activeAlerts.map(a => {
                  const bus = buses.find(b => b.id === a.bus_id);
                  return (
                    <div key={a.id} className={`p-3 rounded-lg border ${
                      a.severity === 'Emergency' ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                      : a.severity === 'Warning' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-slate-200 dark:border-slate-600'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={ALERT_SEVERITY_COLORS[a.severity] || ''}>{a.severity}</Badge>
                        <span className="text-xs text-slate-400">{bus?.bus_number}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{a.message}</p>
                    </div>
                  );
                })}
                {activeAlerts.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">No active emergencies.</span>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {!loading && activeSection === 'buses' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by bus number or route..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBuses.map(bus => {
              const loc = locations.find(l => l.bus_id === bus.id);
              const busStudents = students.filter(s => s.bus_id === bus.id);
              const busAlerts = alerts.filter(a => a.bus_id === bus.id && !a.resolved);
              return (
                <Card key={bus.id} className={`overflow-hidden ${selectedBus?.id === bus.id ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className={`px-5 py-3 ${bus.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BusIcon className={`w-5 h-5 ${bus.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <span className="font-bold text-slate-800 dark:text-slate-100">{bus.bus_number}</span>
                      </div>
                      <Badge className={bus.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-100 text-amber-700 border-amber-300'}>{bus.status}</Badge>
                    </div>
                  </div>
                  <CardBody className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-400">Route</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{bus.route_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Current Location</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{loc?.current_stop || 'N/A'}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Students: <span className="font-medium text-slate-700 dark:text-slate-200">{busStudents.length}</span></span>
                      <span className="text-slate-500 dark:text-slate-400">Driver: <span className="font-medium text-slate-700 dark:text-slate-200">{bus.driver_name}</span></span>
                    </div>
                    {busAlerts.length > 0 && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> {busAlerts.length} active alert(s)
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setSelectedBus(bus)} className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600">View Details</button>
                      <button onClick={() => setNotifyModal({ busId: bus.id })} className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">Notify Students</button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {selectedBus && (
            <Card>
              <CardHeader
                title={`Bus ${selectedBus.bus_number} Details`}
                subtitle={selectedBus.route_name}
                icon={<BusIcon className="w-5 h-5" />}
                action={<button onClick={() => setSelectedBus(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>}
              />
              <CardBody>
                {(() => {
                  const busStops = stops.filter(s => s.bus_id === selectedBus.id);
                  const loc = locations.find(l => l.bus_id === selectedBus.id);
                  const busStudents = students.filter(s => s.bus_id === selectedBus.id);
                  const busAlerts = alerts.filter(a => a.bus_id === selectedBus.id);
                  const busTiming = timingHistory.filter(t => t.bus_id === selectedBus.id);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{loc?.status || selectedBus.status}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Speed</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{loc?.speed_kmh || 0} km/h</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Students</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{busStudents.length}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Alerts</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{busAlerts.length}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Route Stops</p>
                        <div className="flex items-center gap-1 overflow-x-auto pb-2">
                          {busStops.map((stop, i) => (
                            <div key={stop.id} className="flex items-center flex-shrink-0">
                              <div className="flex flex-col items-center gap-1">
                                <div className={`w-3 h-3 rounded-full ${stop.stop_name === loc?.current_stop ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                <span className="text-[10px] text-slate-500 max-w-[70px] text-center">{stop.stop_name}</span>
                              </div>
                              {i < busStops.length - 1 && <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-600 mx-1" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {!loading && activeSection === 'routes' && (
        <div className="space-y-6 animate-fadeIn">
          {buses.map(bus => {
            const busStops = stops.filter(s => s.bus_id === bus.id).sort((a, b) => a.stop_order - b.stop_order);
            return (
              <Card key={bus.id}>
                <CardHeader title={bus.route_name} subtitle={bus.bus_number} icon={<Route className="w-5 h-5" />} />
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
                      {busStops.map(s => (
                        <tr key={s.id} className={`border-b border-slate-50 dark:border-slate-700/50 ${s.is_college_stop ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
                          <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-200">{s.stop_name}{s.is_college_stop && ' (College)'}</td>
                          <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300">{formatTime(s.arrival_time || '')}</td>
                          <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300">{s.departure_time ? formatTime(s.departure_time) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && activeSection === 'alerts' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="All Transport Alerts" subtitle={`${alerts.length} total, ${activeAlerts.length} active`} icon={<AlertTriangle className="w-5 h-5" />} />
            <CardBody className="space-y-3">
              {alerts.map(a => {
                const bus = buses.find(b => b.id === a.bus_id);
                return (
                  <div key={a.id} className={`p-4 rounded-lg border ${a.resolved ? 'opacity-60' : ''} ${
                    a.severity === 'Emergency' ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                    : a.severity === 'Warning' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-slate-200 dark:border-slate-600'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={ALERT_SEVERITY_COLORS[a.severity] || ''}>{a.severity}</Badge>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{bus?.bus_number}</span>
                        {a.resolved && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Resolved</Badge>}
                      </div>
                      <span className="text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{a.message}</p>
                    {a.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reason: {a.reason}</p>}
                    {!a.resolved && (
                      <button
                        onClick={async () => {
                          await supabase.from('transport_alerts').update({ resolved: true }).eq('id', a.id);
                          loadData();
                        }}
                        className="mt-2 px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                );
              })}
              {alerts.length === 0 && <p className="text-center text-slate-400 py-8">No alerts</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'students' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Bus-wise Student Information" subtitle="Privacy-protected: contact details hidden by default" icon={<Users className="w-5 h-5" />} />
            <CardBody>
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Student phone numbers and parent contacts are protected. Use "Reveal Contacts" with PIN to view.
              </div>
            </CardBody>
          </Card>

          {buses.map(bus => {
            const busStudents = students.filter(s => s.bus_id === bus.id);
            if (busStudents.length === 0) return null;
            const isRevealed = revealStudentId === bus.id;
            return (
              <Card key={bus.id}>
                <CardHeader
                  title={`Bus ${bus.bus_number}`}
                  subtitle={`${bus.route_name} • ${busStudents.length} students`}
                  icon={<BusIcon className="w-5 h-5" />}
                  action={
                    isRevealed ? (
                      <button onClick={() => setRevealStudentId(null)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                        <EyeOff className="w-4 h-4" /> Hide
                      </button>
                    ) : (
                      <button onClick={() => setPinModal(bus.id)} className="flex items-center gap-1 text-sm text-emerald-600 hover:underline">
                        <Lock className="w-4 h-4" /> Reveal Contacts
                      </button>
                    )
                  }
                />
                <CardBody className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <th className="text-left px-5 py-3 font-medium">Boarding Stop</th>
                        <th className="text-left px-5 py-3 font-medium">Destination</th>
                        <th className="text-left px-5 py-3 font-medium">Student Name</th>
                        <th className="text-left px-5 py-3 font-medium">Phone</th>
                        <th className="text-left px-5 py-3 font-medium">Parent Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {busStudents.map(s => (
                        <tr key={s.id} className="border-b border-slate-50 dark:border-slate-700/50">
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.boarding_stop || '—'}</td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">College</td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{isRevealed ? s.name : '— Protected —'}</td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{isRevealed ? s.phone : '— Protected —'}</td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{isRevealed ? `${s.parent_name}: ${s.parent_phone}` : '— Protected —'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && activeSection === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Avg Delay" value={`${avgDelay > 0 ? '+' : ''}${avgDelay.toFixed(0)} min`} icon={<Clock className="w-6 h-6" />} color={avgDelay > 0 ? 'red' : 'green'} />
            <StatCard label="On-time Buses" value={buses.filter(b => { const loc = locations.find(l => l.bus_id === b.id); return loc?.status === 'On Time'; }).length} icon={<CheckCircle className="w-6 h-6" />} color="green" />
            <StatCard label="Delayed Buses" value={buses.filter(b => { const loc = locations.find(l => l.bus_id === b.id); return loc?.status === 'Delayed'; }).length} icon={<AlertTriangle className="w-6 h-6" />} color="orange" />
            <StatCard label="Total Incidents" value={alerts.length} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Delay by Stop (Today)" icon={<BarChart3 className="w-5 h-5" />} />
              <CardBody>
                {todayTiming.length > 0 ? (
                  <BarChart data={todayTiming.map(t => ({ label: t.stop_name.split(' ')[0], value: t.variation_minutes }))} color="orange" valueFormat={(v) => `${v}m`} />
                ) : <p className="text-center text-slate-400 py-8">No data</p>}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Bus Utilization" icon={<BusIcon className="w-5 h-5" />} />
              <CardBody>
                <DonutChart data={buses.map((bus, i) => ({
                  label: bus.bus_number,
                  value: students.filter(s => s.bus_id === bus.id).length,
                  color: ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#6366f1'][i % 5],
                })).filter(d => d.value > 0)} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Smart Recommendations" icon={<Info className="w-5 h-5" />} />
            <CardBody className="space-y-3">
              {[
                { text: avgDelay > 5 ? `Average delay is ${avgDelay.toFixed(0)} minutes. Consider adjusting departure time 10 minutes earlier.` : 'Buses are running on schedule.', type: avgDelay > 5 ? 'warning' : 'success' },
                { text: frequentlyDelayedStops.length > 0 ? `Stop "${frequentlyDelayedStops[0].stop_name}" is frequently delayed by ${frequentlyDelayedStops[0].variation_minutes} minutes. Consider route optimization.` : 'No frequently delayed stops detected.', type: frequentlyDelayedStops.length > 0 ? 'warning' : 'success' },
                { text: 'Bus TN-28-3456 is under maintenance. Ensure backup bus is available for affected students.', type: 'info' },
              ].map((rec, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                  rec.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  : rec.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                }`}>
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{rec.text}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 italic pt-2">AI recommendations are advisory and should not replace official staff decisions.</p>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'driver-complaints' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Complaints" value={driverComplaints.length} icon={<FileText className="w-6 h-6" />} color="blue" />
            <StatCard label="Emergency" value={driverComplaints.filter(c => c.is_emergency).length} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
            <StatCard label="Active" value={driverComplaints.filter(c => c.status !== 'Closed' && c.status !== 'Resolved').length} icon={<Wrench className="w-6 h-6" />} color="amber" />
            <StatCard label="Resolved" value={driverComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length} icon={<CheckCircle className="w-6 h-6" />} color="green" />
          </div>

          <Card>
            <CardHeader title="Filter Complaints" icon={<Search className="w-5 h-5" />} />
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Bus</label>
                  <select value={complaintFilterBus} onChange={e => setComplaintFilterBus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="all">All Buses</option>
                    {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Issue Type</label>
                  <select value={complaintFilterIssue} onChange={e => setComplaintFilterIssue(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="all">All Issues</option>
                    {DRIVER_ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Emergency</label>
                  <select value={complaintFilterEmergency} onChange={e => setComplaintFilterEmergency(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="all">All</option>
                    <option value="yes">Emergency Only</option>
                    <option value="no">Non-Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                  <select value={complaintFilterStatus} onChange={e => setComplaintFilterStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="all">All Statuses</option>
                    {DRIVER_COMPLAINT_STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Driver Complaints" subtitle={`${filteredDriverComplaints.length} complaints`} icon={<ShipWheel className="w-5 h-5" />} />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="text-left px-5 py-3 font-medium">Bus</th>
                      <th className="text-left px-5 py-3 font-medium">Driver</th>
                      <th className="text-left px-5 py-3 font-medium">Issue</th>
                      <th className="text-left px-5 py-3 font-medium max-w-xs">Description</th>
                      <th className="text-center px-5 py-3 font-medium">Emergency</th>
                      <th className="text-left px-5 py-3 font-medium">Date</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                      <th className="text-center px-5 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDriverComplaints.map(c => {
                      const bus = buses.find(b => b.id === c.bus_id);
                      const drv = drivers.find(d => d.id === c.driver_id);
                      return (
                        <tr key={c.id} className={`border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${c.is_emergency ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                          <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{bus?.bus_number || 'N/A'}</td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{drv?.name || 'N/A'}</td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{c.issue_type}</td>
                          <td className="px-5 py-3 max-w-xs"><p className="text-slate-600 dark:text-slate-300 truncate">{c.description}</p></td>
                          <td className="px-5 py-3 text-center">
                            {c.is_emergency ? <Badge className="bg-red-100 text-red-700 border-red-300">Yes</Badge> : <span className="text-slate-400 text-xs">No</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(c.created_at)}</td>
                          <td className="px-5 py-3"><Badge className={DRIVER_COMPLAINT_STATUS_COLORS[c.status] || ''}>{c.status}</Badge></td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={() => { setEditingComplaint(c); setEditStatus(c.status); setEditRemarks(c.staff_remarks || ''); }} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Update</button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredDriverComplaints.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-slate-400">No complaints match the filters</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {editingComplaint && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingComplaint(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Update Complaint Status</h3>
              <button onClick={() => setEditingComplaint(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            {editingComplaint.is_emergency && (
              <div className="flex items-center gap-2 p-2 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-700 dark:text-red-300 font-medium">Emergency Complaint</span>
              </div>
            )}
            <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400">Issue: {editingComplaint.issue_type}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{editingComplaint.description}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none">
                  {DRIVER_COMPLAINT_STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Staff Remarks</label>
                <textarea value={editRemarks} onChange={e => setEditRemarks(e.target.value)} rows={3} placeholder="Add remarks for the driver..." className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingComplaint(null)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={async () => {
                await supabase.from('driver_complaints').update({ status: editStatus, staff_remarks: editRemarks || null, updated_at: new Date().toISOString() }).eq('id', editingComplaint.id);
                setEditingComplaint(null);
                loadData();
              }} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">Save Update</button>
            </div>
          </div>
        </div>
      )}

      {!loading && activeSection === 'notifications' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Staff Notifications" subtitle={`${notifications.length} total, ${unreadNotifs} unread`} icon={<Bell className="w-5 h-5" />} />
            <CardBody className="space-y-2">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`w-full text-left p-4 rounded-lg border ${n.is_read ? 'border-slate-100 dark:border-slate-700' : 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'} hover:bg-slate-50 dark:hover:bg-slate-700/30`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.priority === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
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

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPinModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg"><KeyRound className="w-6 h-6 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Security Verification</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Enter PIN to reveal student contacts</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">This action will be logged in the audit trail.</p>
            <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyPin()} placeholder="Enter 4-digit PIN" maxLength={4} autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none text-center text-2xl tracking-widest font-mono" />
            {pinError && <p className="text-sm text-red-600 mt-2">{pinError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPinModal(null)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={verifyPin} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Verify</button>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">Demo PIN: 4821</p>
          </div>
        </div>
      )}

      {/* Notify Students Modal */}
      {notifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNotifyModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Notify Students & Parents</h3>
              <button onClick={() => setNotifyModal(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">This will send an emergency notification to all students assigned to this bus.</p>
            <textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)} rows={4} placeholder="Enter emergency message..." className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setNotifyModal(null)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={sendNotification} disabled={!notifyMessage} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Send Notification</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
