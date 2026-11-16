// functions/api/upload.js
export async function onRequestPost(context) {
  try {
    const contentType = context.request.headers.get('content-type') || '';
    
    // Check if multipart form data
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await context.request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No valid file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Limit file size to 25MB (Cloudflare KV limit)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'Размер файла превышает лимит 25 МБ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fileExt = file.name.split('.').pop().toLowerCase();
    const cleanId = 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const mimeType = file.type || 'application/octet-stream';
    const buffer = await file.arrayBuffer();

    // Store in Cloudflare KV
    await context.env.ZAKERII_DATA.put(`media:${cleanId}`, buffer, {
      metadata: {
        contentType: mimeType,
        fileName: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
      }
    });

    const fileUrl = `/api/media/${cleanId}`;

    return new Response(JSON.stringify({
      success: true,
      url: fileUrl,
      fileName: file.name,
      fileId: cleanId,
      mimeType,
      size: file.size
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
