var connection = new Postmonger.Session();
var payload = {};

// 1. Iniciamos la conexión cuando el iframe está listo
connection.trigger('ready');

// 2. Journey Builder envía la configuración actual a la actividad
connection.on('initActivity', function(data) {
    if (data) {
        payload = data;
    }
    
    var message = "";
    var hasInArguments = Boolean(
        payload['arguments'] &&
        payload['arguments'].execute &&
        payload['arguments'].execute.inArguments &&
        payload['arguments'].execute.inArguments.length > 0
    );

    var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

    // Si ya existía un mensaje guardado, lo ponemos en el input
    for (var key in inArguments) {
        if (inArguments.hasOwnProperty(key)) {
            if (key === 'message') {
                message = inArguments[key];
            }
        }
    }
    
    document.getElementById('message-input').value = message;
});

// 3. Cuando el usuario hace clic en "Done" (Siguiente) en Journey Builder
connection.on('clickedNext', function() {
    var message = document.getElementById('message-input').value;

    payload['metaData'].isConfigured = true;
    payload['arguments'].execute.inArguments = [{ "message": message }];
    
    // Le enviamos la actualización a Salesforce y cerramos el modal
    connection.trigger('updateActivity', payload);
});