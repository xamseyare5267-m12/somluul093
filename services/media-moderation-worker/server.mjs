import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { GoogleGenAI } from '@google/genai';
const exec=promisify(execFile);
const app=express(); app.use(express.json({limit:'64kb'}));
const PORT=Number(process.env.PORT||8080);
const secret=process.env.MEDIA_MODERATION_WEBHOOK_TOKEN||'';
const supabaseUrl=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const aiKey=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||'';
const ai=aiKey?new GoogleGenAI({apiKey:aiKey}):null;
function auth(req){const got=String(req.headers.authorization||''); const expected=`Bearer ${secret}`; if(!secret||got.length!==expected.length)return false; return crypto.timingSafeEqual(Buffer.from(got),Buffer.from(expected));}
async function downloadObject(objectKey){
  if(!supabaseUrl||!supabaseKey) throw new Error('Supabase storage credentials missing');
  const u=`${supabaseUrl}/storage/v1/object/authenticated/${encodeURIComponent(process.env.SUPABASE_BUCKET||'files-bucket')}/${String(objectKey).split('/').map(encodeURIComponent).join('/')}`;
  const r=await fetch(u,{headers:{Authorization:`Bearer ${supabaseKey}`,apikey:supabaseKey}}); if(!r.ok)throw new Error(`storage download failed: ${r.status}`);
  const b=Buffer.from(await r.arrayBuffer()); if(b.length>1024*1024*1024)throw new Error('media too large'); return b;
}
async function verdictForImage(buf,mime){
  if(!ai)throw new Error('Gemini is not configured');
  const out=await ai.models.generateContent({model:process.env.GEMINI_MODERATION_MODEL||'gemini-2.5-flash',contents:[{role:'user',parts:[{text:'Return exactly ALLOW or BLOCK. BLOCK pornography, explicit sexual activity, visible genitals intended for sexual content, or exploitative sexual imagery. Otherwise ALLOW.'},{inlineData:{mimeType:mime,data:buf.toString('base64')}}]}]});
  return String(out?.text||'').trim().toUpperCase().includes('ALLOW')?'ALLOW':'BLOCK';
}
async function moderateVideo(buf){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'somluul-mod-')); const input=path.join(dir,'video'); await fs.writeFile(input,buf);
  const pattern=path.join(dir,'frame-%02d.jpg');
  await exec(ffmpegPath,['-hide_banner','-loglevel','error','-i',input,'-vf','fps=1/5,scale=w=min(960\,iw):h=-2','-frames:v','12',pattern],{timeout:90000});
  const files=(await fs.readdir(dir)).filter(x=>x.endsWith('.jpg')).sort(); let blocked=false;
  for(const f of files){const b=await fs.readFile(path.join(dir,f)); if((await verdictForImage(b,'image/jpeg'))==='BLOCK'){blocked=true;break;}}
  await fs.rm(dir,{recursive:true,force:true}); return blocked?'BLOCK':'ALLOW';
}
app.get('/health',(req,res)=>res.json({ok:true,geminiConfigured:!!ai,storageConfigured:!!(supabaseUrl&&supabaseKey)}));
app.post('/moderate',async(req,res)=>{
  try{if(!auth(req))return res.status(401).json({approved:false,error:'Unauthorized'}); const {mediaId,objectKey,contentType}=req.body||{}; if(!mediaId||!objectKey)return res.status(400).json({approved:false,error:'mediaId and objectKey required'}); const b=await downloadObject(objectKey); const type=String(contentType||''); const v=type.startsWith('video/')?await moderateVideo(b):await verdictForImage(b,type||'image/jpeg'); return res.json({approved:v==='ALLOW',verdict:v,mediaId});}
  catch(e){console.error(e);res.status(500).json({approved:false,error:'moderation_failed'});}
});
app.listen(PORT,()=>console.log(`SomLuul media moderation worker listening on ${PORT}`));
