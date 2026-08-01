# Security

## Authentication

Clerk manages authentication.

Backend verifies JWT on every protected request.

---

# Authorization

Every query is scoped by

spaceId

Never trust IDs received from the client.

---

# Validation

Every request is validated using Zod.

Never rely solely on frontend validation.

---

# Passwords

Managed by Clerk.

Never stored in our database.

---

# Environment Variables

Never commit secrets.

Use

.env.local

for development.

Use platform secrets in production.

---

# HTTP Headers

Helmet enabled.

Security headers configured.

---

# CORS

Only allow approved frontend origins.

---

# Rate Limiting

Protect

Authentication

AI endpoints

Export endpoints

---

# Logging

Never log:

Passwords

Tokens

Cookies

Sensitive personal information

---

# MongoDB

Parameterized queries only.

No raw query construction from user input.

---

# Dependencies

Run dependency audits regularly.

Update critical vulnerabilities immediately.

---

# File Uploads (Future)

Validate MIME type.

Validate size.

Scan for malware if public uploads are introduced.

---

# AI

Do not send unnecessary user data to AI providers.

Only include fields required for generating summaries or insights.

---

# Backups

Enable MongoDB Atlas backups.

Document restore procedures.