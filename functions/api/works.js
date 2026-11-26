// functions/api/works.js
export async function onRequestGet(context) {
  try {
    let works = (await context.env.ZAKERII_DATA.get('works', 'json')) || [];

    // Enrich legacy /api/media/<id> works (saved without extension or mediaType) using KV metadata
    const needsMeta = works.some(
      w => w && w.fileName && w.fileName.startsWith('/api/media/') && !w.mediaType && !/\.[a-z0-9]+(\?.*)?$/i.test(w.fileName)
    );
    if (needsMeta) {
      const listed = await context.env.ZAKERII_DATA.list({ prefix: 'media:' });
      const metaMap = new Map();
      for (const k of (listed.keys || [])) {
        if (k.metadata) metaMap.set(k.name, k.metadata);
      }
      works = works.map(w => {
        if (w && w.fileName && w.fileName.startsWith('/api/media/') && !w.mediaType) {
          const rawId = w.fileName.replace('/api/media/', '').split('?')[0];
          const keyId = rawId.replace(/\.[a-zA-Z0-9]+$/, '');
          const meta = metaMap.get(`media:${keyId}`) || metaMap.get(`media:${rawId}`);
          if (meta && meta.contentType) {
            return {
              ...w,
              mediaType: meta.contentType.startsWith('video/') ? 'video' : 'image'
            };
          }
        }
        return w;
      });
    }

    return new Response(JSON.stringify(works), {
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
    const action = body.action || 'save_all';
    let works = (await context.env.ZAKERII_DATA.get('works', 'json')) || [];

    if (action === 'save_all') {
      works = body.works || [];
    } else if (action === 'add') {
      const newWork = {
        id: 'work_' + Date.now(),
        title: body.title,
        category: body.category || 'anim video',
        fileName: body.fileName,
        mediaType: body.mediaType || '',
        caseStudyUrl: body.caseStudyUrl || '',
        caseStudyLabel: body.caseStudyLabel || '',
        tags: body.tags || '',
        desc: body.desc || '',
        visible: true,
        featuredInCarousel: body.featuredInCarousel ?? true,
        createdAt: new Date().toISOString()
      };
      works.unshift(newWork);
    } else if (action === 'toggle_visibility') {
      works = works.map(w => {
        if (w.id === body.id) {
          return { ...w, visible: !w.visible };
        }
        return w;
      });
    } else if (action === 'toggle_carousel') {
      works = works.map(w => {
        if (w.id === body.id) {
          return { ...w, featuredInCarousel: !w.featuredInCarousel };
        }
        return w;
      });
    } else if (action === 'edit' || action === 'update') {
      works = works.map(w => {
        if (w.id === body.id) {
          return {
            ...w,
            title: body.title !== undefined ? body.title : w.title,
            category: body.category !== undefined ? body.category : w.category,
            tags: body.tags !== undefined ? body.tags : w.tags,
            desc: body.desc !== undefined ? body.desc : w.desc,
            fileName: body.fileName ? body.fileName : w.fileName,
            mediaType: body.mediaType !== undefined ? body.mediaType : w.mediaType,
            caseStudyUrl: body.caseStudyUrl !== undefined ? body.caseStudyUrl : w.caseStudyUrl,
            caseStudyLabel: body.caseStudyLabel !== undefined ? body.caseStudyLabel : w.caseStudyLabel,
            visible: body.visible !== undefined ? body.visible : w.visible,
            featuredInCarousel: body.featuredInCarousel !== undefined ? body.featuredInCarousel : w.featuredInCarousel,
            updatedAt: new Date().toISOString()
          };
        }
        return w;
      });
    } else if (action === 'delete') {
      works = works.filter(w => w.id !== body.id);
    }

    await context.env.ZAKERII_DATA.put('works', JSON.stringify(works));

    return new Response(JSON.stringify({ success: true, works }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
