/*
# Smart Hostel & Transport Management System Schema

1. New Tables
- `students` - Student profiles with registration number, hostel assignment, bus assignment
- `staff` - Staff profiles with staff ID, role (hostel_admin, transport_admin, super_admin)
- `hostels` - Hostel buildings
- `rooms` - Rooms within hostels, with capacity and current occupancy
- `room_assignments` - Links students to rooms
- `electricity_readings` - Hourly electricity readings per room
- `complaints` - Student complaints with category, priority, status
- `complaint_status_log` - Audit trail of complaint status changes
- `bills` - Student bills (hostel fee, electricity, maintenance, mess, etc.)
- `payments` - Payment records against bills
- `room_expenses` - Aggregated expenses per room
- `buses` - Bus fleet with route info
- `bus_assignments` - Links students to buses
- `bus_stops` - Stops on each bus route with schedule
- `bus_locations` - Live/simulated GPS positions
- `bus_timing_history` - Historical arrival times per stop
- `transport_alerts` - Emergency alerts for buses
- `notifications` - Central notification center
- `audit_logs` - Logs for sensitive data access (e.g., viewing student details)
- `emergency_contacts` - Student/parent emergency contact info

2. Security
- RLS enabled on all tables
- Policies allow anon+authenticated CRUD since this is a demo system with simulated auth
- All data is clearly fictional/sample data

3. Notes
- This is a demonstration system with simulated authentication
- All student/staff data is fictional sample data
- Real APIs (GPS, electricity meters) can be connected later
*/

-- Students
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  reg_number text UNIQUE NOT NULL,
  password text NOT NULL,
  hostel_id uuid,
  room_id uuid,
  bus_id uuid,
  phone text,
  parent_name text,
  parent_phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  boarding_stop text,
  created_at timestamptz DEFAULT now()
);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  staff_id text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'hostel_admin',
  pin text NOT NULL DEFAULT '1234',
  created_at timestamptz DEFAULT now()
);

-- Hostels
CREATE TABLE IF NOT EXISTS hostels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  total_rooms int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  room_password text NOT NULL DEFAULT 'room123',
  capacity int NOT NULL DEFAULT 4,
  floor int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hostel_id, room_number)
);

-- Electricity readings
CREATE TABLE IF NOT EXISTS electricity_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  kwh numeric NOT NULL DEFAULT 0,
  reading_hour int NOT NULL,
  reading_date date NOT NULL DEFAULT CURRENT_DATE,
  cost_inr numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id),
  category text NOT NULL,
  sub_category text,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Submitted',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Complaint status log
CREATE TABLE IF NOT EXISTS complaint_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  bill_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  due_date date,
  billing_period text,
  created_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date timestamptz DEFAULT now(),
  payment_method text DEFAULT 'Online'
);

-- Room expenses (aggregated)
CREATE TABLE IF NOT EXISTS room_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  expense_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text
);

-- Buses
CREATE TABLE IF NOT EXISTS buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_number text UNIQUE NOT NULL,
  bus_password text NOT NULL DEFAULT 'bus123',
  route_name text NOT NULL,
  driver_name text,
  driver_phone text,
  capacity int NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'Active',
  start_time time,
  return_time time,
  created_at timestamptz DEFAULT now()
);

-- Bus stops
CREATE TABLE IF NOT EXISTS bus_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  stop_name text NOT NULL,
  stop_order int NOT NULL,
  arrival_time time,
  departure_time time,
  is_college_stop boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Bus locations (simulated GPS)
CREATE TABLE IF NOT EXISTS bus_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  current_stop text,
  next_stop text,
  status text NOT NULL DEFAULT 'On Time',
  speed_kmh numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Bus timing history
CREATE TABLE IF NOT EXISTS bus_timing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  stop_id uuid REFERENCES bus_stops(id),
  stop_name text NOT NULL,
  scheduled_arrival time,
  actual_arrival time,
  variation_minutes int DEFAULT 0,
  record_date date NOT NULL DEFAULT CURRENT_DATE
);

-- Transport alerts
CREATE TABLE IF NOT EXISTS transport_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'Warning',
  message text NOT NULL,
  current_location text,
  reason text,
  expected_recovery time,
  revised_arrival time,
  alternative_bus text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'Normal',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE electricity_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_timing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Students policies (anon+authenticated for demo)
DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);

-- Staff policies
DROP POLICY IF EXISTS "anon_select_staff" ON staff;
CREATE POLICY "anon_select_staff" ON staff FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_staff" ON staff;
CREATE POLICY "anon_insert_staff" ON staff FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_staff" ON staff;
CREATE POLICY "anon_update_staff" ON staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_staff" ON staff;
CREATE POLICY "anon_delete_staff" ON staff FOR DELETE TO anon, authenticated USING (true);

