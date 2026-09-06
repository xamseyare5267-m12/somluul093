import crypto from 'node:crypto';
type Bucket = { count:number; resetAt:number };
const local = new Map<string,Bucket>();
const MAX_KEYS = 20000;
function localLimit(key:string,limit:number,windowSec:number){
  const now=Date.now(), old=local.get(key);
  if(!old||old.resetAt<=now){
    if(local.size>=MAX_KEYS){ for(const [k,v] of local){ if(v.resetAt<=now||local.size>MAX_KEYS*.9) local.delete(k); if(local.size<MAX_KEYS*.9) break; } }
    local.set(key,{count:1,resetAt:now+windowSec*1000});
    return {allowed:true,remaining:Math.max(0,limit-1)};
  }
  old.count++;
  return {allowed:old.count<=limit,remaining:Math.max(0,limit-old.count)};
}
async function upstash(key:string,limit:number,windowSec:number){
  const url=process.env.UPSTASH_REDIS_REST_URL?.trim(), token=process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if(!url||!token) return null;
  const hash=crypto.createHash('sha256').update(key).digest('hex');
  const r=await fetch(`${url.replace(/\/$/,'')}/pipeline`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify([
    ['INCR',`somluul:rl:${hash}`],['EXPIRE',`somluul:rl:${hash}`,String(Math.max(1,windowSec)),'NX'],['TTL',`somluul:rl:${hash}`]
  ])});
  if(!r.ok) throw new Error(`Upstash HTTP ${r.status}`);
  const d:any[]=await r.json(), count=Number(d?.[0]?.result||0);
  return {allowed:count<=limit,remaining:Math.max(0,limit-count)};
}
export async function distributedRateLimit(key:string,limit:number,windowSec:number){
  try{const r=await upstash(key,limit,windowSec); if(r) return {...r,distributed:true};}
  catch(e:any){console.warn('[RateLimit] distributed limiter unavailable:',e?.message||e)}
  return {...localLimit(key,limit,windowSec),distributed:false};
}
export function rateLimitStats(){return {mode:process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN?'upstash-rest':'local-fallback',localKeys:local.size};}
