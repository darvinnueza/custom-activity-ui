export default async function handler(req, res) {
    try {
        const r = await fetch(
        "https://custom-activity-service-demo.vercel.app/api/ui/contactlists-create",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body)
        }
        );

        const data = await r.json();
        res.status(r.status).json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}