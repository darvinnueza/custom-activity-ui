export default function handler(req, res) {
    res.status(200).json({
        API_URL: process.env.API_URL,
        DIVISION_ID: process.env.DIVISION_ID
    });
}