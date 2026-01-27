export default async function handler(req, res) {
  try {
    const { divisionId } = req.query;

    if (!divisionId) {
      return res.status(400).json({ error: "divisionId is required" });
    }

    const SERVICE_BASE = (process.env.SERVICE_BASE || "").replace(/\/$/, "");
    const SERVICE_TOKEN = process.env.SERVICE_TOKEN || "";

    if (!SERVICE_BASE || !SERVICE_TOKEN) {
      return res.status(500).json({ error: "SERVICE_BASE or SERVICE_TOKEN not configured" });
    }

    const url = `${SERVICE_BASE}/genesys/contactlists?divisionId=${encodeURIComponent(divisionId)}`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SERVICE_TOKEN}`,
        Accept: "application/json",
      },
    });

    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}