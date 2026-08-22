import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const VERIFICATION_TEMPLATE_ID = "a0d32739-9c4e-4d5c-93cc-8e6a1b4f2a59";

interface SendVerificationEmailParams {
  email: string;
  url: string;
}

export async function sendVerificationEmail({
  email,
  url,
}: SendVerificationEmailParams) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
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