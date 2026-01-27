// api/env.js
export default function handler(req, res) {
    const SERVICE_BASE = process.env.SERVICE_BASE || "";
    const SERVICE_TOKEN = process.env.SERVICE_TOKEN || "";
    const DEFAULT_DIVISION_ID = process.env.DEFAULT_DIVISION_ID || "";

    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    res.status(200).send(
        `window.__ENV__ = ${JSON.stringify({
        SERVICE_BASE,
        SERVICE_TOKEN,
        DEFAULT_DIVISION_ID,
        })};`
    );
}