// Sends emails through Brevo (free plan: 300 emails a day). Used for password reset codes.
// Needs in server/.env:
//   BREVO_API_KEY=xkeysib-...         (Brevo → SMTP & API → API keys)
//   MAIL_FROM=you@example.com         (a sender you verified in Brevo → Senders)
//   MAIL_FROM_NAME=Chui-se Your Trip  (optional)

export function mailReady() {
  return !!(process.env.BREVO_API_KEY && process.env.MAIL_FROM)
}

export async function sendEmail({ to, subject, text, html }) {
  if (!mailReady()) throw new Error('Email is not set up (BREVO_API_KEY / MAIL_FROM missing in server/.env)')
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME || 'Chui-se Your Trip' },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    }),
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error('Brevo said ' + res.status + ': ' + body.slice(0, 200))
  }
}
