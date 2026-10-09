import { useState, useEffect, useCallback } from 'react';
import {
  Building2, FileText, Zap, BarChart3, Bell, Search,
  ShieldCheck, Lock, Eye, EyeOff, Home, Receipt,
  AlertTriangle, Wrench, Utensils, Wifi, Droplets, Package, X, KeyRound,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, NavItem } from '@/components/ui/DashboardLayout';
import { Card, CardHeader, CardBody, StatCard, Badge, StatusDot } from '@/components/ui/Card';
import { BarChart, LineChart, DonutChart, ProgressBar } from '@/components/ui/Charts';
import {
  COMPLAINT_STATUS_COLORS, PRIORITY_COLORS, COMPLAINT_STATUS_FLOW,
  formatINR, formatDateTime,
} from '@/lib/constants';
import type { Room, Complaint, Student, Bill, ElectricityReading, Notification, Hostel, AuditLog } from '@/lib/types';

export function HostelStaffDashboard() {
  const { staff, hostelAuthenticated, setHostelAuth, setPortal } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [electricityData, setElectricityData] = useState<ElectricityReading[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [revealStudentId, setRevealStudentId] = useState<string | null>(null);
  const [pinModal, setPinModal] = useState<{ complaintId: string; studentId: string } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: roomsData } = await supabase.from('rooms').select('*');
    setRooms(roomsData as Room[] || []);

    const { data: complaintsData } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });
    setComplaints(complaintsData as Complaint[] || []);

    const { data: studentsData } = await supabase.from('students').select('*');
    setStudents(studentsData as Student[] || []);

    const { data: billsData } = await supabase.from('bills').select('*');
    setBills(billsData as Bill[] || []);

    const { data: elecData } = await supabase
      .from('electricity_readings')
      .select('*')
      .order('reading_date', { ascending: true });
    setElectricityData(elecData as ElectricityReading[] || []);

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_type', 'staff')
      .order('created_at', { ascending: false });
    setNotifications(notifs as Notification[] || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (hostelAuthenticated) loadData();
  }, [hostelAuthenticated, loadData]);

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleRevealStudent = async (complaintId: string, studentId: string) => {
    setPinModal({ complaintId, studentId });
    setPinInput('');
    setPinError('');
  };

  const verifyPin = async () => {
    if (!pinModal || !staff) return;
    if (pinInput !== staff.pin) {
      setPinError('Invalid PIN. Access denied.');
      return;
    }

    // Log the access
    await supabase.from('audit_logs').insert({
      staff_id: staff.id,
      action: 'VIEW_STUDENT_DETAILS',
      resource_type: 'complaint',
      resource_id: pinModal.complaintId,
      details: `Staff ${staff.name} viewed student details for complaint ${pinModal.complaintId}`,
    });

    setRevealStudentId(pinModal.studentId);
    setPinModal(null);
  };

  const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    await supabase
      .from('complaints')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', complaintId);

    await supabase.from('complaint_status_log').insert({
      complaint_id: complaintId,
      old_status: complaint.status,
      new_status: newStatus,
      changed_by: staff?.name || 'Staff',
    });

    // Create notification for student
    await supabase.from('notifications').insert({
      target_type: 'student',
      target_id: complaint.student_id,
      title: 'Complaint Status Updated',
      message: `Your complaint "${complaint.sub_category || complaint.category}" has been moved to ${newStatus}`,
      category: 'Complaint',
      priority: 'Normal',
    });

    loadData();
  };

  if (!hostelAuthenticated) return null;

  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const navItems: NavItem[] = [
    { label: 'Overview', icon: <Home className="w-5 h-5" />, key: 'overview' },
    { label: 'Rooms', icon: <Building2 className="w-5 h-5" />, key: 'rooms' },
    { label: 'Complaints', icon: <FileText className="w-5 h-5" />, key: 'complaints', badge: complaints.filter(c => c.status !== 'Resolved').length },
    { label: 'Electricity', icon: <Zap className="w-5 h-5" />, key: 'electricity' },
    { label: 'Bills & Fees', icon: <Receipt className="w-5 h-5" />, key: 'bills' },
    { label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, key: 'analytics' },
    { label: 'Notifications', icon: <Bell className="w-5 h-5" />, key: 'notifications', badge: unreadNotifs },
  ];

  // Stats
  const totalRooms = rooms.length;
  const occupiedRooms = new Set(students.map(s => s.room_id)).size;
  const availableRooms = totalRooms - occupiedRooms;
  const pendingComplaints = complaints.filter(c => c.status !== 'Resolved').length;
  const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;
  const totalPendingBills = bills.reduce((sum, b) => sum + (Number(b.amount) - Number(b.paid_amount)), 0);

  // Complaint category counts
  const complaintCategories = complaints.reduce((acc: Record<string, number>, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});

  // Filtered complaints
  const filteredComplaints = complaints.filter(c => {
    if (searchQuery) {
      const room = rooms.find(r => r.id === c.room_id);
      const roomMatch = room?.room_number.toLowerCase().includes(searchQuery.toLowerCase());
      const descMatch = c.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!roomMatch && !descMatch) return false;
    }
    if (filterCategory && c.category !== filterCategory) return false;
    if (filterPriority && c.priority !== filterPriority) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  // Electricity by room
  const electricityByRoom: Record<string, { roomNumber: string; kwh: number; cost: number }> = {};
  electricityData.forEach(r => {
    const room = rooms.find(rm => rm.id === r.room_id);
    if (!room) return;
    if (!electricityByRoom[r.room_id]) {
      electricityByRoom[r.room_id] = { roomNumber: room.room_number, kwh: 0, cost: 0 };
    }
    electricityByRoom[r.room_id].kwh += Number(r.kwh);
    electricityByRoom[r.room_id].cost += Number(r.cost_inr);
  });
  const topConsumingRooms = Object.values(electricityByRoom).sort((a, b) => b.kwh - a.kwh).slice(0, 6);

  // Room-wise info for staff overview
  const roomInfo = rooms.map(room => {
    const roomStudents = students.filter(s => s.room_id === room.id);
    const roomComplaints = complaints.filter(c => c.room_id === room.id);
    const roomBills = bills.filter(b => roomStudents.some(s => s.id === b.student_id));
    const pendingBills = roomBills.reduce((sum, b) => sum + (Number(b.amount) - Number(b.paid_amount)), 0);
    const elec = electricityByRoom[room.id];
    return {
      room,
      studentCount: roomStudents.length,
      complaints: roomComplaints,
      pendingBills,
      electricityKwh: elec?.kwh || 0,
      electricityCost: elec?.cost || 0,
    };
  });

  const complaintTrendData = COMPLAINT_STATUS_FLOW.map(status => ({
    label: status.split(' ')[0],
    value: complaints.filter(c => c.status === status).length,
  }));

  return (
    <DashboardLayout
      navItems={navItems}
      activeKey={activeSection}
      onNavigate={setActiveSection}
      title="Hostel Admin"
      subtitle={`Staff: ${staff?.name} • ${staff?.role.replace('_', ' ').toUpperCase()}`}
      onBack={() => { setHostelAuth(false); setPortal(null as never); }}
      notifications={notifications}
      onMarkNotificationRead={markNotificationRead}
    >
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && activeSection === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Rooms" value={totalRooms} icon={<Building2 className="w-6 h-6" />} color="blue" />
            <StatCard label="Occupied" value={occupiedRooms} icon={<Home className="w-6 h-6" />} color="green" />
            <StatCard label="Available" value={availableRooms} icon={<Building2 className="w-6 h-6" />} color="slate" />
            <StatCard label="Pending Complaints" value={pendingComplaints} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Resolved Complaints" value={resolvedComplaints} icon={<ShieldCheck className="w-6 h-6" />} color="green" />
            <StatCard label="Total Students" value={students.length} icon={<Home className="w-6 h-6" />} color="blue" />
            <StatCard label="Pending Fees" value={formatINR(totalPendingBills)} icon={<Receipt className="w-6 h-6" />} color="orange" />
            <StatCard label="Active Alerts" value={notifications.filter(n => !n.is_read).length} icon={<Bell className="w-6 h-6" />} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader title="Room-wise Overview" subtitle="Electricity, complaints, and bills per room" icon={<Building2 className="w-5 h-5" />} />
              <CardBody className="p-0">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-800">
                      <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <th className="text-left px-5 py-3 font-medium">Room</th>
                        <th className="text-center px-5 py-3 font-medium">Students</th>
                        <th className="text-left px-5 py-3 font-medium">Electricity</th>
                        <th className="text-left px-5 py-3 font-medium">Complaint</th>
                        <th className="text-right px-5 py-3 font-medium">Pending Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomInfo.map(({ room, studentCount, complaints: rComplaints, pendingBills, electricityKwh }) => {
                        const activeComplaint = rComplaints.find(c => c.status !== 'Resolved');
                        return (
                          <tr key={room.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                            onClick={() => { setSelectedRoom(room); setActiveSection('rooms'); }}>
                            <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{room.room_number}</td>
                            <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300">{studentCount}/{room.capacity}</td>
                            <td className="px-5 py-3">
                              <Badge className={electricityKwh > 50 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}>
                                {electricityKwh.toFixed(1)} kWh
                              </Badge>
                            </td>
                            <td className="px-5 py-3">
                              {activeComplaint ? (
                                <div>
                                  <p className="text-xs text-slate-600 dark:text-slate-300">{activeComplaint.sub_category || activeComplaint.category}</p>
                                  <Badge className={COMPLAINT_STATUS_COLORS[activeComplaint.status] || ''}>{activeComplaint.status}</Badge>
                                </div>
                              ) : <span className="text-slate-400 text-xs">No active complaints</span>}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className={pendingBills > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>{formatINR(pendingBills)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Complaint Status" icon={<FileText className="w-5 h-5" />} />
              <CardBody>
                <DonutChart data={COMPLAINT_STATUS_FLOW.map((status, i) => ({
                  label: status,
                  value: complaints.filter(c => c.status === status).length,
                  color: ['#94a3b8', '#3b82f6', '#f59e0b', '#f97316', '#10b981'][i],
                })).filter(d => d.value > 0)} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Important Alerts" icon={<Bell className="w-5 h-5" />} />
            <CardBody className="space-y-2">
              {notifications.filter(n => !n.is_read).slice(0, 5).map(n => (
                <div key={n.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.priority === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                  </div>
                </div>
              ))}
              {notifications.filter(n => !n.is_read).length === 0 && <p className="text-center text-slate-400 py-4">No active alerts</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'rooms' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Room Management" subtitle={`${totalRooms} rooms, ${occupiedRooms} occupied`} icon={<Building2 className="w-5 h-5" />} />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roomInfo.map(({ room, studentCount, complaints: rComplaints, pendingBills, electricityKwh, electricityCost }) => {
                  const isHighUsage = electricityKwh > 50;
                  const hasActiveComplaint = rComplaints.some(c => c.status !== 'Resolved');
                  return (
                    <div
                      key={room.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                        hasActiveComplaint ? 'border-amber-200 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10'
                        : pendingBills > 0 ? 'border-red-200 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30'
                      }`}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-lg text-slate-800 dark:text-slate-100">Room {room.room_number}</span>
                        <Badge className={studentCount === room.capacity ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-blue-100 text-blue-700 border-blue-300'}>
                          {studentCount}/{room.capacity}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Electricity</span>
                          <Badge className={isHighUsage ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}>
                            {isHighUsage ? 'High' : 'Normal'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Complaints</span>
                          <span className="text-slate-700 dark:text-slate-200">{rComplaints.filter(c => c.status !== 'Resolved').length} active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Pending</span>
                          <span className={pendingBills > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>{formatINR(pendingBills)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {selectedRoom && (
            <Card>
              <CardHeader
                title={`Room ${selectedRoom.room_number} Details`}
                subtitle={`Floor ${selectedRoom.floor} • Capacity: ${selectedRoom.capacity}`}
                icon={<Home className="w-5 h-5" />}
                action={<button onClick={() => setSelectedRoom(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>}
              />
              <CardBody>
                {(() => {
                  const roomStudents = students.filter(s => s.room_id === selectedRoom.id);
                  const roomComplaints = complaints.filter(c => c.room_id === selectedRoom.id);
                  const roomBills = bills.filter(b => roomStudents.some(s => s.id === b.student_id));
                  const pendingBills = roomBills.reduce((sum, b) => sum + (Number(b.amount) - Number(b.paid_amount)), 0);
                  const elec = electricityByRoom[selectedRoom.id];
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Students</p>
                          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{roomStudents.length}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Electricity</p>
                          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{elec?.kwh.toFixed(1) || '0'} kWh</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Complaints</p>
                          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{roomComplaints.length}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Pending Bills</p>
                          <p className="text-xl font-bold text-red-600">{formatINR(pendingBills)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Active Complaints</p>
                        {roomComplaints.filter(c => c.status !== 'Resolved').map(c => (
                          <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-sm text-slate-600 dark:text-slate-300">{c.sub_category || c.category}</span>
                            <Badge className={COMPLAINT_STATUS_COLORS[c.status] || ''}>{c.status}</Badge>
                          </div>
                        ))}
                        {roomComplaints.filter(c => c.status !== 'Resolved').length === 0 && <p className="text-sm text-slate-400">No active complaints</p>}
                      </div>
                    </div>
                  );
                })()}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {!loading && activeSection === 'complaints' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader title="Complaint Management" subtitle="Privacy-protected: student details hidden by default" icon={<ShieldCheck className="w-5 h-5" />} />
            <CardBody>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Student names and contact details are hidden. Use "View Details" with PIN authentication to reveal.
              </div>

              {/* Search & Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by room number or complaint..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 outline-none">
                  <option value="">All Categories</option>
                  {Object.keys(complaintCategories).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 outline-none">
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 outline-none">
                  <option value="">All Statuses</option>
                  {COMPLAINT_STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Complaints (${filteredComplaints.length})`} icon={<FileText className="w-5 h-5" />} />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="text-left px-5 py-3 font-medium">Room</th>
                      <th className="text-left px-5 py-3 font-medium">Complaint</th>
                      <th className="text-left px-5 py-3 font-medium">Priority</th>
                      <th className="text-left px-5 py-3 font-medium">Date</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                      <th className="text-center px-5 py-3 font-medium">Student Info</th>
                      <th className="text-center px-5 py-3 font-medium">Update Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map(c => {
                      const room = rooms.find(r => r.id === c.room_id);
                      const student = students.find(s => s.id === c.student_id);
                      const isRevealed = revealStudentId === c.student_id;
                      const statusIndex = COMPLAINT_STATUS_FLOW.indexOf(c.status);
                      return (
                        <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{room?.room_number || 'N/A'}</td>
                          <td className="px-5 py-3 max-w-xs">
                            <p className="font-medium text-slate-700 dark:text-slate-200">{c.sub_category || c.category}</p>
                            <p className="text-xs text-slate-400 truncate">{c.description}</p>
                          </td>
                          <td className="px-5 py-3"><Badge className={PRIORITY_COLORS[c.priority] || ''}>{c.priority}</Badge></td>
                          <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(c.created_at)}</td>
                          <td className="px-5 py-3"><Badge className={COMPLAINT_STATUS_COLORS[c.status] || ''}>{c.status}</Badge></td>
                          <td className="px-5 py-3 text-center">
                            {isRevealed ? (
                              <div className="text-xs text-left">
                                <p className="font-medium text-slate-800 dark:text-slate-100">{student?.name}</p>
                                <p className="text-slate-400">Reg: {student?.reg_number}</p>
                                <p className="text-slate-400">Phone: {student?.phone}</p>
                                <button onClick={() => setRevealStudentId(null)} className="text-blue-500 hover:underline mt-1 flex items-center gap-1">
                                  <EyeOff className="w-3 h-3" /> Hide
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleRevealStudent(c.id, c.student_id)}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                              >
                                <Lock className="w-3 h-3" /> View Details
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <select
                              value={c.status}
                              onChange={e => updateComplaintStatus(c.id, e.target.value)}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {COMPLAINT_STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'electricity' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Consumption" value={`${Object.values(electricityByRoom).reduce((sum, r) => sum + r.kwh, 0).toFixed(1)} kWh`} icon={<Zap className="w-6 h-6" />} color="amber" />
            <StatCard label="Total Cost" value={formatINR(Object.values(electricityByRoom).reduce((sum, r) => sum + r.cost, 0))} icon={<Receipt className="w-6 h-6" />} color="orange" />
            <StatCard label="High Usage Rooms" value={Object.values(electricityByRoom).filter(r => r.kwh > 50).length} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
          </div>

          <Card>
            <CardHeader title="Highest Electricity-Consuming Rooms" icon={<BarChart3 className="w-5 h-5" />} />
            <CardBody>
              {topConsumingRooms.length > 0 ? (
                <BarChart data={topConsumingRooms.map(r => ({ label: `Room ${r.roomNumber}`, value: Number(r.kwh.toFixed(1)) }))} color="amber" />
              ) : <p className="text-center text-slate-400 py-8">No data</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Room-wise Electricity" icon={<Zap className="w-5 h-5" />} />
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="text-left px-5 py-3 font-medium">Room</th>
                    <th className="text-right px-5 py-3 font-medium">Usage (kWh)</th>
                    <th className="text-right px-5 py-3 font-medium">Bill</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(electricityByRoom).sort((a, b) => b.kwh - a.kwh).map(r => (
                    <tr key={r.roomNumber} className="border-b border-slate-50 dark:border-slate-700/50">
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">Room {r.roomNumber}</td>
                      <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{r.kwh.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{formatINR(r.cost)}</td>
                      <td className="px-5 py-3">
                        <Badge className={r.kwh > 50 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}>
                          {r.kwh > 50 ? 'High Usage' : 'Normal'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'bills' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Billed" value={formatINR(bills.reduce((s, b) => s + Number(b.amount), 0))} icon={<Receipt className="w-6 h-6" />} color="blue" />
            <StatCard label="Total Collected" value={formatINR(bills.reduce((s, b) => s + Number(b.paid_amount), 0))} icon={<Receipt className="w-6 h-6" />} color="green" />
            <StatCard label="Total Pending" value={formatINR(totalPendingBills)} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
          </div>

          <Card>
            <CardHeader title="All Bills" icon={<Receipt className="w-5 h-5" />} />
            <CardBody className="p-0">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800">
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="text-left px-5 py-3 font-medium">Room</th>
                      <th className="text-left px-5 py-3 font-medium">Bill Type</th>
                      <th className="text-right px-5 py-3 font-medium">Amount</th>
                      <th className="text-right px-5 py-3 font-medium">Paid</th>
                      <th className="text-right px-5 py-3 font-medium">Pending</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(b => {
                      const student = students.find(s => s.id === b.student_id);
                      const room = rooms.find(r => r.id === student?.room_id);
                      return (
                        <tr key={b.id} className="border-b border-slate-50 dark:border-slate-700/50">
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{room?.room_number || 'N/A'}</td>
                          <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{b.bill_type}</td>
                          <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{formatINR(Number(b.amount))}</td>
                          <td className="px-5 py-3 text-right text-emerald-600">{formatINR(Number(b.paid_amount))}</td>
                          <td className="px-5 py-3 text-right text-red-600">{formatINR(Number(b.amount) - Number(b.paid_amount))}</td>
                          <td className="px-5 py-3"><Badge className={b.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : b.status === 'Partial' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-100 text-red-700 border-red-300'}>{b.status}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Complaints" value={complaints.length} icon={<FileText className="w-6 h-6" />} color="blue" />
            <StatCard label="Pending" value={pendingComplaints} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
            <StatCard label="Resolved" value={resolvedComplaints} icon={<ShieldCheck className="w-6 h-6" />} color="green" />
            <StatCard label="Resolution Rate" value={`${complaints.length > 0 ? ((resolvedComplaints / complaints.length) * 100).toFixed(0) : 0}%`} icon={<BarChart3 className="w-6 h-6" />} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Complaint Trends" subtitle="By status" icon={<BarChart3 className="w-5 h-5" />} />
              <CardBody><BarChart data={complaintTrendData} color="blue" /></CardBody>
            </Card>
            <Card>
              <CardHeader title="Complaint Categories" icon={<FileText className="w-5 h-5" />} />
              <CardBody>
                <DonutChart data={Object.entries(complaintCategories).map(([cat, count], i) => ({
                  label: cat.replace(' Problems', ''),
                  value: count,
                  color: ['#f59e0b', '#10b981', '#f97316', '#3b82f6', '#06b6d4', '#6366f1'][i % 6],
                }))} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Smart Recommendations" subtitle="AI-powered insights" icon={<BarChart3 className="w-5 h-5" />} />
            <CardBody className="space-y-3">
              {[
                { text: 'Room 204 has the highest electricity consumption. Consider an energy audit for this room.', type: 'warning' },
                { text: `${complaintCategories['Electrical Problems'] || 0} electrical complaints detected. Schedule a preventive maintenance check.`, type: 'info' },
                { text: 'Food complaints are trending up. Consider reviewing mess vendor quality.', type: 'warning' },
                { text: `${resolvedComplaints} of ${complaints.length} complaints resolved. Resolution rate is ${complaints.length > 0 ? ((resolvedComplaints / complaints.length) * 100).toFixed(0) : 0}%.`, type: 'success' },
              ].map((rec, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                  rec.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  : rec.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                }`}>
                  <BarChart3 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{rec.text}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 italic pt-2">AI recommendations are advisory and should not replace official staff decisions.</p>
            </CardBody>
          </Card>
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
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    n.is_read ? 'border-slate-100 dark:border-slate-700' : 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                  } hover:bg-slate-50 dark:hover:bg-slate-700/30`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.priority === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                        <Badge className={PRIORITY_COLORS[n.priority] || ''}>{n.priority}</Badge>
                      </div>
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

      {/* PIN Verification Modal */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPinModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <KeyRound className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Security Verification</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Enter your staff PIN to view student details</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
              This action will be logged in the audit trail. Only authorized staff should access student personal information.
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyPin()}
              placeholder="Enter 4-digit PIN"
              maxLength={4}
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none text-center text-2xl tracking-widest font-mono"
            />
            {pinError && <p className="text-sm text-red-600 mt-2">{pinError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPinModal(null)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={verifyPin} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Verify & Reveal</button>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">Demo PIN: 4821 (Rajesh Kumar)</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
