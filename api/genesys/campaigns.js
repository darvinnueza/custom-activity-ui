// api/genesys/campaigns.js
export default async function handler(req, res) {
    try {
        const { divisionId } = req.query;

        if (!divisionId) {
            return res.status(400).json({ error: "divisionId is required" });
        }

        const SERVICE_BASE = process.env.SERVICE_BASE;
        const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

        if (!SERVICE_BASE || !SERVICE_TOKEN) {
            return res.status(500).json({ error: "Service env not configured" });
        }

        const url = `${SERVICE_BASE.replace(/\/$/, "")}/genesys/campaigns?divisionId=${encodeURIComponent(
            divisionId
        )}`;

        const r = await fetch(url, {
            headers: {
                Authorization: `Bearer ${SERVICE_TOKEN}`,
                Accept: "application/json",
            },
        });

        const text = await r.text();

        // si viene vacío o no-JSON, no revientes
        let data;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (e) {
            return res.status(r.status).json({
                error: "Non-JSON response from service",
                status: r.status,
                body: text?.slice(0, 500),
            });
        }

        return res.status(r.status).json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}