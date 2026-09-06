const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="slGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="30%" stop-color="#4f46e5" />
      <stop offset="65%" stop-color="#7c3aed" />
      <stop offset="85%" stop-color="#d946ef" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="slGradAccent" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <linearGradient id="slGloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="180" height="180" rx="48" fill="url(#slGradPrimary)" />
  <rect x="10" y="10" width="180" height="180" rx="48" fill="none" stroke="url(#slGloss)" stroke-width="3" opacity="0.5" />
  <g>
    <path d="M 148,68 C 148,46 126,40 100,40 C 72,40 52,52 52,72 C 52,94 76,102 104,110 C 132,118 156,128 156,152 C 156,176 130,188 98,188 C 76,188 58,180 48,168 L 64,152 C 72,162 84,168 98,168 C 114,168 132,160 132,150 C 132,136 112,128 84,120 C 56,112 28,102 28,72 C 28,42 58,22 100,22 C 132,22 158,34 168,52 Z" fill="#ffffff" opacity="0.96" />
    <path d="M 112,40 C 130,42 144,52 144,66 C 144,78 128,88 108,94 L 88,100 C 68,106 52,116 52,132 C 52,146 68,158 90,162" fill="none" stroke="url(#slGradAccent)" stroke-width="6" stroke-linecap="round" opacity="0.9" />
    <path d="M 100,82 L 112,100 L 100,118 L 88,100 Z" fill="#38bdf8" opacity="0.85" />
  </g>
</svg>`;

export const DEFAULT_SOMLUUL_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
