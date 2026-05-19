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
5. Redeploy from GitHub.

## Upload rule

When updating the site through GitHub, always upload the contents of:

`INEX/INEX-GitHub-Upload`

Do not upload only `index.html` or only the changed page. The contact form depends on these files staying in the repository:

- `wrangler.toml`
- `src/worker.js`

The Worker now has safe built-in fallback values for the contact sender and receiver:

- From: `contact@inexstudiobuild.com`
- To: `jpaezcabal@gmail.com`

That means Cloudflare dashboard variables named `CONTACT_FROM` and `CONTACT_TO` are optional. It is okay if the dashboard "Variables and Secrets" section looks blank after a manual GitHub upload, as long as `wrangler.toml` and `src/worker.js` are still in the repository and the `CONTACT_EMAIL` email binding exists.

The form includes basic validation, phone, project location, timeline, optional photo/plan uploads, a hidden spam honeypot field, and a user-facing success/error message. It does not require any third-party form service.
