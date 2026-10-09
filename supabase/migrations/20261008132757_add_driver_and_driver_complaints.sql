/*
# Add Driver Login and Driver Complaint System

1. New Tables
- `drivers` - Driver profiles with driver_id, password, bus assignment. Transport-only role.
- `driver_complaints` - Bus issue complaints submitted by drivers. Connected ONLY to transport management.

2. Modified Tables
- `notifications` - Added `related_bus_id` column for bus-specific student notification filtering.
  When a driver submits a complaint, notifications are created with related_bus_id set to the
  affected bus. Students only see notifications for their own bus. General notifications
  (related_bus_id = null) continue to show to all students as before.

3. Security
- RLS enabled on new tables with anon+authenticated CRUD (demo system).
- `notifications` table gains an additional UPDATE policy for related_bus_id (already had update policy).

4. Important Notes
- Driver complaints are STRICTLY transport-only. No connection to hostel management.
- Driver complaints appear in Transport Staff Portal only.
- Student notifications are bus-specific: only students on the affected bus see the alert.
- All transport staff see all driver complaints regardless of which bus.
*/

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  driver_id text UNIQUE NOT NULL,
  password text NOT NULL,
  bus_id uuid REFERENCES buses(id) ON DELETE SET NULL,
  phone text,
  license_number text,
  created_at timestamptz DEFAULT now()
);

-- Driver complaints table (transport-only)
CREATE TABLE IF NOT EXISTS driver_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  description text NOT NULL,
  is_emergency boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Submitted',
  staff_remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add related_bus_id to notifications for bus-specific student filtering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_bus_id') THEN
    ALTER TABLE notifications ADD COLUMN related_bus_id uuid;
  END IF;
END $$;

-- Enable RLS on drivers
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_drivers" ON drivers;
CREATE POLICY "anon_select_drivers" ON drivers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
CREATE POLICY "anon_insert_drivers" ON drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
CREATE POLICY "anon_update_drivers" ON drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;
CREATE POLICY "anon_delete_drivers" ON drivers FOR DELETE TO anon, authenticated USING (true);

-- Enable RLS on driver_complaints
ALTER TABLE driver_complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_driver_complaints" ON driver_complaints;
CREATE POLICY "anon_select_driver_complaints" ON driver_complaints FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_driver_complaints" ON driver_complaints;
CREATE POLICY "anon_insert_driver_complaints" ON driver_complaints FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_driver_complaints" ON driver_complaints;
CREATE POLICY "anon_update_driver_complaints" ON driver_complaints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_driver_complaints" ON driver_complaints;
CREATE POLICY "anon_delete_driver_complaints" ON driver_complaints FOR DELETE TO anon, authenticated USING (true);
