/* global Postmonger */
const connection = new Postmonger.Session();

connection.on('initActivity', function () {
    console.log('initActivity');
});

connection.on('requestedTokens', function () {
    connection.trigger('ready');
});

connection.on('requestedEndpoints', function () {
    connection.trigger('ready');
});
