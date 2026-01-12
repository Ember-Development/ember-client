export async function sendCommentNotificationEmail(
  email: string,
  deliverableTitle: string,
  commentAuthor: string,
  commentContent: string,
  isReply: boolean,
  projectName: string,
  deliverableUrl: string
) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fullUrl = `${baseUrl}${deliverableUrl}`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = isReply
      ? `${commentAuthor} replied to a comment on "${deliverableTitle}"`
      : `${commentAuthor} commented on "${deliverableTitle}"`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: email,
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e293b; margin-bottom: 16px;">${subject}</h2>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="color: #475569; margin: 0 0 8px 0;"><strong>Project:</strong> ${projectName}</p>
            <p style="color: #475569; margin: 0 0 8px 0;"><strong>Deliverable:</strong> ${deliverableTitle}</p>
          </div>
          <div style="background: #ffffff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
            <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;"><strong>${commentAuthor}:</strong></p>
            <p style="color: #1e293b; margin: 0; white-space: pre-wrap;">${commentContent}</p>
          </div>
          <div style="margin: 24px 0;">
            <a href="${fullUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
              View Deliverable
            </a>
          </div>
        </div>
      `,
      text: `${subject}\n\nProject: ${projectName}\nDeliverable: ${deliverableTitle}\n\n${commentAuthor}:\n${commentContent}\n\nView: ${fullUrl}`,
    });
  } catch (error) {
    console.error("Failed to send comment notification email:", error);
  }
}

export async function sendMagicLinkEmail(email: string, token: string) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const magicLink = `${baseUrl}/api/auth/verify?token=${token}`;

  // For development: log to console instead of sending email
  console.log("\n" + "=".repeat(80));
  console.log("🔗 MAGIC LINK (Development Mode)");
  console.log("=".repeat(80));
  console.log(`Email: ${email}`);
  console.log(`Magic Link: ${magicLink}`);
  console.log("=".repeat(80));
  console.log("Copy the link above and paste it in your browser to sign in.");
  console.log("This link will expire in 15 minutes.\n");

  // If RESEND_API_KEY is set, actually send the email
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: email,
        subject: "Sign in to Studio Portal",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Sign in to Studio Portal</h1>
            <p>Click the link below to sign in. This link will expire in 15 minutes.</p>
            <p>
              <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Sign In
              </a>
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              Or copy and paste this link into your browser:<br>
              <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${magicLink}</code>
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">
              If you didn't request this link, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `Sign in to Studio Portal\n\nClick this link to sign in: ${magicLink}\n\nThis link will expire in 15 minutes.`,
      });
      console.log("✅ Email sent via Resend");
    } catch (error) {
      console.error("⚠️  Failed to send email via Resend, but link is logged above:", error);
    }
  }
}

export async function sendProjectInvitationEmail(
  email: string,
  token: string,
  projectName: string,
  inviterName: string,
  isNewUser: boolean
) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const acceptLink = `${baseUrl}/api/projects/invitations/accept?token=${token}`;

  const subject = isNewUser
    ? `You've been invited to join "${projectName}" on Studio Portal`
    : `You've been invited to join "${projectName}"`;

  const introText = isNewUser
    ? `You've been invited by ${inviterName} to join the project "${projectName}" on Studio Portal. Click the button below to create your account and join the project.`
    : `You've been invited by ${inviterName} to join the project "${projectName}". Click the button below to accept the invitation and access the project.`;

  // For development: log to console
  console.log("\n" + "=".repeat(80));
  console.log("📧 PROJECT INVITATION (Development Mode)");
  console.log("=".repeat(80));
  console.log(`Email: ${email}`);
  console.log(`Project: ${projectName}`);
  console.log(`Inviter: ${inviterName}`);
  console.log(`Accept Link: ${acceptLink}`);
  console.log("=".repeat(80));
  console.log("Copy the link above and paste it in your browser to accept the invitation.\n");

  // If RESEND_API_KEY is set, actually send the email
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: email,
        subject: subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b; margin-bottom: 16px;">${subject}</h2>
            <p style="color: #475569; margin: 0 0 16px 0;">${introText}</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="color: #475569; margin: 0 0 8px 0;"><strong>Project:</strong> ${projectName}</p>
              <p style="color: #475569; margin: 0;"><strong>Invited by:</strong> ${inviterName}</p>
            </div>
            <div style="margin: 24px 0;">
              <a href="${acceptLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                ${isNewUser ? "Accept Invitation & Create Account" : "Accept Invitation"}
              </a>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              Or copy and paste this link into your browser:<br>
              <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; word-break: break-all; font-size: 12px;">${acceptLink}</code>
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `${subject}\n\n${introText}\n\nProject: ${projectName}\nInvited by: ${inviterName}\n\nAccept invitation: ${acceptLink}\n\nThis invitation will expire in 7 days.`,
      });
      console.log("✅ Project invitation email sent via Resend");
    } catch (error) {
      console.error("⚠️  Failed to send project invitation email via Resend, but link is logged above:", error);
    }
  }
}

