/* global Postmonger */
(function () {
    const connection = new Postmonger.Session();

    let payload = {};
    const nameInput = document.getElementById("name");
    const btnSave = document.getElementById("btnSave");
    const statusEl = document.getElementById("status");

    function setStatus(msg, type) {
        statusEl.textContent = msg || "";
        statusEl.className = type || "";
    }

    connection.on("initActivity", function (data) {
        payload = data || {};
        const savedName = payload?.arguments?.execute?.inArguments?.[0]?.activityName;
        if (savedName && nameInput) nameInput.value = savedName;
    });

    connection.on("clickedNext", function () {
        payload.arguments = payload.arguments || {};
        payload.arguments.execute = payload.arguments.execute || {};
        payload.arguments.execute.inArguments = payload.arguments.execute.inArguments || [];

        // guarda algo simple dentro del payload (opcional)
        payload.arguments.execute.inArguments = [
            { activityName: nameInput.value || "VoiceBot - Custom Activity" }
        ];

        payload.metaData = payload.metaData || {};
        payload.metaData.isConfigured = true;

        connection.trigger("updateActivity", payload);
        connection.trigger("nextStep");
    });

    btnSave.addEventListener("click", function () {
        setStatus("Listo. Ahora da Next en Journey Builder.", "ok");
    });

    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestEndpoints");
})();