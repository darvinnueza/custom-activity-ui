/* global Postmonger */
(function () {
    const connection = new Postmonger.Session();

    let payload = {};

    // ✅ Handshake correcto (si esto no está, se queda el spinner)
    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestEndpoints");

    // ✅ Journey manda el payload aquí cuando abre la activity
    connection.on("initActivity", function (data) {
        payload = data || {};

        payload.metaData = payload.metaData || {};
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};
        payload.arguments.execute.inArguments =
        payload.arguments.execute.inArguments || [];

        // recuperar valores guardados (si existen)
        const inArgs = payload.arguments.execute.inArguments;

        const contactListId =
        inArgs.find((a) => a.contactListId)?.contactListId || "";
        const useNewList =
        inArgs.find((a) => a.useNewList)?.useNewList || false;
        const newListName =
        inArgs.find((a) => a.newListName)?.newListName || "";

        // mandar al UI para que seleccione / pinte
        connection.trigger("showUIData", {
        contactListId,
        useNewList,
        newListName,
        });
    });

    // ✅ Guardar al dar Next / Done
    connection.on("clickedNext", function () {
        save("next");
    });

    connection.on("clickedDone", function () {
        save("done");
    });

    function save(action) {
        const select = document.getElementById("contactListSelect");
        const chk = document.getElementById("newListCheck");
        const inp = document.getElementById("newListName");

        payload.metaData = payload.metaData || {};
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};

        // ✅ UN SOLO OBJETO con TODO
        payload.arguments.execute.inArguments = [
        {
            // ✅ bindings (no se pierden)
            request_id: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.request_id}}",
            contact_key: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.contact_key}}",
            phone_number: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.phone_number}}",
            status: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.status}}",
            created_at: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.created_at}}",
            updated_at: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.updated_at}}",

            // ✅ config de tu UI
            contactListId: select ? select.value : "",
            useNewList: chk ? chk.checked : false,
            newListName: chk && chk.checked ? (inp ? inp.value : "") : "",

            // ✅ campaña (si ya la tienes)
            campaignId: campaignSelect ? campaignSelect.value : ""
        }
        ];

        payload.metaData.isConfigured = true;

        connection.trigger("updateActivity", payload);

        // ✅ IMPORTANTE: liberar Journey Builder (si no, spinner / no cierra bien)
        connection.trigger(action);
    }
})();