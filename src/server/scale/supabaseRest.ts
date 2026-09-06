/**
 * Low-level Supabase PostgREST client for server-side use only.
 * Never expose the service-role key to the browser.
 */
import axios, { AxiosRequestConfig } from 'axios';

export function cleanSupabaseUrl(url: string | undefined): string {
  if (!url) return '';
  let raw = url.trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  try {
    if (raw.includes('://')) {
      const parsed = new URL(raw);
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    /* fall through */
  }
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

export function supabaseConfig(): { url: string; key: string } | null {
  const url = cleanSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

export function isScaleMode(): boolean {
  // Prefer normalized tables when explicitly enabled or when SCALE_MODE=1
  return process.env.SCALE_MODE === '1' || process.env.SCALE_MODE === 'true';
}

function headers(key: string, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function restGet<T = any>(
  path: string,
  opts?: { prefer?: string; timeout?: number }
): Promise<T> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error('Supabase is not configured');
  const res = await axios.get(`${cfg.url}/rest/v1/${path}`, {
    headers: headers(cfg.key, opts?.prefer ? { Prefer: opts.prefer } : undefined),
    timeout: opts?.timeout ?? 12000,
  });
  return res.data as T;
}

export async function restPost<T = any>(
  path: string,
  body: unknown,
  opts?: { prefer?: string; timeout?: number }
): Promise<T> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error('Supabase is not configured');
  const res = await axios.post(`${cfg.url}/rest/v1/${path}`, body, {
    headers: headers(cfg.key, {
      Prefer: opts?.prefer ?? 'return=representation',
    }),
    timeout: opts?.timeout ?? 12000,
  });
  return res.data as T;
}

export async function restPatch<T = any>(
  path: string,
  body: unknown,
  opts?: { prefer?: string; timeout?: number }
): Promise<T> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error('Supabase is not configured');
  const res = await axios.patch(`${cfg.url}/rest/v1/${path}`, body, {
    headers: headers(cfg.key, {
      Prefer: opts?.prefer ?? 'return=representation',
    }),
    timeout: opts?.timeout ?? 12000,
  });
  return res.data as T;
}

export async function restDelete(
  path: string,
  opts?: { prefer?: string; timeout?: number }
): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error('Supabase is not configured');
  await axios.delete(`${cfg.url}/rest/v1/${path}`, {
    headers: headers(cfg.key, opts?.prefer ? { Prefer: opts.prefer } : undefined),
    timeout: opts?.timeout ?? 12000,
  } as AxiosRequestConfig);
}

/** Storage: create a short-lived signed upload URL (direct-to-bucket, CDN-friendly). */
export async function createSignedUploadUrl(
  bucket: string,
  objectKey: string,
  expiresInSeconds = 300
): Promise<{ signedUrl: string; token: string; path: string } | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  try {
    const res = await axios.post(
      `${cfg.url}/storage/v1/object/upload/sign/${bucket}/${objectKey}`,
      { expiresIn: expiresInSeconds },
      { headers: headers(cfg.key), timeout: 10000 }
    );
    const data = res.data;
    const token = data?.token || data?.signedURL || data?.signedUrl;
    if (!token && !data?.signedUrl && !data?.url) return null;
    const signedUrl =
      data?.signedUrl ||
      data?.url ||
      `${cfg.url}/storage/v1/object/upload/sign/${bucket}/${objectKey}?token=${token}`;
    return { signedUrl, token: String(token || ''), path: objectKey };
  } catch (err: any) {
    console.error('[Scale Storage] signed upload URL failed:', err?.message || err);
    return null;
  }
}

/** Public URL for an object in a public bucket (or CDN front). */
export function publicObjectUrl(bucket: string, objectKey: string): string {
  const cfg = supabaseConfig();
  const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, '');
  if (cdn) return `${cdn}/${bucket}/${objectKey}`;
  if (!cfg) return '';
  return `${cfg.url}/storage/v1/object/public/${bucket}/${objectKey}`;
}
