const fs = require('fs');
const path = require('path');

const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="50%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="44" fill="url(#logoGrad)" />
  <circle cx="100" cy="100" r="72" fill="none" stroke="url(#glowGrad)" stroke-width="4" stroke-dasharray="8 6" opacity="0.6"/>
  <path d="M100 38 L142 80 L100 162 L58 80 Z" fill="white" opacity="0.95"/>
  <path d="M100 38 L142 80 L100 80 Z" fill="#e0e7ff" />
  <path d="M100 38 L58 80 L100 80 Z" fill="#c7d2fe" />
  <path d="M58 80 L100 162 L100 80 Z" fill="#a5b4fc" />
  <path d="M142 80 L100 162 L100 80 Z" fill="#818cf8" />
  <text x="100" y="115" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="46" fill="#1e1b4b" text-anchor="middle">S</text>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'somluul_logo.svg'), svgLogo, 'utf8');
fs.writeFileSync(path.join(publicDir, 'somluul_logo.png'), svgLogo, 'utf8');

console.log('Successfully generated public/somluul_logo.svg and public/somluul_logo.png');
