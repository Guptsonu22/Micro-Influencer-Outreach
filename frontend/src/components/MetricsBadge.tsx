import React from 'react';

interface MetricsBadgeProps {
  label: string;
  value: string | number | null;
  unit?: string;
  isUnavailable?: boolean;
}

export const MetricsBadge: React.FC<MetricsBadgeProps> = ({
  label,
  value,
  unit = '',
  isUnavailable = false,
}) => {
  return (
    <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-xs">
      <span className="text-slate-400 text-[10px] uppercase font-semibold">{label}</span>
      <span className={`font-medium mt-0.5 ${isUnavailable ? 'text-slate-500 italic' : 'text-slate-200'}`}>
        {isUnavailable ? 'Unavailable' : `${value ?? 'N/A'}${unit}`}
      </span>
    </div>
  );
};
