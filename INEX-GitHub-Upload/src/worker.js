import { EmailMessage } from "cloudflare:email";

const MAX_FIELD_LENGTH = 4000;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;
const REQUIRED_FIELDS = ["name", "email", "phone", "location", "project", "timeline", "message"];

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
    <h2>New INEX Studio Build website request</h2>
    <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>
    <p><strong>Project Location:</strong> ${escapeHtml(data.location)}</p>
    <p><strong>Project Type:</strong> ${escapeHtml(data.project)}</p>
    <p><strong>Estimated Timeline:</strong> ${escapeHtml(data.timeline)}</p>
    <p><strong>Uploaded Files:</strong> ${escapeHtml(data.attachments || "No files uploaded")}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>
  `;
}

function buildText(data) {
  return [
    "New INEX Studio Build website request",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Project Location: ${data.location}`,
    `Project Type: ${data.project}`,
    `Estimated Timeline: ${data.timeline}`,
    `Uploaded Files: ${data.attachments || "No files uploaded"}`,
    "",
    "Message:",
    data.message
  ].join("\n");
}

function cleanHeader(value) {
  return clean(value).replace(/[\r\n]+/g, " ");
}

function safeFileName(value) {
  return cleanHeader(value)
    .replace(/[^\w.\- ()]/g, "_")
    .slice(0, 120) || "attachment";
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary).replace(/.{1,76}/g, "$&\r\n").trim();
}

async function collectAttachments(formData) {
  const files = formData
    .getAll("attachments")
    .filter((file) => file && typeof file === "object" && file.name && file.size);

  if (files.length > MAX_ATTACHMENTS) {
    return { error: `Please attach ${MAX_ATTACHMENTS} files or fewer.` };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_ATTACHMENT_BYTES) {
    return { error: "Please keep uploads under 8 MB total." };
  }

  const attachments = await Promise.all(
    files.map(async (file) => ({
      filename: safeFileName(file.name),
      contentType: cleanHeader(file.type) || "application/octet-stream",
      base64: arrayBufferToBase64(await file.arrayBuffer()),
      size: file.size
    }))
  );

  return { attachments };
}

function attachmentSummary(attachments) {
  if (!attachments.length) return "No files uploaded";

  return attachments
    .map((file) => `${file.filename} (${Math.max(1, Math.round(file.size / 1024))} KB)`)
    .join(", ");
}

function buildEmailMessage(data, env, attachments = []) {
  const from = cleanHeader(env.CONTACT_FROM);
  const configuredTo = cleanHeader(env.CONTACT_TO);
  const to = configuredTo.endsWith("@inexstudiobuild.com")
    ? "jpaezcabal@gmail.com"
    : configuredTo || "jpaezcabal@gmail.com";
  const replyTo = cleanHeader(data.email);
  const subject = cleanHeader(`New INEX Studio Build request: ${data.project}`);

  if (attachments.length) {
    const boundary = `inex-${crypto.randomUUID()}`;
    const parts = [
      `From: ${from}`,
      `To: ${to}`,
      `Reply-To: ${replyTo}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "",
      buildHtml(data)
    ];

    attachments.forEach((file) => {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${file.contentType}; name="${file.filename}"`,
        `Content-Disposition: attachment; filename="${file.filename}"`,
        "Content-Transfer-Encoding: base64",
        "",
        file.base64
      );
    });

    parts.push(`--${boundary}--`, "");
    return new EmailMessage(from, to, parts.join("\r\n"));
  }

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

  const attachmentResult = await collectAttachments(formData);
  if (attachmentResult.error) {
    return jsonResponse({ message: attachmentResult.error }, 400);
  }

  data.attachments = attachmentSummary(attachmentResult.attachments);

  try {
    await env.CONTACT_EMAIL.send(buildEmailMessage(data, env, attachmentResult.attachments));
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
