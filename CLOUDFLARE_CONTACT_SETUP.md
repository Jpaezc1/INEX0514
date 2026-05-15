# Cloudflare Contact Form Setup

The website contact form posts to `/api/contact`, which is handled by `functions/api/contact.js` as a Cloudflare Pages Function.

## Cloudflare setup

1. In Cloudflare, enable Email Service or Email Routing for the domain.
2. Verify the inbox where you want to receive form requests.
3. Add a Pages Function email binding:
   - Binding name: `CONTACT_EMAIL`
4. Add these Cloudflare Pages environment variables:
   - `CONTACT_FROM`: an address on your Cloudflare email-enabled domain, for example `website@your-domain.com`
   - `CONTACT_TO`: the inbox where you want requests delivered
5. Redeploy the Pages project from GitHub.

The form includes basic validation and a hidden spam honeypot field. It does not require any third-party form service.
