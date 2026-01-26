/* global Postmonger */
(function () {
    const connection = new Postmonger.Session();

    let payload = {};
    let inArguments = {};

    const $campaignId = document.getElementById("campaignId");
    const $campaignName = document.getElementById("campaignName");

    // Journey Builder events
    connection.on("initActivity", (data) => {
        payload = data || {};

        const args = payload?.arguments?.execute?.inArguments || [];
        inArguments = Object.assign({}, ...args);

        // Pintar valores si ya existían
        if (inArguments.campaignId) $campaignId.value = inArguments.campaignId;
        if (inArguments.campaignName) $campaignName.value = inArguments.campaignName;

        // Pedir los tokens para poder habilitar Done
        connection.trigger("requestTokens");
    });

    connection.on("requestedTokens", () => {
        // Esto habilita el botón "Done"
        connection.trigger("updateButton", {
        button: "next",
        text: "Done",
        visible: true,
        enabled: true,
        });
    });

    connection.on("clickedNext", () => {
        // Guardar lo que el user configuró
        const campaignId = ($campaignId.value || "").trim();
        const campaignName = ($campaignName.value || "").trim();

        payload.arguments.execute.inArguments = [
        { campaignId },
        { campaignName },
        ];

        // notify Journey Builder
        connection.trigger("updateActivity", payload);
    });

    // Ready
    connection.trigger("ready");
})();