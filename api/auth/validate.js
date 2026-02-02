// api/auth/validate.js
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { token } = req.body;

    // ESTA LÍNEA ES LA QUE IMPRIME EN TU CAPTURA DE VERCEL LOGS
    console.log("--- TOKEN RECIBIDO DE SALESFORCE ---");
    console.log(token); 
    console.log("-------------------------------------");

    const SECRET = process.env.SFMC_JWT_SECRET;

    try {
        // Validamos que el secreto sea el correcto
        jwt.verify(token, SECRET, { algorithms: ['HS256'] });
        res.status(200).json({ valid: true });
    } catch (e) {
        console.log("ERROR: El secreto no coincide o el token expiró:", e.message);
        res.status(401).json({ valid: false });
    }
}