import { useState, useEffect, useCallback } from 'react';
import {
  Bus as BusIcon, AlertTriangle, Wrench, FileText, Bell,
  Home, Plus, X, CheckCircle, Clock, Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, NavItem } from '@/components/ui/DashboardLayout';
import { Card, CardHeader, CardBody, StatCard, Badge } from '@/components/ui/Card';
import {
  DRIVER_ISSUE_TYPES, DRIVER_EMERGENCY_TYPES, DRIVER_COMPLAINT_STATUS_FLOW,
  DRIVER_COMPLAINT_STATUS_COLORS, formatDateTime,
} from '@/lib/constants';
import type { Bus, DriverComplaint, Notification } from '@/lib/types';

export function DriverDashboard() {
  const { driver, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [bus, setBus] = useState<Bus | null>(null);
  const [complaints, setComplaints] = useState<DriverComplaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!driver) return;
    setLoading(true);

    const { data: busData } = await supabase.from('buses').select('*').eq('id', driver.bus_id).maybeSingle();
    setBus(busData as Bus | null);

    const { data: compData } = await supabase
      .from('driver_complaints')
      .select('*')
      .eq('driver_id', driver.id)
      .order('created_at', { ascending: false });
    setComplaints(compData as DriverComplaint[] || []);

    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_type', 'driver')
      .order('created_at', { ascending: false });
    setNotifications(notifData as Notification[] || []);

    setLoading(false);
  }, [driver]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  if (!driver) return null;

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const activeComplaints = complaints.filter(c => c.status !== 'Closed' && c.status !== 'Resolved');
  const emergencyComplaints = complaints.filter(c => c.is_emergency && c.status !== 'Closed' && c.status !== 'Resolved');

  const navItems: NavItem[] = [
    { label: 'Overview', icon: <Home className="w-5 h-5" />, key: 'overview' },
    { label: 'Report Issue', icon: <Plus className="w-5 h-5" />, key: 'report' },
    { label: 'My Complaints', icon: <FileText className="w-5 h-5" />, key: 'complaints', badge: activeComplaints.length },
    { label: 'Notifications', icon: <Bell className="w-5 h-5" />, key: 'notifications', badge: unreadNotifs },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      activeKey={activeSection}
      onNavigate={setActiveSection}
      title="Driver Portal"
      subtitle={`Driver: ${driver.name} • Bus ${bus?.bus_number || 'N/A'}`}
      notifications={notifications}
      onMarkNotificationRead={markNotificationRead}
    >
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && activeSection === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Assigned Bus" value={bus?.bus_number || 'N/A'} icon={<BusIcon className="w-6 h-6" />} color="amber" />
            <StatCard label="Route" value={bus?.route_name || 'N/A'} icon={<BusIcon className="w-6 h-6" />} color="blue" />
            <StatCard label="Active Complaints" value={activeComplaints.length} icon={<FileText className="w-6 h-6" />} color="red" />
            <StatCard label="Emergency Issues" value={emergencyComplaints.length} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Bus Information" icon={<BusIcon className="w-5 h-5" />} />
              <CardBody>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Bus Number</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.bus_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Route</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.route_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Capacity</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.capacity} seats</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Start Time</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{bus?.start_time || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Driver License</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{driver.license_number}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent Complaints" icon={<FileText className="w-5 h-5" />} action={
                <button onClick={() => setActiveSection('complaints')} className="text-sm text-amber-600 hover:underline">View all</button>
              } />
              <CardBody className="space-y-3">
                {complaints.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{c.issue_type}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(c.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.is_emergency && <Badge className="bg-red-100 text-red-700 border-red-300">Emergency</Badge>}
                      <Badge className={DRIVER_COMPLAINT_STATUS_COLORS[c.status] || ''}>{c.status}</Badge>
                    </div>
                  </div>
                ))}
                {complaints.length === 0 && <p className="text-center text-slate-400 py-4">No complaints filed</p>}
              </CardBody>
            </Card>
          </div>

          <button
            onClick={() => setShowComplaintModal(true)}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Report Bus Issue / Complaint
          </button>
        </div>
      )}

      {!loading && activeSection === 'report' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Report Bus Issue / Complaint" subtitle={`Bus ${bus?.bus_number || 'N/A'}`} icon={<AlertTriangle className="w-5 h-5" />} />
            <CardBody>
              <DriverComplaintForm
                driverId={driver.id}
                busId={driver.bus_id}
                busNumber={bus?.bus_number || ''}
                onSubmitted={() => { loadData(); setActiveSection('complaints'); }}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'complaints' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">My Complaints</h2>
            <button
              onClick={() => setShowComplaintModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Complaint
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {DRIVER_COMPLAINT_STATUS_FLOW.map(status => {
              const count = complaints.filter(c => c.status === status).length;
              return (
                <Card key={status} className="p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{status}</p>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader title="Complaint History" subtitle={`${complaints.length} total`} icon={<FileText className="w-5 h-5" />} />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="text-left px-5 py-3 font-medium">Issue Type</th>
                      <th className="text-left px-5 py-3 font-medium">Description</th>
                      <th className="text-center px-5 py-3 font-medium">Emergency</th>
                      <th className="text-left px-5 py-3 font-medium">Date</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                      <th className="text-left px-5 py-3 font-medium">Staff Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{c.issue_type}</td>
                        <td className="px-5 py-3 max-w-xs"><p className="text-slate-600 dark:text-slate-300 truncate">{c.description}</p></td>
                        <td className="px-5 py-3 text-center">
                          {c.is_emergency ? <Badge className="bg-red-100 text-red-700 border-red-300">Yes</Badge> : <span className="text-slate-400 text-xs">No</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(c.created_at)}</td>
                        <td className="px-5 py-3"><Badge className={DRIVER_COMPLAINT_STATUS_COLORS[c.status] || ''}>{c.status}</Badge></td>
                        <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-300">{c.staff_remarks || '—'}</td>
                      </tr>
                    ))}
                    {complaints.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No complaints filed yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'notifications' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Notifications" subtitle={`${notifications.length} total, ${unreadNotifs} unread`} icon={<Bell className="w-5 h-5" />} />
            <CardBody className="space-y-2">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    n.is_read ? 'border-slate-100 dark:border-slate-700' : 'border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                  } hover:bg-slate-50 dark:hover:bg-slate-700/30`}
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

      {showComplaintModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowComplaintModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Report Bus Issue</h3>
              <button onClick={() => setShowComplaintModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <DriverComplaintForm
                driverId={driver.id}
                busId={driver.bus_id}
                busNumber={bus?.bus_number || ''}
                onSubmitted={() => { setShowComplaintModal(false); loadData(); }}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function DriverComplaintForm({ driverId, busId, busNumber, onSubmitted }: {
  driverId: string;
  busId: string;
  busNumber: string;
  onSubmitted: () => void;
}) {
  const [issueType, setIssueType] = useState('');
  const [customIssue, setCustomIssue] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isEmergency = DRIVER_EMERGENCY_TYPES.includes(issueType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueType) return;
    setSubmitting(true);

    const finalIssueType = issueType === 'Other' && customIssue ? customIssue : issueType;
    const finalIsEmergency = DRIVER_EMERGENCY_TYPES.includes(issueType) || (issueType === 'Other' && /accident|emergency|breakdown|brake/i.test(customIssue));

    await supabase.from('driver_complaints').insert({
      driver_id: driverId,
      bus_id: busId,
      issue_type: finalIssueType,
      description,
      is_emergency: finalIsEmergency,
      status: 'Submitted',
    });

    // Create staff notification
    await supabase.from('notifications').insert({
      target_type: 'staff',
      title: finalIsEmergency ? 'EMERGENCY: Driver Bus Complaint' : 'New Driver Bus Complaint',
      message: `Bus ${busNumber} - ${finalIssueType}: ${description}`,
      category: 'Driver Complaint',
      priority: finalIsEmergency ? 'High' : 'Normal',
    });

    // Create bus-specific student notifications
    const { data: busStudents } = await supabase.from('students').select('id').eq('bus_id', busId);
    if (busStudents) {
      for (const s of busStudents) {
        await supabase.from('notifications').insert({
          target_type: 'student',
          target_id: s.id,
          related_bus_id: busId,
          title: finalIsEmergency ? 'EMERGENCY: Bus Issue Reported' : 'Bus Issue Reported',
          message: `Bus ${busNumber} - ${finalIssueType}. ${finalIsEmergency ? 'Please wait for further transport instructions.' : 'Your bus has reported an issue. Updates will follow.'}`,
          category: 'Transport',
          priority: finalIsEmergency ? 'High' : 'Warning',
        });
      }
    }

    setSubmitting(false);
    setSuccess(true);
    setTimeout(onSubmitted, 1500);
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <p className="font-medium text-slate-800 dark:text-slate-100">Complaint Submitted Successfully</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Transport staff and affected students have been notified.</p>
      </div>
    );
  }

  const issueIcons: Record<string, React.ReactNode> = {
    'Puncture': <Wrench className="w-4 h-4" />,
    'Bus Breakdown': <AlertTriangle className="w-4 h-4" />,
    'Engine Problem': <Wrench className="w-4 h-4" />,
    'Brake Problem': <AlertTriangle className="w-4 h-4" />,
    'Tyre Problem': <Wrench className="w-4 h-4" />,
    'Electrical Problem': <AlertTriangle className="w-4 h-4" />,
    'Accident / Emergency': <AlertTriangle className="w-4 h-4" />,
    'Route Problem': <BusIcon className="w-4 h-4" />,
    'Other': <FileText className="w-4 h-4" />,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <p className="text-xs text-slate-500 dark:text-slate-400">Bus Number</p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{busNumber}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Issue Type</label>
        <div className="grid grid-cols-3 gap-2">
          {DRIVER_ISSUE_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => { setIssueType(type); setCustomIssue(''); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs border transition-all ${
                issueType === type
                  ? DRIVER_EMERGENCY_TYPES.includes(type)
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                    : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              {issueIcons[type]} <span className="truncate">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {issueType === 'Other' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Custom Issue Type</label>
          <input
            type="text"
            value={customIssue}
            onChange={e => setCustomIssue(e.target.value)}
            required
            placeholder="Describe the issue type..."
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Additional Details</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          rows={4}
          placeholder="Describe the problem in detail..."
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
        />
      </div>

      {isEmergency && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-300">Emergency / Urgent Issue</p>
            <p className="text-xs text-red-600 dark:text-red-400">This will be marked as emergency and immediately sent to Transport Staff and affected students.</p>
          </div>
        </div>
      )}

      <button type="submit" disabled={submitting || !issueType} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
        {submitting ? 'Submitting...' : 'Submit Complaint'}
      </button>
    </form>
  );
}
