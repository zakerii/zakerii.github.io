// functions/api/testimonials.js
async function verifyAdmin(context, bodyToken = '') {
  const authHeader = context.request.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = bearer || bodyToken || '';
  if (!token) return false;
  const user = await context.env.ZAKERII_DATA.get(`session:${token}`);
  return Boolean(user);
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const isPublic = url.searchParams.get('public') === 'true';
    const isAdmin = !isPublic && (await verifyAdmin(context));
    let data = (await context.env.ZAKERII_DATA.get('testimonials', 'json')) || [];

    if (isPublic || !isAdmin) {
      data = data.filter(t => t.status === 'approved');
    }

    return new Response(JSON.stringify(data), {
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
    const action = body.action || 'submit';
    let list = (await context.env.ZAKERII_DATA.get('testimonials', 'json')) || [];

    if (action === 'submit') {
      // Incoming from public client (with length limits)
      const newReview = {
        id: 'rev_' + Date.now(),
        author: String(body.author || 'Cliente anónimo').slice(0, 80),
        project: String(body.project || 'Servicio creativo').slice(0, 120),
        platform: String(body.platform || 'Web').slice(0, 40),
        rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
        text: String(body.text || '').slice(0, 1000),
        status: 'pending', // Requires admin approval!
        date: new Date().toLocaleDateString()
      };
      list.unshift(newReview);
    } else if (action === 'approve' || action === 'reject' || action === 'delete') {
      if (!(await verifyAdmin(context, body.token))) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized: admin session required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (action === 'approve') {
        list = list.map(t => (t.id === body.id ? { ...t, status: 'approved' } : t));
      } else {
        list = list.filter(t => t.id !== body.id);
      }
    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
    }

    await context.env.ZAKERII_DATA.put('testimonials', JSON.stringify(list));

    return new Response(JSON.stringify({ success: true, list }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
