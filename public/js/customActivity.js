/* global Postmonger */
(function () {
    const connection = new Postmonger.Session();
    let payload = {};

    // 1) PRIMERO escuchas initActivity (para no perder el payload)
    connection.on("initActivity", function (data) {
        console.log("initActivity", data);
        payload = data || {};
    });

    function save(action) {
        console.log("save()", action);

        payload.metaData = payload.metaData || {};
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};

        payload.arguments.execute.inArguments = [
            {
                request_id: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.request_id}}",
                contact_key: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.contact_key}}",
                msisdn: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.msisdn}}",
                status: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.status}}",
            },
        ];

        payload.metaData.isConfigured = true;

        connection.trigger("updateActivity", payload);
        connection.trigger("setActivityValid", true);

        // cierra modal / continua
        connection.trigger(action); // "next" o "done"
    }

    connection.on("clickedNext", function () { save("next"); });
    connection.on("clickedDone", function () { save("done"); });
    connection.on("clickedCancel", function () { connection.trigger("cancel"); });

    // 2) AL FINAL el handshake
    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestEndpoints");
})();