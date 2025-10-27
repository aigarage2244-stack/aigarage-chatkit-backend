export default function handler(req, res) {
  res.status(200).send(`
    <html>
      <head><title>AI Chat Proxy</title></head>
      <body style="font-family:system-ui;margin:24px">
        <h1>AI Chat Proxy Backend</h1>
        <p>Status: OK ✅</p>
        <p><a href="/api/health">API health</a></p>
      </body>
    </html>
  `);
}

