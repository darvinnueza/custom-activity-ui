export default async function handler(req, res) {
    try {
        const upstream =
        "https://custom-activity-service-demo.vercel.app/api/ui/campaigns";

        const r = await fetch(upstream, { method: "GET" });

        if (!r.ok) {
        const text = await r.text().catch(() => "");
        return res.status(r.status).send(text || "Upstream error");
        }

        const data = await r.json();

        // CORS permitido (aunque aquí ya no es necesario si llamas same-origin)
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json");
        
        return res.status(200).json(data);
    } catch (e) {
        return res.status(500).json({
        error: "proxy_error",
        details: String(e)
        });
    }
}