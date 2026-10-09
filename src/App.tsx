import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { PortalSelection } from '@/pages/PortalSelection';
import { HostelAccessPage } from '@/pages/HostelAccessPage';
import { TransportAccessPage } from '@/pages/TransportAccessPage';
import { HostelStudentDashboard } from '@/pages/HostelStudentDashboard';
import { HostelStaffDashboard } from '@/pages/HostelStaffDashboard';
import { TransportStudentDashboard } from '@/pages/TransportStudentDashboard';
import { TransportStaffDashboard } from '@/pages/TransportStaffDashboard';
import { DriverDashboard } from '@/pages/DriverDashboard';

function App() {
  const { role, portal, hostelAuthenticated, transportAuthenticated } = useAuth();

  // Not logged in
  if (!role) return <LoginPage />;

  // Driver goes directly to transport-only dashboard
  if (role === 'driver') return <DriverDashboard />;

  // Logged in but no portal selected
  if (!portal) return <PortalSelection />;

  // Hostel portal
  if (portal === 'hostel') {
    if (!hostelAuthenticated) return <HostelAccessPage />;
    return role === 'student' ? <HostelStudentDashboard /> : <HostelStaffDashboard />;
  }

  // Transport portal
  if (portal === 'transport') {
    if (!transportAuthenticated) return <TransportAccessPage />;
    return role === 'student' ? <TransportStudentDashboard /> : <TransportStaffDashboard />;
  }

  return <LoginPage />;
}

export default App;
