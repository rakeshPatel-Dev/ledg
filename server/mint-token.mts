import { createClerkClient } from "@clerk/backend";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../../apps/api/.env.local", import.meta.url) });

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});

const email = "test@ledg.local";

async function main() {
  let user = await clerk.users
    .getUserList({ emailAddress: [email] })
    .then((r) => r.data[0])
    .catch(() => undefined);

  if (!user) {
    user = await clerk.users.createUser({
      emailAddress: [email],
      firstName: "Test",
      lastName: "User",
      password: "LedgTest123!",
      skipPasswordChecks: true,
      skipPasswordRequirement: true,
    });
    console.log("created user:", user.id);
  } else {
    console.log("existing user:", user.id);
  }

  const session = await clerk.sessions.createSession({
    userId: user.id,
  });
  const token = await clerk.sessions.createSessionToken({
    sessionId: session.id,
  });

  console.log(JSON.stringify({ userId: user.id, sessionId: session.id, token }, null, 2));
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
