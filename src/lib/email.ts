import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from =
  process.env.EMAIL_FROM || 'Productivity Hub <onboarding@resend.dev>';

let client: Resend | null = null;
if (apiKey) {
  client = new Resend(apiKey);
}

/**
 * Sends a one-time login code to the given email via Resend.
 * If RESEND_API_KEY is not configured (local dev), the code is logged to
 * the terminal instead so the flow remains testable.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  if (!client) {
    console.log('--------------------------------------------------');
    console.log(`OTP FOR: ${to}`);
    console.log(`OTP CODE: ${otp}`);
    console.log('--------------------------------------------------');
    return;
  }

  const { error } = await client.emails.send({
    from,
    to: [to],
    subject: 'Your Productivity Hub login code',
    text: `Your login code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f6f7fb;border-radius:12px;">
        <div style="background:#ffffff;padding:28px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="font-size:26px;margin-bottom:12px;">⚡</div>
          <h1 style="font-size:18px;margin:0 0 8px;color:#0f172a;">Your login code</h1>
          <p style="font-size:14px;color:#64748b;margin:0 0 20px;">
            Use the code below to finish signing in to <strong>Productivity Hub</strong>.
            It expires in 10 minutes.
          </p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#4f46e5;text-align:center;background:#eef2ff;border-radius:8px;padding:14px;">${otp}</div>
          <p style="font-size:12px;color:#94a3b8;margin:20px 0 0;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('Resend failed to send OTP:', error);
    // Development fallback: with a missing/invalid key, print the code so the
    // flow stays testable. Production fails loudly instead.
    if (process.env.NODE_ENV !== 'production') {
      console.log('--- DEV FALLBACK (email not delivered) ---');
      console.log(`OTP FOR: ${to}`);
      console.log(`OTP CODE: ${otp}`);
      console.log('--------------------------------------------------');
      return;
    }
    throw new Error('Failed to send OTP email');
  }
}
