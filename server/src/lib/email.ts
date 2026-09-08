import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const VERIFICATION_TEMPLATE_ID = "a0d32739-9c4e-4d5c-93cc-8e6a1b4f2a59";
const INVITATION_TEMPLATE_ID = "48a6f332-da7d-4d38-88e6-21469c88ccf6";

export function getFrontendBaseUrl(): string {
  if (process.env.FRONTEND_ORIGIN) {
    return process.env.FRONTEND_ORIGIN.split(",")[0].trim();
  }
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(",")[0].trim();
  }
  return "http://localhost:5173";
}

interface SendVerificationEmailParams {
  email: string;
  url: string;
}

export async function sendVerificationEmail({
  email,
  url,
}: SendVerificationEmailParams) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: email,
    subject: `Verify your email address — ${process.env.APP_NAME ?? "Ledg"}`,
    template: {
      id: VERIFICATION_TEMPLATE_ID,
      variables: {
        Verification_Link: url,
      },
    },
  });
}

interface SendInvitationEmailParams {
  to: string;
  spaceName: string;
  inviterName: string;
  acceptUrl: string;
}

export async function sendInvitationEmail({
  to,
  spaceName,
  inviterName,
  acceptUrl,
}: SendInvitationEmailParams): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to,
    template: {
      id: INVITATION_TEMPLATE_ID,
      variables: {
        inviter_name: inviterName,
        space_name: spaceName,
        accept_link: acceptUrl,
      },
    },
  });
}