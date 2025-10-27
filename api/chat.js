// POST /api/chat  (storefront calls it as /apps/aichat/chat via App Proxy)
export default async function handler(req, res) {
  // Allow CORS when you test directly against Vercel; harmless behind proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages = [], system, model } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

    // Build OpenAI chat payload
    const chatMessages = [];
    if (system) chatMessages.push({ role: 'system', content: system });
    // Expect messages like [{role:'user', content:'hi'}, {role:'assistant', content:'...'}, ...]
    for (const m of messages) {
      if (!m?.role || !m?.content) continue;
      chatMessages.push({ role: m.role, content: String(m.content).slice(0, 8000) });
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!r.ok) {
      const err = await r.text().catch(() => '');
      return res.status(502).json({ error: 'openai_error', detail: err });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ reply });
  } catch (e) {
    console.error('chat error', e);
    return res.status(500).json({ error: 'server_error' });
  }
}
