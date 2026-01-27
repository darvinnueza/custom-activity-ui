export default async function handler(req, res) {
    try {
        if (req.method !== "GET") {
            res.setHeader("Allow", "GET");
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { divisionId } = req.query;

        if (!divisionId) {
            return res.status(400).json({ error: "divisionId is required" });
        }

        const SERVICE_BASE = process.env.SERVICE_BASE;     // base del custom-activity-service
        const SERVICE_TOKEN = process.env.SERVICE_TOKEN;   // token para TU service

        if (!SERVICE_BASE || !SERVICE_TOKEN) {
            return res.status(500).json({ error: "Service env not configured" });
        }

        const base = SERVICE_BASE.replace(/\/$/, "");
        const url = `${base}/genesys/campaigns?divisionId=${encodeURIComponent(divisionId)}`;

        const r = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${SERVICE_TOKEN}`,
                Accept: "application/json",
            },
        });

        const text = await r.text();

        // si el service ya retorna array, lo devolvemos tal cual
        // si retorna objeto { entities: [] } también lo soportamos
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = { error: text || "Invalid JSON from service" };
        }

        return res.status(r.status).json(data);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}