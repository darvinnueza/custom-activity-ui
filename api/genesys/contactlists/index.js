module.exports = async (req, res) => {
  try {
    const API_BASE_URL = process.env.API_BASE_URL;
    const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

    if (!API_BASE_URL) return res.status(500).json({ error: "Missing API_BASE_URL" });
    if (!INTERNAL_TOKEN) return res.status(500).json({ error: "Missing INTERNAL_TOKEN" });

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { divisionId } = req.query;
    if (!divisionId) return res.status(400).json({ error: "divisionId is required" });

    const url = `${API_BASE_URL}/genesys/contactlists?divisionId=${encodeURIComponent(divisionId)}`;

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${INTERNAL_TOKEN}`,
        Accept: "application/json",
      },
    });

    const text = await upstream.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Internal error", message: e.message });
  }
};