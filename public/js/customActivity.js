/* global Postmonger */
(function () {
  const connection = new Postmonger.Session();

  const app = document.getElementById("app");
  const error = document.getElementById("error");

  let payload = {};
  let tokenReceived = false;

  // ===============================
  // 🔐 CONTROL DE ACCESO UI
  // ===============================

  connection.on("requestedTokens", function (tokens) {
    tokenReceived = true;

    const jwt = tokens && tokens.token;

    if (jwt) {
      app.style.display = "block";
    } else {
      error.style.display = "block";
    }
  });

  // ⏱️ Fallback: si NO estamos en SFMC
  setTimeout(function () {
    if (!tokenReceived) {
      error.style.display = "block";
    }
  }, 500);

  // ===============================
  // 🔄 HANDSHAKE (DESPUÉS DE LISTENERS)
  // ===============================
  connection.trigger("ready");
  connection.trigger("requestTokens");
  connection.trigger("requestEndpoints");

  // ===============================
  // INIT ACTIVITY
  // ===============================
  connection.on("initActivity", function (data) {
    payload = data || {};

    payload.metaData = payload.metaData || {};
    payload.arguments = payload.arguments || {};
    payload.arguments.execute = payload.arguments.execute || {};
    payload.arguments.execute.inArguments =
      payload.arguments.execute.inArguments || [];

    const inArgs = payload.arguments.execute.inArguments;

    const contactListId =
      inArgs.find((a) => a.contactListId)?.contactListId || "";
    const useNewList =
      inArgs.find((a) => a.useNewList)?.useNewList || false;
    const newListName =
      inArgs.find((a) => a.newListName)?.newListName || "";

    connection.trigger("showUIData", {
      contactListId,
      useNewList,
      newListName,
    });
  });

  // ===============================
  // SAVE
  // ===============================
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
    const campaignSelect = document.getElementById("campaignSelect");

    payload.metaData = payload.metaData || {};
    payload.arguments = payload.arguments || {};
    payload.arguments.execute = payload.arguments.execute || {};

    payload.arguments.execute.inArguments = [
      {
        request_id: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.request_id}}",
        contact_key: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.contact_key}}",
        phone_number: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.phone_number}}",
        status: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.status}}",
        created_at: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.created_at}}",
        updated_at: "{{Event.VOICEBOT_DEMO_CAMPAIGN_1.updated_at}}",

        contactListId: select ? select.value : "",
        useNewList: chk ? chk.checked : false,
        newListName: chk && chk.checked ? (inp ? inp.value : "") : "",
        campaignId: campaignSelect ? campaignSelect.value : ""
      }
    ];

    payload.metaData.isConfigured = true;

    connection.trigger("updateActivity", payload);
    connection.trigger(action);
  }
})();
