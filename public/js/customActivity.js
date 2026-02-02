/* global Postmonger */
(function () {
    let payload = {};
    let connection = new Postmonger.Session(); // Inicializar fuera para evitar nulos

    function init() {
        // Escuchar cuando el Journey Builder nos envía la configuración actual
        connection.on("initActivity", function (data) {
            payload = data || {};
            console.log("Payload recibido de SFMC:", JSON.stringify(payload));
        });

        // Eventos de botones del Modal
        connection.on("clickedNext", save);
        connection.on("clickedDone", save);

        // Notificar que la UI está lista para recibir datos
        connection.trigger("ready");
    }

    function save() {
        payload.metaData = payload.metaData || {};
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};

        // Importante: Asegúrate de que estos campos existan en tu Data Extension de entrada
        payload.arguments.execute.inArguments = [
            {
                "request_id": "{{Event.request_id}}",
                "contact_key": "{{Event.contact_key}}",
                "msisdn": "{{Event.msisdn}}",
                "status": "{{Event.status}}"
            }
        ];

        payload.metaData.isConfigured = true;

        connection.trigger("updateActivity", payload);
    }

    window.addEventListener("load", init);
})();