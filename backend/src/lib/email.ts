import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@healconnect.app';
const FROM_NAME  = process.env.SENDGRID_FROM_NAME  || 'HealConnect';
const APP_URL    = process.env.APP_URL             || 'https://blue-plant-0d21bc900.7.azurestaticapps.net';

// ─── Shared layout helpers ────────────────────────────────────────────────────

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#fffbf0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbf0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #fde68a;max-width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.3px;">
                ✦ HealConnect
              </h1>
              <p style="margin:6px 0 0;color:#fef3c7;font-size:13px;">Your wellness journey starts here</p>
            </td>
          </tr>
          <!-- Body -->
          ${body}
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #fde68a;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                © 2026 Tara Infotech. All rights reserved.<br/>
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(url: string, label: string): string {
  return `<a href="${url}"
      style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;
             padding:14px 40px;border-radius:50px;font-size:16px;font-weight:700;letter-spacing:0.3px;
             margin:8px 0;">
    ${label}
  </a>`;
}

// ─── Welcome Email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const dashboardUrl = `${APP_URL}/dashboard`;
  const html = wrap(`
    <tr>
      <td style="padding:40px;">
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;">Welcome to HealConnect, ${name}! 🎉</h2>
        <p style="color:#6b7280;font-size:16px;line-height:1.7;margin:0 0 24px;">
          We're so glad you're here. Your account is ready — connect with verified wellness
          experts for astrology, tarot, vastu, and more.
        </p>
        <p style="color:#6b7280;font-size:16px;line-height:1.7;margin:0 0 32px;">
          Your <strong style="color:#d97706;">first session is completely free</strong>. No credit card needed.
        </p>
        <p style="text-align:center;">${btn(dashboardUrl, 'Go to Dashboard')}</p>
        <p style="color:#9ca3af;font-size:13px;margin:28px 0 0;">
          Please verify your email to unlock all features.
        </p>
      </td>
    </tr>`);

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: 'Welcome to HealConnect 🌟',
    html,
  });
}

// ─── Email Verification ────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, rawToken: string): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${rawToken}`;
  const html = wrap(`
    <tr>
      <td style="padding:40px;">
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 16px;">Verify your email address</h2>
        <p style="color:#6b7280;font-size:16px;line-height:1.7;margin:0 0 32px;">
          Thanks for signing up! Click the button below to verify your email and activate your account.
        </p>
        <p style="text-align:center;">${btn(verifyUrl, 'Verify Email Address')}</p>
        <p style="color:#9ca3af;font-size:13px;margin:32px 0 0;">
          This link expires in <strong>24 hours</strong>.
        </p>
      </td>
    </tr>`);

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: 'Verify your HealConnect email',
    html,
  });
}

// ─── Password Reset ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
  const html = wrap(`
    <tr>
      <td style="padding:40px;">
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 16px;">Reset your password</h2>
        <p style="color:#6b7280;font-size:16px;line-height:1.7;margin:0 0 32px;">
          We received a request to reset your HealConnect password.
          Click below to choose a new one.
        </p>
        <p style="text-align:center;">${btn(resetUrl, 'Reset Password')}</p>
        <p style="color:#9ca3af;font-size:13px;margin:32px 0 0;">
          This link expires in <strong>1 hour</strong>.
          If you didn't request this, no action is needed — your password remains unchanged.
        </p>
      </td>
    </tr>`);

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: 'Reset your HealConnect password',
    html,
  });
}

// ─── Password Changed Confirmation ────────────────────────────────────────────

export async function sendPasswordChangedEmail(to: string, name: string): Promise<void> {
  const loginUrl = `${APP_URL}/login`;
  const html = wrap(`
    <tr>
      <td style="padding:40px;">
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 16px;">Your password was changed ✓</h2>
        <p style="color:#6b7280;font-size:16px;line-height:1.7;margin:0 0 24px;">
          Hi ${name}, your HealConnect password was successfully updated.
        </p>
        <p style="color:#6b7280;font-size:16px;line-height:1.7;margin:0 0 32px;">
          If you made this change, great — you're all set!<br/>
          If you <strong>did not</strong> change your password, please reset it immediately
          and contact our support team.
        </p>
        <p style="text-align:center;">${btn(loginUrl, 'Log In to Your Account')}</p>
      </td>
    </tr>`);

  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: 'Your HealConnect password was changed',
    html,
  });
}
