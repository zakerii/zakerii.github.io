// functions/api/keys.js — Securely store & retrieve Studio API keys in Cloudflare KV (requires valid admin session token)

async function verifyToken(env, token) {
  if (!token) return false;
  const user = await env.ZAKERII_DATA.get(`session:${token}`);
  return Boolean(user);
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { action, token } = body;

    const isValid = await verifyToken(context.env, token);
    if (!isValid) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'get') {
      const keys = await context.env.ZAKERII_DATA.get('studio_api_keys', 'json');
      return new Response(JSON.stringify({ success: true, keys: keys || {} }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'save') {
      const keys = {
        gemini_api_key: (body.gemini_api_key || '').trim(),
        gemini_model: (body.gemini_model || 'gemini-3.8-flash').trim(),
        openai_api_key: (body.openai_api_key || '').trim(),
        elevenlabs_api_key: (body.elevenlabs_api_key || '').trim(),
        elevenlabs_voice_id: (body.elevenlabs_voice_id || '8MhCWEuHC2ZUfOxpeUvH').trim()
      };
      await context.env.ZAKERII_DATA.put('studio_api_keys', JSON.stringify(keys));
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
