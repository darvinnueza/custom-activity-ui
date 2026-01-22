export default async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

    try {
        const upstream = "https://custom-activity-service-demo.vercel.app/api/ui/contactlists";

        // 🔐 Basic Auth (desde ENV)
        const user = process.env.BASIC_AUTH_USER;
        const pass = process.env.BASIC_AUTH_PASS;

        if (!user || !pass) {
        return res.status(500).json({
            error: "missing_env",
            details: "BASIC_AUTH_USER / BASIC_AUTH_PASS"
        });
        }

        const basic = Buffer.from(`${user}:${pass}`).toString("base64");

        const r = await fetch(upstream, {
            method: "GET",
            headers: {
                Authorization: `Basic ${basic}`
            }
        });

        const text = await r.text().catch(() => "");

        if (!r.ok) {
            // Reenviamos el error tal cual
            return res.status(r.status).send(text || "Upstream error");
        }

        // upstream responde JSON
        res.setHeader("Content-Type", "application/json");
        return res.status(200).send(text);
    } catch (e) {
        return res.status(500).json({ error: "proxy_error", details: String(e?.message || e) });
    }
}