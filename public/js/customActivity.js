/* global Postmonger */
(function () {
    const connection = new Postmonger.Session();
    let payload = null;

    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestEndpoints");

    connection.on("initActivity", function (data) {
        payload = data || {};
    });

    connection.on("clickedNext", function () {
        if (!payload) payload = {};

        // Asegura estructura
        payload.metaData = payload.metaData || {};
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};

        // ✅ AQUÍ guardas los bindings que quieres que SFMC resuelva al ejecutar
        payload.arguments.execute.inArguments = [
            { request_id: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.request_id}}" },
            { contact_key: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.contact_key}}" },
            { phone_number: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.phone_number}}" },
            { status: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.status}}" },
            { created_at: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.created_at}}" },
            { updated_at: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.updated_at}}" }
        ];

        payload.metaData.isConfigured = true;

        connection.trigger("updateActivity", payload);
    });
})();