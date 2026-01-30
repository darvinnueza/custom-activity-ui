export default async function handler(req, res) {
    try {
        const { divisionId } = req.query;
        if (!divisionId) {
            return res.status(400).json({ error: "divisionId is required" });
        }

        const base = process.env.API_BASE_URL;
        const token = process.env.INTERNAL_TOKEN;

        if (!base || !token) {
            return res.status(500).json({ error: "Missing API_BASE_URL or INTERNAL_TOKEN in Vercel env vars" });
        }

        const url = `${base}/genesys/contactlists?divisionId=${encodeURIComponent(divisionId)}`;

        const r = await fetch(url, {
            headers: {
                accept: "application/json",
                "x-internal-token": token,          // <-- usa el header que tu API espera
                // o "authorization": `Bearer ${token}` si tu servicio usa Authorization
            },
        });

        const text = await r.text();

        // Si viene HTML o error, te lo devuelvo para debug rápido:
        if (!r.ok) {
            return res.status(r.status).send(text);
        }

        // Si es JSON válido:
        res.setHeader("content-type", "application/json");
        return res.status(200).send(text);
    } catch (e) {
        return res.status(500).json({ error: String(e) });
    }
}