// functions/api/media/[id].js
export async function onRequestGet(context) {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response('Not Found', { status: 404 });
    }

    const item = await context.env.ZAKERII_DATA.getWithMetadata(`media:${id}`, { type: 'arrayBuffer' });
    if (!item || !item.value) {
      return new Response('File not found in storage', { status: 404 });
    }

    const contentType = (item.metadata && item.metadata.contentType) || 'application/octet-stream';

    return new Response(item.value, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response('Error retrieving media: ' + err.message, { status: 500 });
  }
}
