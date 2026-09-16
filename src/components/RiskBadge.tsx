import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level?: RiskLevel | 'CRITICAL' | string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level = 'LOW',
  score,
  size = 'md',
  showScore = true,
}) => {
  const normLevel = (level || 'LOW').toUpperCase();

  let colorStyle = 'bg-[#1E8449]/15 text-[#1E8449] border-[#1E8449]/40';
  let label = 'LOW RISK';

  if (normLevel === 'MEDIUM') {
    colorStyle = 'bg-[#E8862C]/15 text-[#E8862C] border-[#E8862C]/40';
    label = 'MEDIUM RISK';
  } else if (normLevel === 'HIGH') {
    colorStyle = 'bg-[#B03A2E]/15 text-[#B03A2E] border-[#B03A2E]/40';
    label = 'HIGH RISK';
  } else if (normLevel === 'CRITICAL') {
    colorStyle = 'bg-[#7B241C]/20 text-[#7B241C] border-[#7B241C]/50 font-black animate-pulse';
    label = 'CRITICAL RISK';
  }

  const padding =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-3 py-1 text-xs'
      : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-bold uppercase tracking-wider ${colorStyle} ${padding}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
      {showScore && typeof score === 'number' && (
        <span className="font-mono opacity-90 border-l border-current/30 pl-1 ml-0.5">
          {score.toFixed(0)}%
        </span>
      )}
    </span>
  );
};
