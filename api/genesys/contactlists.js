export default async function handler(req, res) {
  try {
    // =========================
    // ENV
    // =========================
    const SERVICE_BASE_URL = process.env.API_BASE_URL; // custom-activity-service base (ej: https://custom-activity-service.vercel.app)
    const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || process.env.INTERNAL_API_TOKEN;
    const DEFAULT_DIVISION_ID = process.env.DIVISION_ID;

    if (!SERVICE_BASE_URL) {
      return res.status(500).json({ error: "Missing API_BASE_URL in UI env" });
    }
    if (!INTERNAL_TOKEN) {
      return res.status(500).json({ error: "Missing INTERNAL_TOKEN in UI env" });
    }

    // =========================
    // GET /contactlists?divisionId=...
    // =========================
    if (req.method === "GET") {
      const divisionId = req.query.divisionId || DEFAULT_DIVISION_ID;

      if (!divisionId) {
        return res.status(400).json({ error: "divisionId is required" });
      }

      const url = `${SERVICE_BASE_URL}/api/genesys/contactlists?divisionId=${encodeURIComponent(
        divisionId
      )}`;

      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${INTERNAL_TOKEN}`,
          Accept: "application/json",
        },
      });

      const text = await resp.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

      return res.status(resp.status).json(data);
    }

    // =========================
    // POST /contactlists
    // body debe incluir division: { id }
    // =========================
    if (req.method === "POST") {
      // req.body ya debería venir parseado por Vercel/Next,
      // pero por seguridad:
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

      const divisionId =
        body?.division?.id ||
        body?.divisionId ||
        DEFAULT_DIVISION_ID;

      if (!divisionId) {
        return res.status(400).json({ error: "divisionId is required" });
      }

      // ✅ Normalizamos contrato: siempre mandamos division: { id }
      const payload = {
        ...body,
        division: { id: divisionId },
      };
      delete payload.divisionId; // evitamos ambigüedad

      const url = `${SERVICE_BASE_URL}/api/genesys/contactlists`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTERNAL_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

      return res.status(resp.status).json(data);
    }

    // =========================
    // METHOD NOT ALLOWED
    // =========================
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e) {
    console.error("UI proxy /contactlists error:", e);
    return res.status(500).json({
      error: "Internal error",
      message: e.message,
    });
  }
}