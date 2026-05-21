import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: settings } = await supabase.from('verification_settings').select('*').eq('id', 1).maybeSingle();
    const templateId = settings?.persona_template_id || Deno.env.get('PERSONA_TEMPLATE_ID') || '';
    const envId = settings?.persona_environment_id || '';
    const apiKey = Deno.env.get('PERSONA_API_KEY');

    if (!apiKey || !templateId) {
      // Demo / placeholder mode — return a mock inquiry so flow is end-to-end testable.
      return new Response(JSON.stringify({
        demo: true,
        inquiry_id: `demo_${crypto.randomUUID()}`,
        session_token: null,
        template_id: templateId,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const res = await fetch('https://api.withpersona.com/api/v1/inquiries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Persona-Version': '2023-01-05',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            'inquiry-template-id': templateId,
            ...(envId ? { 'environment-id': envId } : {}),
            'reference-id': user.id,
          },
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: 'Persona create failed', detail: json }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const inquiryId = json?.data?.id;
    const sessionToken = json?.meta?.['session-token'] || null;
    return new Response(JSON.stringify({ demo: false, inquiry_id: inquiryId, session_token: sessionToken, template_id: templateId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
