export interface Student {
  id: string;
  name: string;
  reg_number: string;
  password: string;
  hostel_id: string;
  room_id: string;
  bus_id: string;
  phone: string;
  parent_name: string;
  parent_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  boarding_stop: string;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  staff_id: string;
  password: string;
  role: 'hostel_admin' | 'transport_admin' | 'super_admin';
  pin: string;
  created_at: string;
}

export interface Hostel {
  id: string;
  name: string;
  code: string;
  total_rooms: number;
}

export interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  room_password: string;
  capacity: number;
  floor: number;
}

export interface ElectricityReading {
  id: string;
  room_id: string;
  kwh: number;
  reading_hour: number;
  reading_date: string;
  cost_inr: number;
}

export interface Complaint {
  id: string;
  student_id: string;
  room_id: string | null;
  category: string;
  sub_category: string | null;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  student_id: string;
  bill_type: string;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  billing_period: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
}

export interface RoomExpense {
  id: string;
  room_id: string;
  expense_type: string;
  amount: number;
  expense_date: string;
  notes: string | null;
}

export interface Bus {
  id: string;
  bus_number: string;
  bus_password: string;
  route_name: string;
  driver_name: string | null;
  driver_phone: string | null;
  capacity: number;
  status: string;
  start_time: string | null;
  return_time: string | null;
}

export interface BusStop {
  id: string;
  bus_id: string;
  stop_name: string;
  stop_order: number;
  arrival_time: string | null;
  departure_time: string | null;
  is_college_stop: boolean;
}

export interface BusLocation {
  id: string;
  bus_id: string;
  latitude: number;
  longitude: number;
  current_stop: string;
  next_stop: string;
  status: string;
  speed_kmh: number;
  updated_at: string;
}

export interface BusTimingHistory {
  id: string;
  bus_id: string;
  stop_id: string | null;
  stop_name: string;
  scheduled_arrival: string | null;
  actual_arrival: string | null;
  variation_minutes: number;
  record_date: string;
}

export interface TransportAlert {
  id: string;
  bus_id: string;
  alert_type: string;
  severity: string;
  message: string;
  current_location: string | null;
  reason: string | null;
  expected_recovery: string | null;
  revised_arrival: string | null;
  alternative_bus: string | null;
  resolved: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  target_type: string;
  target_id: string | null;
  related_bus_id: string | null;
  title: string;
  message: string;
  category: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  staff_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  created_at: string;
}

export interface Driver {
  id: string;
  name: string;
  driver_id: string;
  password: string;
  bus_id: string;
  phone: string;
  license_number: string;
  created_at: string;
}

export interface DriverComplaint {
  id: string;
  driver_id: string;
  bus_id: string;
  issue_type: string;
  description: string;
  is_emergency: boolean;
  status: string;
  staff_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'student' | 'staff' | 'driver';
export type PortalType = 'hostel' | 'transport';
export type DashboardType = 'student_hostel' | 'staff_hostel' | 'student_transport' | 'staff_transport';
