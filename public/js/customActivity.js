/* global Postmonger */
const connection = new Postmonger.Session();

let payload = {};

// 1️⃣ Journey inicializa la activity
connection.on('initActivity', function (activity) {
    console.log('initActivity', activity);

    payload = activity || {};

    // 🔥 DECIR QUÉ BOTONES USAS
    connection.trigger('updateButton', {
        button: 'next',
        enabled: true
    });

    // 🔥 MUY IMPORTANTE: decir que la UI está lista
    connection.trigger('ready');
});

// 2️⃣ Journey pide tokens
connection.on('requestedTokens', function () {
    connection.trigger('ready');
});

// 3️⃣ Journey pide endpoints
connection.on('requestedEndpoints', function () {
    connection.trigger('ready');
});

// 4️⃣ Click en "Listo / Guardar"
connection.on('clickedNext', function () {
    console.log('clickedNext');

    // Guardar algo (aunque sea vacío)
    payload.arguments = payload.arguments || {};
    payload.metaData = payload.metaData || {};

    connection.trigger('updateActivity', payload);
});
