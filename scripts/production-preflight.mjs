import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json',
  'server.ts',
  'index.html',
  'vercel.json',
  'supabase/schema.sql',
  'supabase/schema_v2_scale.sql',
  'src/server/scale/mountScaleRoutes.ts',
  'src/server/repos/postsRepo.ts',
  'src/server/repos/messagesRepo.ts',
  'docs/SCALE_ARCHITECTURE.md',
];
const failures = [];
for (const f of required) if (!fs.existsSync(path.join(root,f))) failures.push(`Missing required file: ${f}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for (const s of ['build','start','lint','verify']) if (!pkg.scripts?.[s]) failures.push(`Missing npm script: ${s}`);

const env = fs.readFileSync(path.join(root,'.env.example'),'utf8');
if (env.includes('TWILIO_FROM_NUMBER=CORS_ORIGINS=')) failures.push('Malformed .env.example: TWILIO_FROM_NUMBER is merged with CORS_ORIGINS');
if (!/^CORS_ORIGINS=/m.test(env)) failures.push('Missing CORS_ORIGINS in .env.example');
if (!/^SUPABASE_BUCKET=/m.test(env)) failures.push('Missing SUPABASE_BUCKET in .env.example');
if (!/^SCALE_MODE=/m.test(env)) failures.push('Missing SCALE_MODE in .env.example');
if (!/^TURN_URL=/m.test(env)) failures.push('Missing TURN_URL in .env.example');
const forbidden = [
  'YOUR_PROJECT_REF.supabase.co','YOUR_SERVER_ONLY_SERVICE_ROLE_KEY','https://YOUR_DOMAIN',
  'owner@your-domain.example','your-owner-username','change-me'
];
for (const token of forbidden) {
  if (env.includes(token) && !env.includes(`# ${token}`)) failures.push(`Production placeholder found in .env.example: ${token}`);
}

const sourceFiles = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if (['node_modules','.git','dist','dist_electron'].includes(e.name)) continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p); else if(/\.(ts|tsx|js|mjs|json|html|css)$/.test(e.name)) sourceFiles.push(p);
  }
}
walk(root);
const suspicious = [/Math\.random\s*\(/, /192\.168\.1\.100/, /starter coins/i, /FIREWALL_OK/, /openrelay\.metered\.ca/i, /openrelayproject/i];
for (const file of sourceFiles) {
  if (file.endsWith(path.join('scripts','production-preflight.mjs'))) continue;
  const text=fs.readFileSync(file,'utf8');
  for (const re of suspicious) if(re.test(text)) failures.push(`Suspicious production placeholder/default in ${path.relative(root,file)}: ${re}`);
}

const scaleSchema=fs.readFileSync(path.join(root,'supabase/schema_v2_scale.sql'),'utf8');
if (/where\\s+[^;]*\\bnow\\s*\\(\\s*\\)/i.test(scaleSchema)) failures.push('Scale schema contains now() in an index predicate; PostgreSQL requires immutable index predicates.');

const schema=fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8');
for (const table of ['profiles','credentials','posts','chat_rooms','chat_messages','notifications','webrtc_signals','follows','post_reactions','post_comments','chat_members','message_receipts','reports_normalized','user_sessions','idempotency_keys','wallet_ledger','payment_events']) {
  if(!new RegExp(`create table if not exists ${table}\\b`,'i').test(schema)) failures.push(`Supabase schema missing table: ${table}`);
}

const scaleSql=fs.readFileSync(path.join(root,'supabase/schema_v2_scale.sql'),'utf8'); for(const x of ['wallet_accounts','wallet_apply_entry','live_comments','live_reactions']) if(!new RegExp('\\b'+x+'\\b','i').test(scaleSql)) failures.push('Scale schema missing '+x);
if (failures.length) {
  console.error('\nPRODUCTION PREFLIGHT FAILED:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log('Production preflight passed: required files, scripts, schema, and known placeholder checks are OK.');
