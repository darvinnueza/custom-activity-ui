/* global Postmonger */
const connection = new Postmonger.Session();

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // 1. Notificar a Salesforce que la UI está lista
    connection.trigger('ready');
});

// 2. Escuchar cuando Salesforce inicializa la actividad
connection.on('initActivity', function(data) {
    console.log('Datos recibidos de SFMC:', data);
});

// 3. Escuchar cuando el usuario hace clic en el botón "Siguiente" de Salesforce
connection.on('clickedNext', function() {
    // Aquí es donde validarías si el usuario eligió algo en tu UI
    // Por ahora, simplemente guardamos y cerramos
    save();
});

function save() {
    const payload = {
        metaData: {
            isConfigured: true
        }
    };

    // Avisar a Salesforce que actualice la actividad con estos datos
    connection.trigger('updateActivity', payload);
}