import React from 'react';

interface GovLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GovLogo: React.FC<GovLogoProps> = ({ size = 'md', className = '' }) => {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dim} ${className}`}>
      {/* SVG Original PRAGATI Emblem: Upward Progress Bars + Connected Governance Nodes */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circular Shield Base */}
        <circle cx="50" cy="50" r="46" fill="#003B6F" stroke="#E87500" strokeWidth="3" />
        
        {/* Inner Subtle Grid Pattern */}
        <circle cx="50" cy="50" r="38" fill="#0B1F33" stroke="#005A9C" strokeWidth="1.5" />

        {/* Upward Growth Bar 1 */}
        <rect x="30" y="55" width="8" height="20" rx="2" fill="#138808" />
        {/* Upward Growth Bar 2 */}
        <rect x="42" y="45" width="8" height="30" rx="2" fill="#005A9C" />
        {/* Upward Growth Bar 3 */}
        <rect x="54" y="32" width="8" height="43" rx="2" fill="#E87500" />
        {/* Upward Growth Bar 4 (Top Peak) */}
        <rect x="66" y="22" width="8" height="53" rx="2" fill="#38BDF8" />

        {/* Dynamic Trend Line & Governance Network Nodes */}
        <path
          d="M 28 60 L 40 48 L 52 35 L 70 18"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Node Points */}
        <circle cx="28" cy="60" r="3.5" fill="#E87500" stroke="#FFF" strokeWidth="1.5" />
        <circle cx="40" cy="48" r="3.5" fill="#E87500" stroke="#FFF" strokeWidth="1.5" />
        <circle cx="52" cy="35" r="3.5" fill="#E87500" stroke="#FFF" strokeWidth="1.5" />
        <circle cx="70" cy="18" r="4.5" fill="#138808" stroke="#FFF" strokeWidth="2" />
      </svg>
    </div>
  );
};
