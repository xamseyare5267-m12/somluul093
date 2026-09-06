/**
 * Direct-to-object-storage uploads (CDN-friendly).
 * Large media should NEVER pass through the serverless function body.
 *
 * Flow:
 * 1. Client requests POST /api/media/sign
 * 2. Server returns signed upload URL + public URL
 * 3. Client PUTs bytes directly to storage
 * 4. Client posts content with the public URL
 */
import { randomUUID } from 'crypto';
import axios from 'axios';
import {
  createSignedUploadUrl,
  publicObjectUrl,
  supabaseConfig,
  restPost,
  restGet,
  restPatch,
} from './supabaseRest.js';

const ALLOWED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4a', 'mp3', 'ogg', 'wav', 'pdf',
]);

const ALLOWED_MIME_PREFIX = ['image/', 'video/', 'audio/', 'application/pdf'];

export function getMediaBucket(): string {
  return process.env.SUPABASE_BUCKET || process.env.GCS_BUCKET_NAME || 'files-bucket';
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function isAllowedMedia(filename: string, mime?: string): boolean {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return false;
  if (mime && !ALLOWED_MIME_PREFIX.some((p) => mime.startsWith(p))) return false;
  // Block SVG / archives for XSS / zip-bomb risk
  if (['svg', 'html', 'htm', 'js', 'zip', 'rar', '7z'].includes(ext)) return false;
  return true;
}

export async function signDirectUpload(input: {
  userId: string;
  filename: string;
  contentType?: string;
  sizeBytes?: number;
}): Promise<{
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  mediaId: string;
  expiresIn: number;
} | null> {
  if (!supabaseConfig()) return null;
  if (!isAllowedMedia(input.filename, input.contentType)) throw new Error('Unsupported media type');
  const size=Number(input.sizeBytes||0), mime=String(input.contentType||'');
  const max=mime.startsWith('video/')?1024*1024*1024:mime.startsWith('image/')?10*1024*1024:mime.startsWith('audio/')?200*1024*1024:50*1024*1024;
  if(!Number.isFinite(size)||size<=0||size>max) throw new Error(`Media file exceeds the allowed ${Math.floor(max/1024/1024)} MB limit.`);
  const mediaId = randomUUID();
  const safe = sanitizeFilename(input.filename);
  const objectKey = `${input.userId}/${mediaId}_${safe}`;
  const bucket = getMediaBucket();
  const signed = await createSignedUploadUrl(bucket, objectKey, 300);
  if (!signed) return null;
  const publicUrl = publicObjectUrl(bucket, objectKey);

  // Registry row (best-effort)
  try {
    await restPost(
      'media_objects',
      {
        id: mediaId,
        owner_id: input.userId,
        bucket,
        object_key: objectKey,
        content_type: input.contentType || null,
        size_bytes: input.sizeBytes || null,
        moderation_status: (process.env.REQUIRE_MEDIA_MODERATION==='1'?'pending':'approved'),
        public_url: publicUrl,
        created_at: new Date().toISOString(),
      },
      { prefer: 'return=minimal' }
    );
  } catch (err: any) {
    console.warn('[Media] registry insert failed:', err?.message || err);
  }

  return {
    uploadUrl: signed.signedUrl,
    publicUrl,
    objectKey,
    mediaId,
    expiresIn: 300,
  };
}

/** Cache-Control headers for static/media responses (CDN edge friendly). */
export function mediaCacheHeaders(kind: 'immutable' | 'short' | 'none' = 'immutable'): Record<string, string> {
  if (kind === 'none') return { 'Cache-Control': 'no-store' };
  if (kind === 'short') return { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400' };
  return {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, max-age=31536000',
  };
}

/** Security + CDN headers for HTML shell. */
export function htmlSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
  };
}

