import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const file = process.env.DB_FILE || path.resolve(process.cwd(), 'data/db.json');
if (!fs.existsSync(file)) throw new Error(`Legacy database file not found: ${file}`);
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
const headers = { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
const existing = await fetch(`${url}/rest/v1/app_state?id=eq.1&select=id,version`, { headers });
if (!existing.ok) throw new Error(`Supabase read failed: ${existing.status} ${await existing.text()}`);
const rows = await existing.json();
if (rows.length) {
  console.log('app_state already exists; refusing to overwrite production data.');
  process.exit(0);
}
const response = await fetch(`${url}/rest/v1/app_state`, { method: 'POST', headers, body: JSON.stringify({ id: 1, version: 1, state, updated_at: new Date().toISOString() }) });
if (!response.ok) throw new Error(`Supabase migration failed: ${response.status} ${await response.text()}`);
console.log(`Migrated ${file} into Supabase app_state.`);
