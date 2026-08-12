import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@healconnect.app';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  const msg = {
    to,
    from: FROM_EMAIL,
    subject: 'Verify your HealConnect email',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Verify your email</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
                  <tr>
                    <td style="background:linear-gradient(135deg,#312e81,#1e1b4b);padding:36px 40px;text-align:center;">
                      <h1 style="margin:0;color:#a5b4fc;font-size:28px;font-weight:800;letter-spacing:-0.5px;">✦ HealConnect</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 16px;">Verify your email address</h2>
                      <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 32px;">
                        Thanks for signing up! Click the button below to verify your email and activate your HealConnect account.
                      </p>
                      <a href="${verifyUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
                        Verify Email Address
                      </a>
                      <p style="color:#64748b;font-size:13px;margin:32px 0 0;">
                        This link expires in 24 hours. If you didn't create an account, ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 40px;border-top:1px solid #334155;text-align:center;">
                      <p style="color:#475569;font-size:12px;margin:0;">© 2026 Tara Infotech. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  await sgMail.send(msg);
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const msg = {
    to,
    from: FROM_EMAIL,
    subject: 'Reset your HealConnect password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Reset your password</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
                  <tr>
                    <td style="background:linear-gradient(135deg,#312e81,#1e1b4b);padding:36px 40px;text-align:center;">
                      <h1 style="margin:0;color:#a5b4fc;font-size:28px;font-weight:800;letter-spacing:-0.5px;">✦ HealConnect</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="color:#f1f5f9;font-size:22px;margin:0 0 16px;">Reset your password</h2>
                      <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 32px;">
                        We received a request to reset your password. Click below to choose a new one.
                      </p>
                      <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
                        Reset Password
                      </a>
                      <p style="color:#64748b;font-size:13px;margin:32px 0 0;">
                        This link expires in 1 hour. If you didn't request a password reset, ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 40px;border-top:1px solid #334155;text-align:center;">
                      <p style="color:#475569;font-size:12px;margin:0;">© 2026 Tara Infotech. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  await sgMail.send(msg);
}
