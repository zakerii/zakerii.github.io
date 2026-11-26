// functions/api/auth.js

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getStoredCredentials(env) {
  const stored = await env.ZAKERII_DATA.get('admin_credentials', 'json');
  if (stored && stored.username && stored.passwordHash) {
    return stored;
  }
  // Initial bootstrap only if no credentials exist in KV yet
  const defaultPass = env.ADMIN_PASS || 'zakerii2026';
  return {
    username: env.ADMIN_USER || 'admin',
    passwordHash: await sha256(defaultPass)
  };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { action } = body;

    if (action === 'login') {
      const clientIp = context.request.headers.get('CF-Connecting-IP') || 'unknown';
      const rateKey = `login_fail:${clientIp}`;
      const fails = Number((await context.env.ZAKERII_DATA.get(rateKey)) || '0');
      if (fails >= 8) {
        return new Response(JSON.stringify({ success: false, error: 'Слишком много попыток входа. Повторите через 15 минут.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const username = (body.username || '').trim().toLowerCase();
      const password = body.password || '';
      const creds = await getStoredCredentials(context.env);
      const inputHash = await sha256(password);

      if (username === creds.username.toLowerCase() && inputHash === creds.passwordHash) {
        if (fails > 0) await context.env.ZAKERII_DATA.delete(rateKey);
        const token = crypto.randomUUID();
        await context.env.ZAKERII_DATA.put(`session:${token}`, creds.username, { expirationTtl: 86400 });
        return new Response(JSON.stringify({ success: true, token }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await context.env.ZAKERII_DATA.put(rateKey, String(fails + 1), { expirationTtl: 900 });
      return new Response(JSON.stringify({ success: false, error: 'Неверный логин или пароль' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'verify') {
      const token = body.token || '';
      if (!token) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const user = await context.env.ZAKERII_DATA.get(`session:${token}`);
      return new Response(JSON.stringify({ valid: Boolean(user) }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'change_password') {
      const token = body.token || '';
      const user = token ? await context.env.ZAKERII_DATA.get(`session:${token}`) : null;
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Сессия истекла, войдите заново' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const newUsername = (body.newUsername || user).trim();
      const newPassword = body.newPassword || '';
      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ success: false, error: 'Минимум 6 символов' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const newHash = await sha256(newPassword);
      await context.env.ZAKERII_DATA.put('admin_credentials', JSON.stringify({
        username: newUsername,
        passwordHash: newHash
      }));

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'logout') {
      const token = body.token || '';
      if (token) {
        await context.env.ZAKERII_DATA.delete(`session:${token}`);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
