export default async function handler(req, res) {
    const { divisionId } = req.query;

    if (!divisionId) {
        return res.status(400).json({ error: "divisionId is required" });
    }

    const url =
        `${process.env.API_BASE_URL}/genesys/contactlists?divisionId=${encodeURIComponent(divisionId)}`;

    try {
        const response = await fetch(url, {
            headers: {
                "accept": "application/json",
                "x-internal-token": process.env.INTERNAL_TOKEN
            }
        });

        const text = await response.text();

        if (!response.ok) {
            return res.status(response.status).send(text);
        }

        res.status(200).json(JSON.parse(text));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Proxy error" });
    }
}
