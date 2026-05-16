import { EmailMessage } from "cloudflare:email";

const MAX_FIELD_LENGTH = 4000;
const REQUIRED_FIELDS = ["name", "email", "project", "message"];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function clean(value) {
  return String(value || "").trim().slice(0, MAX_FIELD_LENGTH);
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildHtml(data) {
  return `
    <h2>New INEX website request</h2>
    <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
    <p><strong>Project Type:</strong> ${escapeHtml(data.project)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>
  `;
}

function buildText(data) {
  return [
    "New INEX website request",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Project Type: ${data.project}`,
    "",
    "Message:",
    data.message
  ].join("\n");
}

function cleanHeader(value) {
  return clean(value).replace(/[\r\n]+/g, " ");
}

function buildEmailMessage(data, env) {
  const from = cleanHeader(env.CONTACT_FROM);
  const to = cleanHeader(env.CONTACT_TO || "jpaezcabal@gmail.com");
  const replyTo = cleanHeader(data.email);
  const subject = cleanHeader(`New INEX request: ${data.project}`);

  const rawMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    buildHtml(data)
  ].join("\r\n");

  return new EmailMessage(from, to, rawMessage);
}

async function handleContact(request, env) {
  let formData;

  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ message: "Please submit the form again." }, 400);
  }

  if (clean(formData.get("website"))) {
    return jsonResponse({ message: "Thanks. Your request has been sent." });
  }

  const data = Object.fromEntries(
    REQUIRED_FIELDS.map((field) => [field, clean(formData.get(field))])
  );

  const missingField = REQUIRED_FIELDS.find((field) => !data[field]);
  if (missingField) {
    return jsonResponse({ message: "Please complete every required field." }, 400);
  }

  if (!isEmail(data.email)) {
    return jsonResponse({ message: "Please enter a valid email address." }, 400);
  }

  if (!env.CONTACT_EMAIL || !env.CONTACT_FROM) {
    return jsonResponse({ message: "Contact form email is not configured yet." }, 500);
  }

  try {
    await env.CONTACT_EMAIL.send(buildEmailMessage(data, env));
  } catch (error) {
    console.error("Contact email failed", error);
    return jsonResponse({ message: "Unable to send your request right now." }, 500);
  }

  return jsonResponse({ message: "Thanks. Your request has been sent." });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return jsonResponse({ message: "Method not allowed." }, 405);
      }

      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
