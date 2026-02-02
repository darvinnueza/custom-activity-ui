/* global Postmonger */
(function () {
    let payload = {};
    let connection = null;

    function init() {
        connection = new Postmonger.Session();

        connection.on("initActivity", function (data) {
            payload = data || {};
        });

        connection.on("clickedNext", function () {
            save("next");
        });

        connection.on("clickedDone", function () {
            save("done");
        });

        connection.on("clickedCancel", function () {
            connection.trigger("cancel");
        });

        connection.trigger("ready");
        connection.trigger("requestTokens");
        connection.trigger("requestEndpoints");
    }

    function save(action) {
        payload.metaData = payload.metaData || {};
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};

        payload.arguments.execute.inArguments = [
            {
                request_id: "{{Event.request_id}}",
                contact_key: "{{Event.contact_key}}",
                msisdn: "{{Event.msisdn}}",
                status: "{{Event.status}}"
            }
        ];

        payload.metaData.isConfigured = true;

        connection.trigger("updateActivity", payload);
        connection.trigger("setActivityValid", true);
        connection.trigger(action);
    }

    if (document.readyState === "complete") {
        init();
    } else {
        window.addEventListener("load", init);
    }
})();