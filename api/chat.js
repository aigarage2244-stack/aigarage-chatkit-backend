export const config = {
  api: {
    bodyParser: true, // allow Next to parse urlencoded + json
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1) Accept both JSON and x-www-form-urlencoded with `payload=...`
    let payload = req.body;

    // If Shopify proxy sent `payload=...`
    if (payload && typeof payload === "object" && "payload" in payload) {
      payload = payload.payload;
    }

    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return res
          .status(400)
          .json({ ok: false, reply: "Bad payload JSON in 'payload' string." });
      }
    }

    const messages = payload?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ ok: false, reply: "Missing 'messages' array in payload." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        reply: "OPENAI_API_KEY is not set in the environment.",
      });
    }

    // 2) Call OpenAI (pick a model you have access to)
    const oaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // or gpt-4o-mini if your account supports it
        messages,
      }),
    });

    if (!oaiResp.ok) {
      const text = await oaiResp.text();
      console.error("OpenAI non-OK:", oaiResp.status, text);
      return res.status(502).json({
        ok: false,
        reply: "OpenAI API returned an error.",
        status: oaiResp.status,
        raw: text, // ← temporary to debug; remove later
      });
    }

    const data = await oaiResp.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No response from the model.";

    return res.json({ ok: true, reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      ok: false,
      reply: "Internal server error.",
      detail: String(err), // temporary for debugging
    });
  }
}
