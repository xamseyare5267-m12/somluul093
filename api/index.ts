/**
 * Vercel serverless adapter.
 * Imports the pre-built CommonJS server bundle produced by `npm run build`.
 * This avoids ERR_MODULE_NOT_FOUND for the large server.ts source tree.
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req: any, res: any) {
  // Prefer the esbuild CJS bundle (created by npm run build)
  let mod: any;
  try {
    // When packaged, dist/server.cjs is next to the function or at project root relative
    const candidates = [
      path.join(__dirname, '..', 'dist', 'server.cjs'),
      path.join(process.cwd(), 'dist', 'server.cjs'),
      path.join('/var/task', 'dist', 'server.cjs'),
      path.join('/var/task', 'server.cjs'),
    ];
    let loaded = false;
    for (const p of candidates) {
      try {
        mod = require(p);
        if (mod) { loaded = true; break; }
      } catch (_) {}
    }
    if (!loaded) {
      // Fallback: dynamic import of source (requires includeFiles)
      mod = await import('../server.ts');
    }
  } catch (e: any) {
    console.error('[Vercel API] Failed to load server:', e?.message || e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Server bootstrap failed',
      detail: String(e?.message || e),
      hint: 'Check Vercel Environment Variables: JWT_SECRET (>=32 chars), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_USERNAME, OWNER_PASSWORD. See VERCEL_ENV_FIX.md'
    }));
    return;
  }

  // Grab the named export before unwrapping `default` below.
  const flushPendingWrites: undefined | (() => Promise<void>) =
    mod && typeof mod.flushPendingWrites === 'function' ? mod.flushPendingWrites : undefined;

  // Handle both direct default export and { default: ... } interop
  let appOrPromise: any = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
  const app = await (typeof appOrPromise === 'function' || (appOrPromise && typeof appOrPromise.then === 'function')
    ? appOrPromise
    : Promise.resolve(appOrPromise));

  // Express dispatches the request asynchronously (it finishes by calling
  // res.end()) — simply calling `app(req, res)` and returning does NOT wait
  // for the response to actually be sent. Previously this handler returned
  // immediately after kicking off Express, so Vercel could freeze/recycle
  // the instance before the response finished, and — more importantly —
  // before any pending database write (registering a user, creating a post,
  // sending a message, etc.) had actually reached Supabase. That silent data
  // loss is a primary reason the app "worked" for a single request but
  // users/posts/messages randomly disappeared on the next one.
  //
  // Fix: wait for the response to actually finish, then flush any in-flight
  // cloud writes, and only THEN let this handler's promise resolve — which
  // is what tells Vercel the invocation is really done.
  await new Promise<void>((resolve) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    app(req, res);
  });

  if (flushPendingWrites) {
    try {
      await flushPendingWrites();
    } catch (err: any) {
      console.error('[Vercel API] flushPendingWrites failed:', err?.message || err);
    }
  }
}
