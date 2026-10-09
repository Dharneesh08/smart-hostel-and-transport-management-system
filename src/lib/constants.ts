export const STATUS_COLORS: Record<string, string> = {
  Normal: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Warning: 'bg-amber-100 text-amber-700 border-amber-300',
  Delayed: 'bg-orange-100 text-orange-700 border-orange-300',
  Emergency: 'bg-red-100 text-red-700 border-red-300',
  Information: 'bg-blue-100 text-blue-700 border-blue-300',
};

export const STATUS_DOTS: Record<string, string> = {
  Normal: 'bg-emerald-500',
  Warning: 'bg-amber-500',
  Delayed: 'bg-orange-500',
  Emergency: 'bg-red-500',
  Information: 'bg-blue-500',
};

export const COMPLAINT_STATUS_FLOW = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
];

export const COMPLAINT_STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-slate-100 text-slate-700 border-slate-300',
  'Under Review': 'bg-blue-100 text-blue-700 border-blue-300',
  Assigned: 'bg-amber-100 text-amber-700 border-amber-300',
  'In Progress': 'bg-orange-100 text-orange-700 border-orange-300',
  Resolved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

export const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-600 border-slate-300',
  Medium: 'bg-blue-100 text-blue-700 border-blue-300',
  High: 'bg-red-100 text-red-700 border-red-300',
};

export const BILL_STATUS_COLORS: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Pending: 'bg-red-100 text-red-700 border-red-300',
  Partial: 'bg-amber-100 text-amber-700 border-amber-300',
};

export const ALERT_SEVERITY_COLORS: Record<string, string> = {
  Normal: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Warning: 'bg-amber-100 text-amber-700 border-amber-300',
  'High Priority': 'bg-orange-100 text-orange-700 border-orange-300',
  Emergency: 'bg-red-100 text-red-700 border-red-300',
};

export const COMPLAINT_CATEGORIES: Record<string, string[]> = {
  'Electrical Problems': [
    'Fan not working',
    'Light not working',
    'Switch/socket problem',
    'Charging point problem',
    'Power failure',
  ],
  'Room Problems': [
    'Water leakage',
    'Door/lock problem',
    'Window problem',
    'Furniture damage',
    'Cleaning issue',
  ],
  'Food Problems': [
    'Food quality issue',
    'Food quantity issue',
    'Food timing issue',
    'Menu change request',
    'Hygiene complaint',
    'Food preference/suggestion',
  ],
  'Network Problems': [
    'Wi-Fi not working',
    'Slow internet',
    'No network coverage',
    'Login/connectivity issue',
  ],
  'Water Problems': [
    'No water',
    'Low water pressure',
    'Hot water problem',
    'Drinking water issue',
  ],
  Other: [],
};

export const DRIVER_ISSUE_TYPES = [
  'Puncture',
  'Bus Breakdown',
  'Engine Problem',
  'Brake Problem',
  'Tyre Problem',
  'Electrical Problem',
  'Accident / Emergency',
  'Route Problem',
  'Other',
];

export const DRIVER_EMERGENCY_TYPES = [
  'Accident / Emergency',
  'Bus Breakdown',
  'Brake Problem',
];

export const DRIVER_COMPLAINT_STATUS_FLOW = [
  'Submitted',
  'Acknowledged',
  'Under Review',
  'Technician Assigned',
  'Resolved',
  'Closed',
];

export const DRIVER_COMPLAINT_STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-slate-100 text-slate-700 border-slate-300',
  Acknowledged: 'bg-blue-100 text-blue-700 border-blue-300',
  'Under Review': 'bg-blue-100 text-blue-700 border-blue-300',
  'Technician Assigned': 'bg-amber-100 text-amber-700 border-amber-300',
  Resolved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Closed: 'bg-slate-200 text-slate-600 border-slate-400',
};

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(time: string): string {
  if (!time) return '--';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}
