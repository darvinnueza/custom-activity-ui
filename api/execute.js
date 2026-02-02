export default function handler(req, res) {
    if (req.method === 'POST') {
        const payload = req.body;
        console.log('Datos recibidos de SFMC:', payload);

        // Aquí procesas la lógica (enviar un SMS, un webhook, etc.)
        
        // Salesforce espera un 200 OK para confirmar ejecución
        res.status(200).json({ status: 'ok' });
    } else {
        res.status(405).send('Method Not Allowed');
    }
}