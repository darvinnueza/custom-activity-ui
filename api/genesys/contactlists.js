export default async function handler(req, res) {
  const { divisionId } = req.query;

  if (!divisionId) {
    return res.status(400).json({ error: "divisionId is required" });
  }

  const API_BASE_URL = (process.env.API_BASE_URL || "").replace(/\/$/, "");
  const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";

  if (!API_BASE_URL || !INTERNAL_TOKEN) {
    return res.status(500).json({
      error: "API_BASE_URL or INTERNAL_TOKEN not configured",
    });
  }

  const url = `${API_BASE_URL}/genesys/contactlists?divisionId=${encodeURIComponent(
    divisionId
  )}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${INTERNAL_TOKEN}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();

    try {
      const json = text ? JSON.parse(text) : null;
      return res.status(response.status).json(json);
    } catch {
      return res.status(response.status).send(text);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error" });
  }
}