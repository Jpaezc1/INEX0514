# Cloudflare Contact Form Setup

The website contact form posts to `/api/contact`, which is handled by `src/worker.js`.
This keeps the site deployable as Cloudflare Workers Static Assets while still running server-side code for form submissions.

## Why this fixes the static-assets message

Cloudflare shows "Variables cannot be added to a Worker that only has static assets" when the project has no Worker script.
The `wrangler.toml` file now includes both:

- `main = "src/worker.js"`
- an `[assets]` block with `run_worker_first = ["/api/*"]`

That means the static website is still served normally, but `/api/contact` is routed through the Worker first.

## Cloudflare setup

1. Make sure the GitHub deployment uses the repository's `wrangler.toml`.
2. Enable Cloudflare Email Service for the domain.
3. Verify the inbox where you want to receive form requests.
4. Add the email binding:
   - Binding name: `CONTACT_EMAIL`
5. Add these Worker variables:
   - `CONTACT_FROM`: an address on your Cloudflare email-enabled domain, for example `website@your-domain.com`
   - `CONTACT_TO`: the inbox where you want requests delivered
6. Redeploy from GitHub.

The form includes basic validation, a hidden spam honeypot field, and a user-facing success/error message. It does not require any third-party form service.
