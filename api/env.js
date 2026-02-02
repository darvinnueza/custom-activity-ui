export default function handler(req, res) {
    res.status(200).json({
        API_BASE_URL: process.env.API_BASE_URL,
        DIVISION_ID: process.env.DIVISION_ID,
        INTERNAL_TOKEN: process.env.INTERNAL_TOKEN
    });
}