export async function completeDirectUpload(input:{userId:string;mediaId:string;objectKey:string;contentType?:string}){
 const cfg=supabaseConfig(); if(!cfg)throw new Error('Supabase is not configured'); const rows=await restGet<any[]>(`media_objects?id=eq.${encodeURIComponent(input.mediaId)}&owner_id=eq.${encodeURIComponent(input.userId)}&limit=1`); const row=rows?.[0]; if(!row||row.object_key!==input.objectKey)throw new Error('Media object not found');
 if(process.env.REQUIRE_MEDIA_MODERATION!=='1'){await restPatch(`media_objects?id=eq.${encodeURIComponent(input.mediaId)}`,{moderation_status:'approved',moderated_at:new Date().toISOString()},{prefer:'return=minimal'});return{approved:true,status:'approved'};}
 const type=String(input.contentType||row.content_type||'');
 if(type.startsWith('video/')){const u=process.env.MEDIA_MODERATION_WEBHOOK_URL?.trim();if(!u){await restPatch(`media_objects?id=eq.${encodeURIComponent(input.mediaId)}`,{moderation_status:'rejected',moderation_reason:'VIDEO_MODERATION_PROVIDER_REQUIRED',moderated_at:new Date().toISOString()},{prefer:'return=minimal'});return{approved:false,status:'rejected',reason:'Video moderation provider is required.'};}const token=process.env.MEDIA_MODERATION_WEBHOOK_TOKEN?.trim();const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({mediaId:input.mediaId,mediaUrl:row.public_url,objectKey:row.object_key,contentType:type,userId:input.userId})});if(!r.ok)throw new Error(`Video moderation provider returned HTTP ${r.status}`);const d:any=await r.json().catch(()=>({}));if(d?.approved!==true&&String(d?.verdict||'').toUpperCase()!=='ALLOW'){await restPatch(`media_objects?id=eq.${encodeURIComponent(input.mediaId)}`,{moderation_status:'rejected',moderation_reason:'VIDEO_CONTENT_SAFETY_BLOCK',moderated_at:new Date().toISOString()},{prefer:'return=minimal'});return{approved:false,status:'rejected',reason:'Video failed content safety review.'};}await restPatch(`media_objects?id=eq.${encodeURIComponent(input.mediaId)}`,{moderation_status:'approved',moderated_at:new Date().toISOString()},{prefer:'return=minimal'});return{approved:true,status:'approved'};}
 if(!type.startsWith('image/')){await restPatch(`media_objects?id=eq.${encodeURIComponent(input.mediaId)}`,{moderation_status:'approved',moderated_at:new Date().toISOString()},{prefer:'return=minimal'});return{approved:true,status:'approved'};}
 const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||'';if(!key)throw new Error('GEMINI_API_KEY is required when strict media moderation is enabled');const objectUrl=`${cfg.url}/storage/v1/object/authenticated/${encodeURIComponent(row.bucket)}/${String(row.object_key).split('/').map(encodeURIComponent).join('/')}`;const d=await axios.get(objectUrl,{headers:{Authorization:`Bearer ${cfg.key}`,apikey:cfg.key},responseType:'arraybuffer',timeout:20000,maxContentLength:8*1024*1024});const {GoogleGenAI}=await import('@google/genai');const ai=new GoogleGenAI({apiKey:key});const out:any=await ai.models.generateContent({model:process.env.GEMINI_MODERATION_MODEL||'gemini-2.0-flash',contents:[{role:'user',parts:[{text:'Answer only ALLOW or BLOCK. BLOCK explicit sexual activity, visible genitals intended for sexual content, or hardcore pornography. Otherwise ALLOW.'},{inlineData:{mimeType:type,data:Buffer.from(d.data).toString('base64')}}]}]});const verdict=String(out?.text||'').trim().toUpperCase();if(!verdict.includes('ALLOW')){await restPatch(`media_objects?id=eq.${encodeURIComponent(input.mediaId)}`,{moderation_status:'rejected',moderation_reason:'AI_CONTENT_SAFETY_BLOCK',moderated_at:new Date().toISOString()},{prefer:'return=minimal'});return{approved:false,status:'rejected',reason:'Media failed content safety review.'};}await restPatch(`media_objects?id=eq.${encodeURIComponent(input.mediaId)}`,{moderation_status:'approved',moderated_at:new Date().toISOString()},{prefer:'return=minimal'});return{approved:true,status:'approved'};
}
export async function assertPublishedMediaAllowed(userId:string,urls:string[]){if(process.env.REQUIRE_MEDIA_MODERATION!=='1')return;for(const u of urls.filter(Boolean)){const rows=await restGet<any[]>(`media_objects?owner_id=eq.${encodeURIComponent(userId)}&public_url=eq.${encodeURIComponent(String(u))}&moderation_status=eq.approved&limit=1`);if(!rows?.length)throw new Error('Media must pass moderation before publishing.');}}
