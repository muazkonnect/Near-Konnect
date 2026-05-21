import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function verifySignature(secret: string, signatureHeader: string | null, raw: string): Promise<boolean> {
  if (!signatureHeader) return false;
  // Persona format: t=timestamp,v1=hex
  const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.split('=')));
  const ts = parts.t; const sig = parts.v1;
  if (!ts || !sig) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${ts}.${raw}`));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === sig;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const raw = await req.text();
    const secret = Deno.env.get('PERSONA_WEBHOOK_SECRET');
    const sigHeader = req.headers.get('persona-signature');
    if (secret) {
      const ok = await verifySignature(secret, sigHeader, raw);
      if (!ok) return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const body = JSON.parse(raw);
    const payload = body?.data?.attributes?.payload?.data ?? body?.data ?? {};
    const inquiryId = payload?.id ?? body?.data?.id;
    const status = payload?.attributes?.status ?? body?.data?.attributes?.status;
    if (!inquiryId) return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: row } = await admin.from('worker_verifications').select('id, status').eq('persona_inquiry_id', inquiryId).maybeSingle();
    if (!row) return new Response(JSON.stringify({ ok: true, unknown: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await admin.from('worker_verifications').update({
      persona_status: status,
      persona_payload: body,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);

    const { data: settings } = await admin.from('verification_settings').select('auto_approve_on_persona_pass').eq('id', 1).maybeSingle();
    const passed = ['completed', 'approved', 'passed'].includes(String(status || '').toLowerCase());
    if (passed && settings?.auto_approve_on_persona_pass && row.status !== 'approved') {
      await admin.rpc('admin_decide_verification', { p_id: row.id, p_status: 'approved', p_note: 'Auto-approved by Persona webhook' });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
