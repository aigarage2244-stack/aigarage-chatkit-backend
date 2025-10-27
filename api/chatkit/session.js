
// GET /api/chatkit/session
export default async function handler(req, res) {
  try {
    const { assistantKey = 'default' } = req.query || {};
    const plan = 'free'; // test mode
    const clientToken = 'TEST_TOKEN_FOR_UI_SANITY';
    return res.status(200).json({ clientToken, plan, assistantKey, theme: { color: '#0f172a', radius: 12 } });
  } catch (e) {
    console.error('session error', e);
    return res.status(500).json({ error: 'session_error' });
  }
}
