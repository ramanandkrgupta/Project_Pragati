import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || '').toUpperCase();

  let style = 'bg-[#F4F6F8] text-[#0B2942] border-[#D9DEE3]';

  if (norm === 'ON-GOING' || norm === 'ONGOING') {
    style = 'bg-[#0B3D66]/10 text-[#0B3D66] border-[#0B3D66]/30 font-semibold';
  } else if (norm === 'DELAYED') {
    style = 'bg-[#E8862C]/10 text-[#E8862C] border-[#E8862C]/30 font-bold';
  } else if (norm === 'UNDER RISK') {
    style = 'bg-[#B03A2E]/10 text-[#B03A2E] border-[#B03A2E]/30 font-bold';
  } else if (norm === 'COMPLETED') {
    style = 'bg-[#1E8449]/10 text-[#1E8449] border-[#1E8449]/30 font-semibold';
  } else if (norm === 'TENDERING') {
    style = 'bg-[#0B3D66]/10 text-[#0B3D66] border-[#0B3D66]/30 font-semibold';
  } else if (norm === 'NEW') {
    style = 'bg-[#7B241C]/15 text-[#7B241C] border-[#7B241C]/40 font-black animate-pulse';
  } else if (norm === 'ACKNOWLEDGED') {
    style = 'bg-[#E8862C]/10 text-[#E8862C] border-[#E8862C]/30 font-bold';
  } else if (norm === 'UNDER REVIEW') {
    style = 'bg-[#0B3D66]/10 text-[#0B3D66] border-[#0B3D66]/30 font-bold';
  } else if (norm === 'ACTION INITIATED') {
    style = 'bg-[#0B3D66]/10 text-[#0B3D66] border-[#0B3D66]/30 font-bold';
  } else if (norm === 'RESOLVED' || norm === 'REVIEWED') {
    style = 'bg-[#1E8449]/10 text-[#1E8449] border-[#1E8449]/30 font-semibold';
  }

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded border tracking-wide uppercase ${style} ${pad}`}>
      {status}
    </span>
  );
};
