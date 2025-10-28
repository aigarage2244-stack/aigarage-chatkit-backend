export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse payload (Shopify proxy sends as form-urlencoded)
    const ctype = (req.headers["content-type"] || "").toLowerCase();
    const raw = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
    });

    let payload = {};
    if (ctype.includes("application/json")) {
      payload = JSON.parse(raw || "{}");
    } else if (ctype.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(raw);
      const p = params.get("payload");
      payload = p ? JSON.parse(p) : Object.fromEntries(params.entries());
    }

    const message = payload?.messages?.[0]?.content || "No message received";
    return res.status(200).json({ ok: true, echo: message });
  } catch (err) {
    console.error("Error in chat handler:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
}
