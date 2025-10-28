// pages/api/chat.js

export const config = {
  api: {
    bodyParser: true,           // allow Next.js to parse JSON or urlencoded
    sizeLimit: '1mb',
  },
};

function parseMessagesFromRequest(req) {
  const ct = req.headers['content-type'] || '';

  // Case A: JSON body
  if (ct.includes('application/json')) {
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid JSON body');
    }
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      throw new Error('Missing "messages" array in JSON body');
    }
    return messages;
  }

  // Case B: x-www-form-urlencoded with a JSON string in "payload"
  if (ct.includes('application/x-www-form-urlencoded')) {
    const payloadRaw = req.body?.payload;
    if (!payloadRaw) throw new Error('Missing "payload" in form body');

    let data;
    try {
      data = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw;
    } catch (e) {
      throw new Error('Invalid JSON in "payload"');
    }

    if (!Array.isArray(data?.messages)) {
      throw new Error('Missing "messages" array in payload');
    }
    return data.messages;
  }

  // Anything else
  throw new Error(`Unsupported Content-Type: ${ct}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic env guard
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  }

  let messages;
  try {
    messages = parseMessagesFromRequest(req);
  } catch (err) {
    console.error('Parse error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  try {
    // Call OpenAI
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // or the model you prefer
        messages,
      }),
    });

    const json = await r.json();

    if (!r.ok) {
      // Bubble up clear errors (e.g., 429 quota)
      console.error('OpenAI non-OK:', r.status, json);
      return res.status(r.status).json(json);
    }

    const reply = json?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ ok: true, reply });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
