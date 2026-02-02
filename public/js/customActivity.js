/* global Postmonger */

(function () {
    const connection = new Postmonger.Session();
    let payload = {};

    // 1) Journey envía la activity (payload)
    connection.on("initActivity", function (data) {
        console.log("initActivity", data);
        payload = data || {};
    });

    // 2) Guardar / Listo
    connection.on("clickedNext", function () {
        console.log("clickedNext");

        // Asegura estructura
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};
        payload.metaData = payload.metaData || {};

        // ✅ CLAVE: marca la actividad como configurada
        payload.metaData.isConfigured = true;

        // ✅ Envía campos de tu Data Extension hacia /api/execute
        payload.arguments.execute.inArguments = [
            { request_id: "{{Event.request_id}}" },
            { contact_key: "{{Event.contact_key}}" },
            { msisdn: "{{Event.msisdn}}" },
            { status: "{{Event.status}}" }
        ];

        // Guarda
        connection.trigger("updateActivity", payload);

        // ✅ (en muchos tenants) marca la actividad como válida
        connection.trigger("setActivityValid", true);

        // Cierra el modal
        connection.trigger("next");
    });

    // 3) Cancelar
    connection.on("clickedCancel", function () {
        connection.trigger("cancel");
    });

    // 4) Handshake (mejor al final)
    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestEndpoints");
})();