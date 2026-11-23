// functions/api/media/[id].js
async function loadMediaItem(env, rawId) {
  const keyId = rawId.replace(/\.[a-zA-Z0-9]+$/, '');
  let item = await env.ZAKERII_DATA.getWithMetadata(`media:${keyId}`, { type: 'arrayBuffer' });
  if ((!item || !item.value) && keyId !== rawId) {
    item = await env.ZAKERII_DATA.getWithMetadata(`media:${rawId}`, { type: 'arrayBuffer' });
  }
  return item;
}

export async function onRequestGet(context) {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response('Not Found', { status: 404 });
    }

    const item = await loadMediaItem(context.env, id);
    if (!item || !item.value) {
      return new Response('File not found in storage', { status: 404 });
    }

    const contentType = (item.metadata && item.metadata.contentType) || 'application/octet-stream';
    const totalSize = item.value.byteLength;
    const rangeHeader = context.request.headers.get('range');

    const baseHeaders = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*'
    };

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), totalSize - 1) : totalSize - 1;

        if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
          return new Response(null, {
            status: 416,
            headers: {
              ...baseHeaders,
              'Content-Range': `bytes */${totalSize}`
            }
          });
        }

        const chunk = item.value.slice(start, end + 1);
        return new Response(chunk, {
          status: 206,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Content-Length': String(chunk.byteLength)
          }
        });
      }
    }

    return new Response(item.value, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Length': String(totalSize)
      }
    });
  } catch (err) {
    return new Response('Error retrieving media: ' + err.message, { status: 500 });
  }
}

export async function onRequestHead(context) {
  const res = await onRequestGet(context);
  return new Response(null, { status: res.status, headers: res.headers });
}
