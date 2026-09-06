import crypto from 'node:crypto';

export function payoutProviderConfigured(){
  return !!process.env.PAYOUT_PROVIDER_URL?.trim() && !!process.env.PAYOUT_PROVIDER_TOKEN?.trim();
}

/** Generic payout adapter. The external provider must perform the regulated bank/mobile-money payout. */
export async function dispatchPayout(input:{withdrawalId:string;userId:string;amount:number;currency:string;bankName:string;accountName:string;accountNumber:string;country:string}){
  const url=process.env.PAYOUT_PROVIDER_URL?.trim();
  const token=process.env.PAYOUT_PROVIDER_TOKEN?.trim();
  if(!url||!token) return {accepted:false,configured:false as const};
  const payload={idempotencyKey:input.withdrawalId,...input};
  const signature=crypto.createHmac('sha256',token).update(JSON.stringify(payload)).digest('hex');
  const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'X-SomLuul-Signature':signature,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const text=await r.text();
  if(!r.ok) throw new Error(text||`Payout provider HTTP ${r.status}`);
  let data:any={}; try{data=JSON.parse(text)}catch{}
  return {accepted:true,configured:true as const,providerRef:String(data?.providerRef||data?.id||input.withdrawalId),data};
}
