/* global Postmonger */

(function () {
    const connection = new Postmonger.Session();
    let payload = {};

    // 🔥 HANDSHAKE OBLIGATORIO (NO TOCAR)
    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestEndpoints");

    // 🔹 Journey envía la activity
    connection.on("initActivity", function (data) {
        console.log("initActivity", data);
        payload = data || {};
    });

    // 🔹 Guardar / Listo
    connection.on("clickedNext", function () {
        console.log("clickedNext");

        payload.arguments = payload.arguments || {};
        payload.metaData = payload.metaData || {};

        connection.trigger("updateActivity", payload);
        connection.trigger("next"); // 🔥 CIERRA EL MODAL
    });

    // 🔹 Cancelar
    connection.on("clickedCancel", function () {
        connection.trigger("cancel");
    });

})();
