export default function handler(req, res) {
    res.setHeader("Content-Type", "application/javascript");

    res.status(200).send(`
        window.__ENV__ = {
        API_BASE_URL: "${process.env.API_BASE_URL}",
        DIVISION_ID: "${process.env.DIVISION_ID}",
        INTERNAL_TOKEN: "${process.env.INTERNAL_TOKEN}"
        };
    `);
}
