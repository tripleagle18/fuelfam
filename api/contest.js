export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action, ...params } = req.body;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  async function db(table, method, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (options.filter) url += '?' + options.filter;
    const resp = await fetch(url, {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || (method === 'POST' ? 'return=representation' : 'return=representation')
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error(e); }
    const text = await resp.text();
    return text ? JSON.parse(text) : null;
  }

  try {
    if (action === 'send_invite') {
      const { contest_id, contest_name, inviter_name, email, join_code, base_url } = params;
      const RESEND_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_KEY) return res.status(200).json({ ok: true, note: 'No email service configured' });
      const joinUrl = `${base_url}?join=${join_code}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ChallengePac <noreply@challengepac.app>',
          to: email,
          subject: `${inviter_name} invited you to join "${contest_name}" on ChallengePac!`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;">
              <div style="background:linear-gradient(135deg,#16A34A,#EA580C);padding:32px;text-align:center;border-radius:16px 16px 0 0;">
                <h1 style="color:#fff;font-size:28px;margin:0;">⚡ ChallengePac</h1>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">compete · track · win together</p>
              </div>
              <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;border:1px solid #E5E7EB;">
                <h2 style="color:#1E1B4B;">You've been challenged!</h2>
                <p style="color:#6B7280;font-size:16px;"><strong>${inviter_name}</strong> invited you to join the contest <strong>"${contest_name}"</strong>.</p>
                <a href="${joinUrl}" style="display:block;background:linear-gradient(135deg,#16A34A,#EA580C);color:#fff;text-decoration:none;padding:16px;border-radius:12px;text-align:center;font-size:18px;font-weight:700;margin:24px 0;">Join the Contest →</a>
                <p style="color:#6B7280;font-size:14px;">Or use join code: <strong style="font-size:20px;color:#16A34A;letter-spacing:2px;">${join_code}</strong></p>
                <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;">
                <p style="color:#9CA3AF;font-size:12px;text-align:center;">
                  <strong>Add ChallengePac to your home screen:</strong><br>
                  iPhone: Open in Safari → Share → Add to Home Screen<br>
                  Android: Open in Chrome → Menu → Add to Home Screen
                </p>
              </div>
            </div>`
        })
      });
      return res.status(200).json({ ok: true });
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}
