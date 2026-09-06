import { randomUUID } from 'node:crypto';
import { restGet, restPost, restPatch, supabaseConfig, isScaleMode } from './supabaseRest.js';

export const canUseLiveRepo = () => isScaleMode() && !!supabaseConfig();

function mapLive(row:any){
  const profile = row?.profiles || {};
  return {
    ...row,
    id: row.id,
    hostId: row.host_id,
    hostName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || row.host_name || 'User',
    hostAvatar: profile.avatar || row.host_avatar || null,
    title: row.title,
    status: row.status,
    viewers: Number(row.viewer_count || 0),
    likes: Number(row.likes || 0),
    loves: Number(row.loves || 0),
    roomName: row.room_name || null,
    provider: row.provider || 'livekit',
    created_at: row.started_at || row.created_at,
  };
}

export async function listLiveRows(){
  const rows=await restGet<any[]>('live_streams?status=eq.live&order=started_at.desc&select=*,profiles(first_name,last_name,avatar)');
  return (rows||[]).map(mapLive);
}
export async function getLiveRow(id:string){
  const rows=await restGet<any[]>(`live_streams?id=eq.${encodeURIComponent(id)}&limit=1&select=*,profiles(first_name,last_name,avatar)`);
  return rows?.[0] ? mapLive(rows[0]) : null;
}
export async function createLiveRow(i:{id:string;hostId:string;title:string;roomName?:string;provider?:string}){
  const r=await restPost<any[]>('live_streams',{id:i.id,host_id:i.hostId,title:i.title,status:'live',viewer_count:0,room_name:i.roomName||null,provider:i.provider||'livekit',started_at:new Date().toISOString()});
  return r?.[0]||r;
}
export async function endLiveRow(id:string){await restPatch(`live_streams?id=eq.${encodeURIComponent(id)}&status=eq.live`,{status:'ended',ended_at:new Date().toISOString()},{prefer:'return=minimal'});}
export async function changeViewer(id:string,delta:number){const c=supabaseConfig();if(!c)throw new Error('Supabase is not configured');const r=await fetch(`${c.url}/rest/v1/rpc/live_change_viewer`,{method:'POST',headers:{Authorization:`Bearer ${c.key}`,apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({p_live_id:id,p_delta:delta})});const t=await r.text();if(!r.ok)throw new Error(t||'viewer update failed');return Number(t);}
export async function addLiveComment(id:string,authorId:string,content:string){const row={id:randomUUID(),live_id:id,author_id:authorId,content,created_at:new Date().toISOString()};const r=await restPost<any[]>('live_comments',row);return r?.[0]||r;}
export async function listLiveComments(id:string){return (await restGet<any[]>(`live_comments?live_id=eq.${encodeURIComponent(id)}&order=created_at.asc&limit=200&select=*,profiles(first_name,last_name,avatar)`))||[];}
export async function upsertLiveReaction(id:string,userId:string,reaction:string){await restPost('live_reactions',{live_id:id,user_id:userId,reaction,created_at:new Date().toISOString()},{prefer:'resolution=merge-duplicates,return=minimal'});}