-- Hostels policies
DROP POLICY IF EXISTS "anon_select_hostels" ON hostels;
CREATE POLICY "anon_select_hostels" ON hostels FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_hostels" ON hostels;
CREATE POLICY "anon_insert_hostels" ON hostels FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_hostels" ON hostels;
CREATE POLICY "anon_update_hostels" ON hostels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_hostels" ON hostels;
CREATE POLICY "anon_delete_hostels" ON hostels FOR DELETE TO anon, authenticated USING (true);

-- Rooms policies
DROP POLICY IF EXISTS "anon_select_rooms" ON rooms;
CREATE POLICY "anon_select_rooms" ON rooms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rooms" ON rooms;
CREATE POLICY "anon_delete_rooms" ON rooms FOR DELETE TO anon, authenticated USING (true);

-- Electricity readings policies
DROP POLICY IF EXISTS "anon_select_electricity" ON electricity_readings;
CREATE POLICY "anon_select_electricity" ON electricity_readings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_electricity" ON electricity_readings;
CREATE POLICY "anon_insert_electricity" ON electricity_readings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_electricity" ON electricity_readings;
CREATE POLICY "anon_update_electricity" ON electricity_readings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_electricity" ON electricity_readings;
CREATE POLICY "anon_delete_electricity" ON electricity_readings FOR DELETE TO anon, authenticated USING (true);

-- Complaints policies
DROP POLICY IF EXISTS "anon_select_complaints" ON complaints;
CREATE POLICY "anon_select_complaints" ON complaints FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_complaints" ON complaints;
CREATE POLICY "anon_insert_complaints" ON complaints FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_complaints" ON complaints;
CREATE POLICY "anon_update_complaints" ON complaints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_complaints" ON complaints;
CREATE POLICY "anon_delete_complaints" ON complaints FOR DELETE TO anon, authenticated USING (true);

-- Complaint status log policies
DROP POLICY IF EXISTS "anon_select_complaint_log" ON complaint_status_log;
CREATE POLICY "anon_select_complaint_log" ON complaint_status_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_complaint_log" ON complaint_status_log;
CREATE POLICY "anon_insert_complaint_log" ON complaint_status_log FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Bills policies
DROP POLICY IF EXISTS "anon_select_bills" ON bills;
CREATE POLICY "anon_select_bills" ON bills FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bills" ON bills;
CREATE POLICY "anon_insert_bills" ON bills FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bills" ON bills;
CREATE POLICY "anon_update_bills" ON bills FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_bills" ON bills;
CREATE POLICY "anon_delete_bills" ON bills FOR DELETE TO anon, authenticated USING (true);

-- Payments policies
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Room expenses policies
DROP POLICY IF EXISTS "anon_select_room_expenses" ON room_expenses;
CREATE POLICY "anon_select_room_expenses" ON room_expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_room_expenses" ON room_expenses;
CREATE POLICY "anon_insert_room_expenses" ON room_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_room_expenses" ON room_expenses;
CREATE POLICY "anon_update_room_expenses" ON room_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Buses policies
DROP POLICY IF EXISTS "anon_select_buses" ON buses;
CREATE POLICY "anon_select_buses" ON buses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_buses" ON buses;
CREATE POLICY "anon_insert_buses" ON buses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_buses" ON buses;
CREATE POLICY "anon_update_buses" ON buses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_buses" ON buses;
CREATE POLICY "anon_delete_buses" ON buses FOR DELETE TO anon, authenticated USING (true);

-- Bus stops policies
DROP POLICY IF EXISTS "anon_select_bus_stops" ON bus_stops;
CREATE POLICY "anon_select_bus_stops" ON bus_stops FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bus_stops" ON bus_stops;
CREATE POLICY "anon_insert_bus_stops" ON bus_stops FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bus_stops" ON bus_stops;
CREATE POLICY "anon_update_bus_stops" ON bus_stops FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_bus_stops" ON bus_stops;
CREATE POLICY "anon_delete_bus_stops" ON bus_stops FOR DELETE TO anon, authenticated USING (true);

-- Bus locations policies
DROP POLICY IF EXISTS "anon_select_bus_locations" ON bus_locations;
CREATE POLICY "anon_select_bus_locations" ON bus_locations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bus_locations" ON bus_locations;
CREATE POLICY "anon_insert_bus_locations" ON bus_locations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bus_locations" ON bus_locations;
CREATE POLICY "anon_update_bus_locations" ON bus_locations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Bus timing history policies
DROP POLICY IF EXISTS "anon_select_bus_timing" ON bus_timing_history;
CREATE POLICY "anon_select_bus_timing" ON bus_timing_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bus_timing" ON bus_timing_history;
CREATE POLICY "anon_insert_bus_timing" ON bus_timing_history FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Transport alerts policies
DROP POLICY IF EXISTS "anon_select_transport_alerts" ON transport_alerts;
CREATE POLICY "anon_select_transport_alerts" ON transport_alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transport_alerts" ON transport_alerts;
CREATE POLICY "anon_insert_transport_alerts" ON transport_alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transport_alerts" ON transport_alerts;
CREATE POLICY "anon_update_transport_alerts" ON transport_alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Notifications policies
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- Audit logs policies
DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
