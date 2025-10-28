// --- /api/chat.js ---
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const messages = body.messages || [];

    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        ok: true,
        reply: "Missing OpenAI API key in environment.",
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI error:", error);
      return res.json({
        ok: false,
        reply: "OpenAI API returned an error.",
        error,
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response from model.";

    return res.json({ ok: true, reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ ok: false, reply: "Internal server error." });
  }
}

