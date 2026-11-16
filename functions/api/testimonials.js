// functions/api/testimonials.js
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const isPublic = url.searchParams.get('public') === 'true';
    let data = (await context.env.ZAKERII_DATA.get('testimonials', 'json')) || [];

    if (isPublic) {
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
      // Incoming from public client
      const newReview = {
        id: 'rev_' + Date.now(),
        author: body.author || 'Cliente anónimo',
        project: body.project || 'Servicio creativo',
        platform: body.platform || 'Web',
        rating: Number(body.rating) || 5,
        text: body.text || '',
        status: 'pending', // Requires admin approval!
        date: new Date().toLocaleDateString()
      };
      list.unshift(newReview);
    } else if (action === 'approve') {
      list = list.map(t => {
        if (t.id === body.id) {
          return { ...t, status: 'approved' };
        }
        return t;
      });
    } else if (action === 'reject' || action === 'delete') {
      list = list.filter(t => t.id !== body.id);
    }

    await context.env.ZAKERII_DATA.put('testimonials', JSON.stringify(list));

    return new Response(JSON.stringify({ success: true, list }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
