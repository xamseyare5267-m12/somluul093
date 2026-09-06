import crypto from 'node:crypto';
import { restGet, restPost, supabaseConfig, isScaleMode } from './supabaseRest.js';
export const canUseWalletRepo=()=>isScaleMode()&&!!supabaseConfig();
export async function getWallet(userId:string){
 const rows=await restGet<any[]>(`wallet_accounts?user_id=eq.${encodeURIComponent(userId)}&limit=1`);
 if(rows?.[0]) return rows[0];
 const created=await restPost<any[]>('wallet_accounts',{user_id:userId,balance:0,coins:0},{prefer:'resolution=ignore-duplicates,return=representation'});
 return created?.[0]||{user_id:userId,balance:0,coins:0};
}
export async function applyWalletEntry(i:{userId:string;balanceDelta?:number;coinsDelta?:number;kind:string;reason?:string;refType?:string;refId?:string;ledgerId?:string}){
 const cfg=supabaseConfig(); if(!cfg) throw new Error('Supabase is not configured');
 const r=await fetch(`${cfg.url}/rest/v1/rpc/wallet_apply_entry`,{method:'POST',headers:{Authorization:`Bearer ${cfg.key}`,apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:i.userId,p_balance_delta:Number(i.balanceDelta||0),p_coins_delta:Math.trunc(Number(i.coinsDelta||0)),p_kind:i.kind,p_currency:'USD',p_reason:i.reason||null,p_ref_type:i.refType||null,p_ref_id:i.refId||null,p_ledger_id:i.ledgerId||crypto.randomUUID()})});
 const text=await r.text(); if(!r.ok) throw new Error(text||`wallet rpc failed (${r.status})`); const d=text?JSON.parse(text):[]; return Array.isArray(d)?d[0]:d;
}
