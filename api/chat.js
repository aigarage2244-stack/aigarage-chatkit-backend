export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ctype = (req.headers["content-type"] || "").toLowerCase();
    const raw = await new Promise((resolve) => {
      let data = ""; req.on("data", c => data += c); req.on("end", () => resolve(data));
    });

    let payload = {};
    if (ctype.includes("application/json")) {
      payload = raw ? JSON.parse(raw) : {};
    } else if (ctype.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(raw);
      const p = params.get("payload");
      payload = p ? JSON.parse(p) : Object.fromEntries(params.entries());
    }

    const { system, messages = [], model = "gpt-4o-mini" } = payload;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY missing" });

    const chatMessages = [];
    if (system) chatMessages.push({ role: "system", content: system });
    for (const m of messages) if (m?.role && m?.content) chatMessages.push(m);

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: chatMessages, temperature: 0.7, max_tokens: 500 })
    });

    if (!r.ok) return res.status(502).json({ error: "openai_error", detail: await r.text() });
    const data = await r.json();
    return res.status(200).json({ reply: data?.choices?.[0]?.message?.content ?? "" });
  } catch (e) {
    console.error("chat error", e);
    return res.status(500).json({ error: "server_error" });
  }
}

