// functions/api/links.js
export async function onRequestGet(context) {
  try {
    const data = await context.env.ZAKERII_DATA.get('links', 'json');
    return new Response(JSON.stringify(data || []), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const links = Array.isArray(body) ? body : (body.links || []);
    await context.env.ZAKERII_DATA.put('links', JSON.stringify(links));

    return new Response(JSON.stringify({ success: true, links }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
