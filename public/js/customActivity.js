/* global Postmonger */
const connection = new Postmonger.Session();

// Journey pide inicializar la activity
connection.on('initActivity', function (activity) {
    console.log('initActivity', activity);

    // IMPORTANTE: decir que la UI está lista
    connection.trigger('ready');
});

// Cuando el usuario da click en "Guardar"
connection.on('clickedSave', function () {
    console.log('clickedSave');

    // Guardar algo mínimo (aunque sea vacío)
    const payload = {
        arguments: {},
        metaData: {}
    };

    connection.trigger('updateActivity', payload);
});

// Cuando Journey quiere cerrar
connection.on('requestedTokens', function () {
    connection.trigger('ready');
});

connection.on('requestedEndpoints', function () {
    connection.trigger('ready');
});
