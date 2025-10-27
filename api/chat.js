export default async function handler(req, res) {
  // CORS (harmless behind proxy)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // --- Parse body: JSON or x-www-form-urlencoded (Shopify App Proxy default) ---
    const ctype = (req.headers['content-type'] || '').toLowerCase();
    const raw = await new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data || ''));
    });

    let payload = {};
    if (ctype.includes('application/json')) {
      payload = raw ? JSON.parse(raw) : {};
    } else if (ctype.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(raw);
      // We’ll send everything in a `payload` field from the front-end
      const p = params.get('payload');
      payload = p ? JSON.parse(p) : Object.fromEntries(params.entries());
    } else {
      // Try JSON as a last resort
      try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    }

    const { messages = [], system, model } = payload;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

    const chatMessages = [];
    if (system) chatMessages.push({ role: 'system', content: system });
    for (const m of messages) {
      if (m?.role && m?.content) chatMessages.push({ role: m.role, content: String(m.content).slice(0, 8000) });
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(502).json({ error: 'openai_error', detail });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ reply });
  } catch (e) {
    console.error('chat error', e);
    return res.status(500).json({ error: 'server_error' });
  }
}
