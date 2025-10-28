// --- /api/chat.js ---
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Read the raw body (Shopify sends x-www-form-urlencoded)
      const raw = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data));
      });

      // Parse body and extract payload
      const contentType = (req.headers["content-type"] || "").toLowerCase();
      let payload = {};
      if (contentType.includes("application/json")) {
        payload = JSON.parse(raw);
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(raw);
        const p = params.get("payload");
        payload = p ? JSON.parse(p) : Object.fromEntries(params.entries());
      }

      const messages = payload.messages || [];
      const userMessage =
        messages[messages.length - 1]?.content || "Hello there!";

      // --- Call OpenAI Chat Completion ---
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey)
        throw new Error("Missing OpenAI API key in environment variables.");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo", // or "gpt-5" if available on your account
          messages: [
            {
              role: "system",
              content:
                "You are a friendly AI assistant embedded in the AIGarage chat window. Respond helpfully, concisely, and clearly.",
            },
            ...messages,
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      const aiReply =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Sorry, I couldn't generate a response right now.";

      return res.status(200).json({
        ok: true,
        reply: aiReply,
        ts: Date.now(),
      });
    } catch (error) {
      console.error("Chat API error:", error);
      return res
        .status(500)
        .json({ error: "Server error", details: error.message });
    }
  } else if (req.method === "GET") {
    return res
      .status(200)
      .json({ ok: true, hint: "Use POST with {payload}", ts: Date.now() });
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
}
