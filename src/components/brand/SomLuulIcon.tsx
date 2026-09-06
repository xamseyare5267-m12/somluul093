import React from 'react';

export interface SomLuulIconProps {
  size?: number | string;
  className?: string;
  variant?: 'gradient' | 'solid' | 'white' | 'dark' | 'monochrome';
  showGlow?: boolean;
}

export const SomLuulIcon: React.FC<SomLuulIconProps> = ({
  size = 40,
  className = '',
  variant = 'gradient',
  showGlow = true,
}) => {
  const numSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      style={{ width: numSize, height: numSize }}
      className={`shrink-0 transition-all duration-300 ${className}`}
      aria-label="SomLuul Symbol"
      role="img"
    >
      <defs>
        {/* Main Brand Gradient */}
        <linearGradient id="slGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" /> {/* Royal Blue */}
          <stop offset="30%" stopColor="#4f46e5" /> {/* Indigo */}
          <stop offset="65%" stopColor="#7c3aed" /> {/* Electric Violet */}
          <stop offset="85%" stopColor="#d946ef" /> {/* Magenta */}
          <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan */}
        </linearGradient>

        {/* Secondary Accent Gradient */}
        <linearGradient id="slGradAccent" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        {/* Outer Glow */}
        <filter id="slGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Inner Shadow / 3D Depth */}
        <linearGradient id="slGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Optional Glow Background */}
      {showGlow && (
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="url(#slGradPrimary)"
          opacity="0.15"
          filter="url(#slGlowFilter)"
        />
      )}

      {/* Background Container rounded superellipse */}
      <rect
        x="10"
        y="10"
        width="180"
        height="180"
        rx="48"
        fill={
          variant === 'white'
            ? '#ffffff'
            : variant === 'dark'
            ? '#0f172a'
            : variant === 'monochrome'
            ? '#1e293b'
            : 'url(#slGradPrimary)'
        }
      />

      {/* Subtle Container Border */}
      <rect
        x="10"
        y="10"
        width="180"
        height="180"
        rx="48"
        fill="none"
        stroke="url(#slGloss)"
        strokeWidth="3"
        opacity="0.5"
      />

      {/* Custom Abstract "S" Symbol Geometry */}
      <g transform="translate(0,0)">
        {/* Upper S Arc */}
        <path
          d="M 142,58 C 142,42 122,38 98,38 C 68,38 48,54 48,78 C 48,104 78,110 102,118 C 128,126 152,132 152,158 C 152,184 126,200 96,200"
          fill="none"
          stroke="none"
        />

        {/* 3D Interlocking Ribbon 1 - Upper S Wing */}
        <path
          d="M 148,68 C 148,46 126,40 100,40 C 72,40 52,52 52,72 C 52,94 76,102 104,110 C 132,118 156,128 156,152 C 156,176 130,188 98,188 C 76,188 58,180 48,168 L 64,152 C 72,162 84,168 98,168 C 114,168 132,160 132,150 C 132,136 112,128 84,120 C 56,112 28,102 28,72 C 28,42 58,22 100,22 C 132,22 158,34 168,52 Z"
          fill={variant === 'gradient' ? '#ffffff' : 'url(#slGradPrimary)'}
          opacity={variant === 'gradient' ? 0.96 : 1}
        />

        {/* Dynamic Inner Flow Line (Futuristic Accent Cut) */}
        <path
          d="M 112,40 C 130,42 144,52 144,66 C 144,78 128,88 108,94 L 88,100 C 68,106 52,116 52,132 C 52,146 68,158 90,162"
          fill="none"
          stroke={variant === 'gradient' ? 'url(#slGradAccent)' : '#ffffff'}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Central Tech Diamond Core / Connection Spark */}
        <path
          d="M 100,82 L 112,100 L 100,118 L 88,100 Z"
          fill={variant === 'gradient' ? '#38bdf8' : 'url(#slGradAccent)'}
          opacity="0.85"
        />
      </g>
    </svg>
  );
};
