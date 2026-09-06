import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredEnv = [
  'SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_BUCKET','JWT_SECRET','CORS_ORIGINS',
  'REDIS_URL','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','TURN_URL','TURN_USERNAME','TURN_CREDENTIAL','CDN_BASE_URL','LIVE_PROVIDER','LIVEKIT_URL','LIVEKIT_API_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET','PAYOUT_PROVIDER_URL','WITHDRAWAL_ENCRYPTION_KEY'
];
const env = Object.fromEntries(fs.readFileSync(path.join(root,'.env.example'),'utf8').split(/\r?\n/)
  .map(line => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(m => [m[1],m[2]]));
const failures=[];
for (const k of requiredEnv) if (!(k in env)) failures.push(`Missing .env.example key: ${k}`);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if (!pkg.dependencies?.ioredis) failures.push('ioredis dependency is required for distributed production rate limits/realtime.');
if (pkg.scripts?.build !== 'vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs') failures.push('Unexpected build script; verify release build.');
if (failures.length) { console.error('HARDENING PREFLIGHT FAILED\n- '+failures.join('\n- ')); process.exit(1); }
console.log('Hardening preflight passed. Production requires Supabase + Redis + TURN + CDN secrets at deployment time.');
