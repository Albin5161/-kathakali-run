const COUNTER_KEY = 'kathakali:total-players';

module.exports = async function handler(req, res) {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'KV not configured' });
  }

  const headers = { Authorization: `Bearer ${token}` };

  try {
    let count;

    if (req.method === 'POST') {
      const r = await fetch(`${url}/incr/${COUNTER_KEY}`, { method: 'POST', headers });
      const d = await r.json();
      count   = Number(d.result);
    } else {
      const r = await fetch(`${url}/get/${COUNTER_KEY}`, { headers });
      const d = await r.json();
      count   = d.result !== null ? Number(d.result) : 0;
    }

    res.json({ count });
  } catch {
    res.status(500).json({ error: 'counter unavailable' });
  }
};
