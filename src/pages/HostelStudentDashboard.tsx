import { useState, useEffect, useCallback } from 'react';
import {
  Zap, FileText, Receipt, Home, Bell, BarChart3, Lightbulb,
  TrendingDown, Clock, AlertTriangle, Plus, ChevronRight, X,
  Droplets, Wrench, Wifi, Utensils, Package, Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, NavItem } from '@/components/ui/DashboardLayout';
import { Card, CardHeader, CardBody, StatCard, Badge, StatusDot } from '@/components/ui/Card';
import { BarChart, LineChart, DonutChart, ProgressBar } from '@/components/ui/Charts';
import {
  COMPLAINT_CATEGORIES, COMPLAINT_STATUS_FLOW, COMPLAINT_STATUS_COLORS,
  PRIORITY_COLORS, BILL_STATUS_COLORS, formatINR, formatDateTime, formatDate,
} from '@/lib/constants';
import type { Complaint, Bill, RoomExpense, Notification, ElectricityReading, Room } from '@/lib/types';

export function HostelStudentDashboard() {
  const { student, hostelAuthenticated, setHostelAuth, setPortal } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [room, setRoom] = useState<Room | null>(null);
  const [electricityData, setElectricityData] = useState<ElectricityReading[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [roomExpenses, setRoomExpenses] = useState<RoomExpense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!student) return;
    setLoading(true);

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', student.room_id)
      .maybeSingle();
    setRoom(roomData as Room | null);

    if (student.room_id) {
      const { data: elec } = await supabase
        .from('electricity_readings')
        .select('*')
        .eq('room_id', student.room_id)
        .order('reading_date', { ascending: true })
        .order('reading_hour', { ascending: true });
      setElectricityData(elec as ElectricityReading[] || []);

      const { data: expenses } = await supabase
        .from('room_expenses')
        .select('*')
        .eq('room_id', student.room_id);
      setRoomExpenses(expenses as RoomExpense[] || []);
    }

    const { data: comps } = await supabase
      .from('complaints')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    setComplaints(comps as Complaint[] || []);

    const { data: billsData } = await supabase
      .from('bills')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    setBills(billsData as Bill[] || []);

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_type', 'student')
      .order('created_at', { ascending: false });
    setNotifications(notifs as Notification[] || []);

    setLoading(false);
  }, [student]);

  useEffect(() => {
    if (hostelAuthenticated) loadData();
  }, [hostelAuthenticated, loadData]);

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  if (!hostelAuthenticated) return null;

  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const navItems: NavItem[] = [
    { label: 'Overview', icon: <Home className="w-5 h-5" />, key: 'overview' },
    { label: 'Electricity', icon: <Zap className="w-5 h-5" />, key: 'electricity' },
    { label: 'Complaints', icon: <FileText className="w-5 h-5" />, key: 'complaints', badge: complaints.filter(c => c.status !== 'Resolved').length },
    { label: 'Bills & Fees', icon: <Receipt className="w-5 h-5" />, key: 'bills' },
    { label: 'Room Expenses', icon: <BarChart3 className="w-5 h-5" />, key: 'expenses' },
    { label: 'Notifications', icon: <Bell className="w-5 h-5" />, key: 'notifications', badge: unreadNotifs },
  ];

  // Calculate electricity stats
  const todayReadings = electricityData.filter(r => r.reading_date === new Date().toISOString().split('T')[0]);
  const todayKwh = todayReadings.reduce((sum, r) => sum + Number(r.kwh), 0);
  const todayCost = todayReadings.reduce((sum, r) => sum + Number(r.cost_inr), 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayReadings = electricityData.filter(r => r.reading_date === yesterday.toISOString().split('T')[0]);
  const yesterdayKwh = yesterdayReadings.reduce((sum, r) => sum + Number(r.kwh), 0);

  const dailyData = electricityData.reduce((acc: Record<string, number>, r) => {
    acc[r.reading_date] = (acc[r.reading_date] || 0) + Number(r.kwh);
    return acc;
  }, {});
  const dailyChart = Object.entries(dailyData).map(([date, kwh]) => ({
    label: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    value: Number(kwh.toFixed(2)),
  }));

  const hourlyData = todayReadings.map(r => ({ label: `${r.reading_hour}h`, value: Number(r.kwh) }));
  const peakHours = todayReadings.filter(r => Number(r.kwh) > 0.6).sort((a, b) => Number(b.kwh) - Number(a.kwh)).slice(0, 3);

  const monthlyKwh = Object.values(dailyData).reduce((sum: number, v) => sum + v, 0);
  const estimatedBill = monthlyKwh * 8;

  // Bills summary
  const totalDue = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalPaid = bills.reduce((sum, b) => sum + Number(b.paid_amount), 0);
  const totalPending = totalDue - totalPaid;

  // Room expenses
  const expenseByType = roomExpenses.reduce((acc: Record<string, number>, e) => {
    acc[e.expense_type] = (acc[e.expense_type] || 0) + Number(e.amount);
    return acc;
  }, {});
  const totalRoomExpense = Object.values(expenseByType).reduce((sum: number, v) => sum + v, 0);

  return (
    <DashboardLayout
      navItems={navItems}
      activeKey={activeSection}
      onNavigate={setActiveSection}
      title="Hostel Portal"
      subtitle={`Welcome, ${student?.name} • Room ${room?.room_number || 'N/A'}`}
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
            <StatCard label="Today's Usage" value={`${todayKwh.toFixed(2)} kWh`} icon={<Zap className="w-6 h-6" />} color="amber" trend={yesterdayKwh > 0 ? (todayKwh > yesterdayKwh ? 'up' : 'down') : undefined} trendValue={yesterdayKwh > 0 ? `${Math.abs(((todayKwh - yesterdayKwh) / yesterdayKwh) * 100).toFixed(0)}% vs yesterday` : undefined} />
            <StatCard label="Estimated Bill" value={formatINR(estimatedBill)} icon={<Receipt className="w-6 h-6" />} color="orange" />
            <StatCard label="Pending Bills" value={formatINR(totalPending)} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
            <StatCard label="Active Complaints" value={complaints.filter(c => c.status !== 'Resolved').length} icon={<FileText className="w-6 h-6" />} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader title="Electricity Consumption" subtitle="Last 7 days" icon={<TrendingDown className="w-5 h-5" />} />
              <CardBody>
                {dailyChart.length > 0 ? (
                  <LineChart data={dailyChart} color="amber" valueFormat={(v) => `${v.toFixed(1)}`} />
                ) : <p className="text-center text-slate-400 py-8">No data available</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Peak Usage Hours" subtitle="Today" icon={<Clock className="w-5 h-5" />} />
              <CardBody className="space-y-3">
                {peakHours.length > 0 ? peakHours.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot color="bg-red-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{r.reading_hour}:00 - {r.reading_hour + 1}:00</span>
                    </div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{Number(r.kwh).toFixed(2)} kWh</span>
                  </div>
                )) : <p className="text-center text-slate-400 py-4">No peak hours detected</p>}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Peak usage is typically between 7:00 PM - 10:00 PM
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Recent Complaints" icon={<FileText className="w-5 h-5" />} action={
                <button onClick={() => setActiveSection('complaints')} className="text-sm text-blue-600 hover:underline">View all</button>
              } />
              <CardBody className="space-y-3">
                {complaints.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{c.sub_category || c.category}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(c.created_at)}</p>
                    </div>
                    <Badge className={COMPLAINT_STATUS_COLORS[c.status] || ''}>{c.status}</Badge>
                  </div>
                ))}
                {complaints.length === 0 && <p className="text-center text-slate-400 py-4">No complaints filed</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Bills Summary" icon={<Receipt className="w-5 h-5" />} action={
                <button onClick={() => setActiveSection('bills')} className="text-sm text-blue-600 hover:underline">View all</button>
              } />
              <CardBody>
                <div className="space-y-4">
                  <ProgressBar label="Total Paid" value={totalPaid} max={totalDue} color="green" valueText={formatINR(totalPaid)} />
                  <ProgressBar label="Pending" value={totalPending} max={totalDue} color="red" valueText={formatINR(totalPending)} />
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Total Amount Due</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{formatINR(totalDue)}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {!loading && activeSection === 'electricity' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Today's Usage" value={`${todayKwh.toFixed(2)} kWh`} icon={<Zap className="w-6 h-6" />} color="amber" />
            <StatCard label="Estimated Bill" value={formatINR(todayCost)} icon={<Receipt className="w-6 h-6" />} color="orange" />
            <StatCard label="Monthly Usage" value={`${monthlyKwh.toFixed(1)} kWh`} icon={<Activity className="w-6 h-6" />} color="blue" />
            <StatCard label="Peak Usage" value={peakHours.length > 0 ? `${peakHours[0].reading_hour}:00 - ${peakHours[0].reading_hour + 1}:00` : 'N/A'} icon={<Clock className="w-6 h-6" />} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Daily Consumption" subtitle="Last 7 days (kWh)" icon={<TrendingDown className="w-5 h-5" />} />
              <CardBody>
                {dailyChart.length > 0 ? <BarChart data={dailyChart} color="amber" valueFormat={(v) => v.toFixed(1)} /> : <p className="text-center text-slate-400 py-8">No data</p>}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Hourly Usage" subtitle="Today (kWh)" icon={<Clock className="w-5 h-5" />} />
              <CardBody>
                {hourlyData.length > 0 ? <BarChart data={hourlyData} color="blue" /> : <p className="text-center text-slate-400 py-8">No data</p>}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Room-wise Electricity Comparison" subtitle="Today vs Yesterday" icon={<BarChart3 className="w-5 h-5" />} />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Yesterday's Usage</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{yesterdayKwh.toFixed(2)} kWh</p>
                  <p className="text-xs text-slate-400 mt-1">{formatINR(yesterdayKwh * 8)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Today's Usage</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{todayKwh.toFixed(2)} kWh</p>
                  <p className="text-xs text-slate-400 mt-1">{formatINR(todayCost)}</p>
                  {yesterdayKwh > 0 && (
                    <p className={`text-xs mt-1 font-medium ${todayKwh < yesterdayKwh ? 'text-emerald-600' : 'text-red-600'}`}>
                      {todayKwh < yesterdayKwh ? '↓' : '↑'} {Math.abs(((todayKwh - yesterdayKwh) / yesterdayKwh) * 100).toFixed(0)}% vs yesterday
                    </p>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Smart Recommendations" subtitle="AI-powered energy-saving tips" icon={<Lightbulb className="w-5 h-5" />} />
            <CardBody>
              <div className="space-y-3">
                {[
                  { icon: <Clock className="w-4 h-4" />, text: 'Reduce usage during peak hours (7 PM - 10 PM) to lower your bill by up to 20%', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
                  { icon: <Zap className="w-4 h-4" />, text: 'Switch off unused fans and lights when leaving the room', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                  { icon: <TrendingDown className="w-4 h-4" />, text: `Your estimated monthly bill is ${formatINR(estimatedBill)}. Save up to ${formatINR(estimatedBill * 0.15)} by optimizing usage`, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                  { icon: <Lightbulb className="w-4 h-4" />, text: 'Avoid using high-power devices simultaneously during peak hours', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
                ].map((rec, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${rec.color}`}>
                    <span className="flex-shrink-0 mt-0.5">{rec.icon}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-200">{rec.text}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-400 italic pt-2">AI recommendations are advisory and should not replace official guidelines.</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'complaints' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Complaint & Maintenance System</h2>
            <button
              onClick={() => setShowComplaintModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Complaint
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {COMPLAINT_STATUS_FLOW.map(status => {
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
            <CardHeader title="Your Complaints" subtitle={`${complaints.length} total`} icon={<FileText className="w-5 h-5" />} />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="text-left px-5 py-3 font-medium">Category</th>
                      <th className="text-left px-5 py-3 font-medium">Description</th>
                      <th className="text-left px-5 py-3 font-medium">Priority</th>
                      <th className="text-left px-5 py-3 font-medium">Date</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{c.sub_category || c.category}</p>
                          <p className="text-xs text-slate-400">{c.category}</p>
                        </td>
                        <td className="px-5 py-3 max-w-xs">
                          <p className="text-slate-600 dark:text-slate-300 truncate">{c.description}</p>
                        </td>
                        <td className="px-5 py-3"><Badge className={PRIORITY_COLORS[c.priority] || ''}>{c.priority}</Badge></td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{formatDateTime(c.created_at)}</td>
                        <td className="px-5 py-3"><Badge className={COMPLAINT_STATUS_COLORS[c.status] || ''}>{c.status}</Badge></td>
                      </tr>
                    ))}
                    {complaints.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-slate-400">No complaints filed yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {showComplaintModal && student && (
            <ComplaintModal
              studentId={student.id}
              roomId={student.room_id}
              onClose={() => setShowComplaintModal(false)}
              onSubmitted={() => { setShowComplaintModal(false); loadData(); }}
            />
          )}
        </div>
      )}

      {!loading && activeSection === 'bills' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Due" value={formatINR(totalDue)} icon={<Receipt className="w-6 h-6" />} color="blue" />
            <StatCard label="Total Paid" value={formatINR(totalPaid)} icon={<Receipt className="w-6 h-6" />} color="green" />
            <StatCard label="Pending" value={formatINR(totalPending)} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
          </div>

          <Card>
            <CardHeader title="Bills & Payment History" icon={<Receipt className="w-5 h-5" />} />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="text-left px-5 py-3 font-medium">Bill Type</th>
                      <th className="text-left px-5 py-3 font-medium">Period</th>
                      <th className="text-right px-5 py-3 font-medium">Amount</th>
                      <th className="text-right px-5 py-3 font-medium">Paid</th>
                      <th className="text-right px-5 py-3 font-medium">Pending</th>
                      <th className="text-left px-5 py-3 font-medium">Due Date</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(b => (
                      <tr key={b.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{b.bill_type}</td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{b.billing_period || '-'}</td>
                        <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{formatINR(Number(b.amount))}</td>
                        <td className="px-5 py-3 text-right text-emerald-600">{formatINR(Number(b.paid_amount))}</td>
                        <td className="px-5 py-3 text-right text-red-600">{formatINR(Number(b.amount) - Number(b.paid_amount))}</td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{b.due_date ? formatDate(b.due_date) : '-'}</td>
                        <td className="px-5 py-3"><Badge className={BILL_STATUS_COLORS[b.status] || ''}>{b.status}</Badge></td>
                      </tr>
                    ))}
                    {bills.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">No bills found</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!loading && activeSection === 'expenses' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Room Expense" value={formatINR(totalRoomExpense)} icon={<BarChart3 className="w-6 h-6" />} color="blue" />
            <StatCard label="Room Number" value={room?.room_number || 'N/A'} icon={<Home className="w-6 h-6" />} color="slate" />
            <StatCard label="Monthly Average" value={formatINR(totalRoomExpense)} icon={<Activity className="w-6 h-6" />} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Expense Breakdown" icon={<BarChart3 className="w-5 h-5" />} />
              <CardBody>
                {Object.keys(expenseByType).length > 0 ? (
                  <DonutChart data={[
                    { label: 'Electricity', value: Math.round(expenseByType['Electricity'] || 0), color: '#f59e0b' },
                    { label: 'Water', value: Math.round(expenseByType['Water'] || 0), color: '#3b82f6' },
                    { label: 'Maintenance', value: Math.round(expenseByType['Maintenance'] || 0), color: '#10b981' },
                    { label: 'Food/Mess', value: Math.round(expenseByType['Food/Mess'] || 0), color: '#f97316' },
                    { label: 'Other', value: Math.round(expenseByType['Other'] || 0), color: '#6366f1' },
                  ].filter(d => d.value > 0)} />
                ) : <p className="text-center text-slate-400 py-8">No expense data</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Expense Details" icon={<Receipt className="w-5 h-5" />} />
              <CardBody className="space-y-3">
                {Object.entries(expenseByType).map(([type, amount]) => (
                  <div key={type} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{type}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{formatINR(amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-200 dark:border-slate-600">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Total</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatINR(totalRoomExpense)}</span>
                </div>
              </CardBody>
            </Card>
          </div>
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
                    n.is_read
                      ? 'border-slate-100 dark:border-slate-700 bg-transparent'
                      : 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                  } hover:bg-slate-50 dark:hover:bg-slate-700/30`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      n.priority === 'High' ? 'bg-red-500' : n.priority === 'Warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
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
    </DashboardLayout>
  );
}

function ComplaintModal({ studentId, roomId, onClose, onSubmitted }: {
  studentId: string;
  roomId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  const categoryIcons: Record<string, React.ReactNode> = {
    'Electrical Problems': <Zap className="w-4 h-4" />,
    'Room Problems': <Wrench className="w-4 h-4" />,
    'Food Problems': <Utensils className="w-4 h-4" />,
    'Network Problems': <Wifi className="w-4 h-4" />,
    'Water Problems': <Droplets className="w-4 h-4" />,
    Other: <Package className="w-4 h-4" />,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await supabase.from('complaints').insert({
      student_id: studentId,
      room_id: roomId,
      category,
      sub_category: subCategory || (category === 'Other' ? 'Custom complaint' : null),
      description,
      priority,
      status: 'Submitted',
    });
    setSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">File a New Complaint</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Complaint Category</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(COMPLAINT_CATEGORIES).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setCategory(cat); setSubCategory(''); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all ${
                    category === cat
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {categoryIcons[cat]} <span className="truncate">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {category && category !== 'Other' && COMPLAINT_CATEGORIES[category].length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Specific Issue</label>
              <select
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select an issue...</option>
                {COMPLAINT_CATEGORIES[category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Describe the problem in detail..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${
                    priority === p
                      ? p === 'High' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                      : p === 'Medium' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                      : 'border-slate-400 bg-slate-50 dark:bg-slate-700 text-slate-600'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={submitting || !category} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </div>
    </div>
  );
}
