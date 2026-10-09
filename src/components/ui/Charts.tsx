import { ReactNode } from 'react';

export function BarChart({ data, height = 200, color = 'blue', valueFormat }: {
  data: { label: string; value: number }[];
  height?: number;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'orange';
  valueFormat?: (v: number) => string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  };

  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {valueFormat ? valueFormat(d.value) : d.value}
          </span>
          <div
            className={`w-full rounded-t ${colorMap[color]} transition-all hover:opacity-80`}
            style={{ height: `${(d.value / max) * (height - 40)}px`, minHeight: '2px' }}
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ data, height = 200, color = 'blue', valueFormat }: {
  data: { label: string; value: number }[];
  height?: number;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'orange';
  valueFormat?: (v: number) => string;
}) {
  const strokeMap: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    orange: '#f97316',
  };

  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;
  const width = 100;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - 30 - ((d.value - min) / range) * (height - 50);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeMap[color]} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeMap[color]} stopOpacity="0" />
          </linearGradient>
        </defs>
        {data.length > 1 && (
          <>
            <polygon
              points={`0,${height - 30} ${points} ${width},${height - 30}`}
              fill={`url(#grad-${color})`}
            />
            <polyline
              points={points}
              fill="none"
              stroke={strokeMap[color]}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            {data.map((d, i) => {
              const x = (i / (data.length - 1 || 1)) * width;
              const y = height - 30 - ((d.value - min) / range) * (height - 50);
              return <circle key={i} cx={x} cy={y} r="1.5" fill={strokeMap[color]} vectorEffect="non-scaling-stroke" />;
            })}
          </>
        )}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-slate-500 dark:text-slate-400">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data, size = 160 }: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2 - 20;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="flex-shrink-0">
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const circle = (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="20"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
          offset += dash;
          return circle;
        })}
        <text x={center} y={center - 5} textAnchor="middle" className="fill-slate-800 dark:fill-slate-100 font-bold text-lg">
          {total}
        </text>
        <text x={center} y={center + 15} textAnchor="middle" className="fill-slate-400 text-xs">
          Total
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-slate-600 dark:text-slate-300">{d.label}</span>
            <span className="font-medium text-slate-800 dark:text-slate-100">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, color = 'blue', label, valueText }: {
  value: number;
  max: number;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'orange';
  label?: string;
  valueText?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  };
  const pct = Math.min((value / (max || 1)) * 100, 100);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600 dark:text-slate-300">{label}</span>
          <span className="font-medium text-slate-800 dark:text-slate-100">{valueText || `${pct.toFixed(0)}%`}</span>
        </div>
      )}
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorMap[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
