function normalizeBase(base) {
  return (base || "").replace(/\/$/, "");
}

function authHeader(token) {
  if (!token) return "";
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

async function readJsonSafe(r) {
  const text = await r.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export default async function handler(req, res) {
  try {
    const { divisionId } = req.query;

    if (!divisionId) {
      return res.status(400).json({ error: "divisionId is required" });
    }

    const SERVICE_BASE = normalizeBase(process.env.SERVICE_BASE);
    const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

    if (!SERVICE_BASE || !SERVICE_TOKEN) {
      return res.status(500).json({ error: "Service env not configured" });
    }

    const url = `${SERVICE_BASE}/genesys/contactlists?divisionId=${encodeURIComponent(
      divisionId
    )}`;

    const headers = {
      Authorization: authHeader(SERVICE_TOKEN),
      Accept: "application/json",
    };

    let r;

    if (req.method === "GET") {
      r = await fetch(url, { headers });
    } else if (req.method === "POST") {
      r = await fetch(url, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {}),
      });
    } else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const data = await readJsonSafe(r);
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}