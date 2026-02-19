import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify().then(() => {
  console.log("📧 Email service ready");
}).catch((err) => {
  console.warn("⚠️  Email service not configured:", err.message);
});

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Livestockway</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#42b883 0%,#2e8b63 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                🐄 Livestockway
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Livestock & Pets Transportation Platform
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafb;border-top:1px solid #e8ecf0;">
              <p style="margin:0 0 8px;color:#8c95a0;font-size:12px;text-align:center;">
                This email was sent by Livestockway. If you didn't request this, you can safely ignore it.
              </p>
              <p style="margin:0;color:#a0a8b4;font-size:11px;text-align:center;">
                © ${new Date().getFullYear()} Livestockway — All rights reserved.
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

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function codeExpiry(minutes = 15): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  userName?: string
): Promise<void> {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:22px;font-weight:600;">
      Verify Your Email
    </h2>
    <p style="margin:0 0 24px;color:#5a6577;font-size:15px;line-height:1.6;">
      ${greeting} thanks for signing up! Use the code below to verify your email address and get started.
    </p>

    <!-- Code Box -->
    <div style="background:linear-gradient(135deg,#f0faf5 0%,#e8f7f0 100%);border:2px solid #42b883;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 8px;color:#5a6577;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;">
        Your Verification Code
      </p>
      <p style="margin:0;color:#1a2332;font-size:36px;font-weight:700;letter-spacing:8px;font-family:'Courier New',monospace;">
        ${code}
      </p>
    </div>

    <p style="margin:0 0 24px;color:#8c95a0;font-size:13px;text-align:center;">
      This code expires in <strong style="color:#5a6577;">15 minutes</strong>
    </p>

    <!-- Divider -->
    <div style="border-top:1px solid #e8ecf0;margin:0 0 24px;"></div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding:16px 20px;background-color:#f8fafb;border-radius:8px;">
          <p style="margin:0 0 4px;color:#5a6577;font-size:13px;">
            <strong>Why verify?</strong>
          </p>
          <ul style="margin:0;padding:0 0 0 16px;color:#8c95a0;font-size:12px;line-height:1.8;">
            <li>Secure your account</li>
            <li>Get important trip notifications</li>
            <li>Enable payment features</li>
          </ul>
        </td>
      </tr>
    </table>
  `);

  await transporter.sendMail({
    from: `"Livestockway" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} — Verify your Livestockway account`,
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  userName?: string
): Promise<void> {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:22px;font-weight:600;">
      Reset Your Password
    </h2>
    <p style="margin:0 0 24px;color:#5a6577;font-size:15px;line-height:1.6;">
      ${greeting} we received a request to reset your password. Use the code below to set a new one.
    </p>

    <!-- Code Box -->
    <div style="background:linear-gradient(135deg,#fff8f0 0%,#fff3e6 100%);border:2px solid #f97316;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 8px;color:#5a6577;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;">
        Your Reset Code
      </p>
      <p style="margin:0;color:#1a2332;font-size:36px;font-weight:700;letter-spacing:8px;font-family:'Courier New',monospace;">
        ${code}
      </p>
    </div>

    <p style="margin:0 0 24px;color:#8c95a0;font-size:13px;text-align:center;">
      This code expires in <strong style="color:#5a6577;">15 minutes</strong>
    </p>

    <!-- Divider -->
    <div style="border-top:1px solid #e8ecf0;margin:0 0 24px;"></div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding:16px 20px;background-color:#fef2f2;border-radius:8px;">
          <p style="margin:0;color:#b91c1c;font-size:12px;line-height:1.6;">
            <strong>Didn't request this?</strong> If you didn't ask to reset your password, please ignore this email. Your account is still secure.
          </p>
        </td>
      </tr>
    </table>
  `);

  await transporter.sendMail({
    from: `"Livestockway" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} — Reset your Livestockway password`,
    html,
  });
}

export async function sendWelcomeEmail(
  to: string,
  userName: string
): Promise<void> {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:22px;font-weight:600;">
      Welcome to Livestockway! 🎉
    </h2>
    <p style="margin:0 0 24px;color:#5a6577;font-size:15px;line-height:1.6;">
      Hi ${userName}, your email has been verified and your account is all set. You're ready to start using Livestockway!
    </p>

    <div style="background-color:#f0faf5;border-radius:12px;padding:24px;margin:0 0 24px;">
      <h3 style="margin:0 0 12px;color:#1a2332;font-size:16px;">What's next?</h3>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding:8px 0;">
            <span style="display:inline-block;width:24px;height:24px;background-color:#42b883;border-radius:50%;color:white;text-align:center;line-height:24px;font-size:12px;font-weight:bold;margin-right:12px;">1</span>
            <span style="color:#5a6577;font-size:14px;">Complete your profile for better visibility</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="display:inline-block;width:24px;height:24px;background-color:#42b883;border-radius:50%;color:white;text-align:center;line-height:24px;font-size:12px;font-weight:bold;margin-right:12px;">2</span>
            <span style="color:#5a6577;font-size:14px;">Explore the load board and marketplace</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="display:inline-block;width:24px;height:24px;background-color:#42b883;border-radius:50%;color:white;text-align:center;line-height:24px;font-size:12px;font-weight:bold;margin-right:12px;">3</span>
            <span style="color:#5a6577;font-size:14px;">Connect with haulers and shippers</span>
          </td>
        </tr>
      </table>
    </div>
  `);

  await transporter.sendMail({
    from: `"Livestockway" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to Livestockway! 🎉",
    html,
  });
}
