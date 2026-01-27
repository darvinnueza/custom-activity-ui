/* global Postmonger */
(function () {
  const connection = new Postmonger.Session();

  // =========================
  // ENV (NO hardcode)
  // =========================
  const SERVICE_BASE = window.__ENV__?.SERVICE_BASE;
  if (!SERVICE_BASE) {
    // Esto es intencional: si no está, el deploy está mal configurado
    // (no hay SERVICE_BASE en Vercel)
    console.error("Missing window.__ENV__.SERVICE_BASE. Did you generate public/env.js?");
  }

  // STEP containers
  const stepContact = document.getElementById("stepContact");
  const stepCampaign = document.getElementById("stepCampaign");

  // Step nav buttons
  const btnNext = document.getElementById("btnNext");
  const btnBack = document.getElementById("btnBack");

  // Contact list UI
  const select = document.getElementById("contactListSelect");
  const chk = document.getElementById("newListCheck");
  const inp = document.getElementById("newListName");

  // Create list
  const btnCreate = document.getElementById("btnCreateList");
  const status = document.getElementById("createStatus");

  // Campaign UI
  const campaignSelect = document.getElementById("campaignSelect");

  // Saved state
  let savedContactListId = "";
  let savedCampaignId = "";
  let savedDivisionId = "";

  // -------------------------
  // Helpers
  // -------------------------
  function goTo(step) {
    if (step === 1) {
      stepContact.style.display = "";
      stepCampaign.style.display = "none";
    } else {
      stepContact.style.display = "none";
      stepCampaign.style.display = "";
    }
  }

  function canGoNext() {
    if (chk.checked) return !!inp.value.trim();
    return !!select.value;
  }

  function refreshNextButton() {
    if (!btnNext) return;
    btnNext.disabled = !canGoNext();
  }

  function setStatus(text, kind /* "ok" | "err" | "" */) {
    if (!status) return;
    status.textContent = text || "";
    status.className = "status";
    if (kind === "ok") status.className = "status ok";
    if (kind === "err") status.className = "status err";
  }

  function getDivisionId() {
    // 1) desde SFMC (lo ideal)
    if (savedDivisionId) return savedDivisionId;

    // 2) fallback opcional: querystring (?divisionId=...)
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get("divisionId");
    if (q) return q;

    return "";
  }

  function requireServiceBase() {
    if (!SERVICE_BASE) {
      throw new Error("SERVICE_BASE no está configurado (window.__ENV__.SERVICE_BASE). Revisa env.js / Vercel env var.");
    }
  }

  function requireDivisionId() {
    const divisionId = getDivisionId();
    if (!divisionId) {
      throw new Error("Falta divisionId. Debe venir desde SFMC (args.divisionId) o por querystring (?divisionId=...).");
    }
    return divisionId;
  }

  async function safeJson(res) {
    const text = await res.text().catch(() => "");
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  // -------------------------
  // Contact list toggle
  // -------------------------
  function toggleNewListInput() {
    const useNew = !!chk?.checked;

    if (useNew) {
      select.value = "";
      select.selectedIndex = 0;
      select.disabled = true;

      inp.disabled = false;
      btnCreate.disabled = !(inp.value.trim().length > 0);
    } else {
      select.disabled = false;

      inp.disabled = true;
      inp.value = "";
      btnCreate.disabled = true;
    }

    setStatus("", "");
    refreshNextButton();
  }

  function onNewListNameChange() {
    if (!chk.checked) {
      btnCreate.disabled = true;
    } else {
      btnCreate.disabled = !(inp.value.trim().length > 0);
    }
    refreshNextButton();
  }

  // -------------------------
  // Create contact list (POST -> SERVICE)
  // -------------------------
  async function onCreateClick() {
    try {
      requireServiceBase();

      const name = inp.value.trim();
      if (!name) return;

      setStatus("Creando lista...", "");
      btnCreate.disabled = true;

      const payload = {
        name,
        columnNames: ["request_id", "contact_key", "phone_number", "status"],
        phoneColumns: [{ columnName: "phone_number", type: "cell" }]
      };

      const res = await fetch(`${SERVICE_BASE}/genesys/contactlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const j = await safeJson(res);
        const msg = j?.error || j?.message || j?.details || j?.raw || `Error creando lista (${res.status})`;
        throw new Error(msg);
      }

      const data = await res.json();

      // agregar al combo
      const opt = document.createElement("option");
      opt.value = data.id;
      opt.textContent = data.name;
      select.appendChild(opt);

      // volver a modo existente
      chk.checked = false;
      toggleNewListInput();

      // seleccionar la creada
      select.value = data.id;

      setStatus(`Lista creada: ${data.name}`, "ok");
      refreshNextButton();
    } catch (e) {
      setStatus(e.message, "err");
      btnCreate.disabled = false;
    }
  }

  // -------------------------
  // Load contact lists (GET -> SERVICE) [REQUIERE divisionId]
  // -------------------------
  async function loadContactLists() {
    requireServiceBase();
    const divisionId = requireDivisionId();

    select.innerHTML = `<option value="">Cargando...</option>`;
    select.disabled = true;

    const url = `${SERVICE_BASE}/genesys/contactlists?divisionId=${encodeURIComponent(divisionId)}`;
    const res = await fetch(url);

    if (!res.ok) {
      const j = await safeJson(res);
      const msg = j?.error || j?.message || j?.details || j?.raw || `Error cargando contactlists (${res.status})`;
      throw new Error(msg);
    }

    const data = await res.json();

    select.innerHTML = `<option value="">Seleccione una lista...</option>`;
    data.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    });

    if (savedContactListId && !chk.checked) select.value = savedContactListId;

    toggleNewListInput();
  }

  // -------------------------
  // Load campaigns (GET -> SERVICE) [REQUIERE divisionId]
  // -------------------------
  let campaignsLoaded = false;
  async function loadCampaignsOnce() {
    if (campaignsLoaded) return;
    campaignsLoaded = true;

    requireServiceBase();
    const divisionId = requireDivisionId();

    campaignSelect.innerHTML = `<option value="">Cargando...</option>`;
    campaignSelect.disabled = true;

    const url = `${SERVICE_BASE}/genesys/campaigns?divisionId=${encodeURIComponent(divisionId)}`;
    const res = await fetch(url);

    if (!res.ok) {
      const j = await safeJson(res);
      const msg = j?.error || j?.message || j?.details || j?.raw || `Error cargando campañas (${res.status})`;
      throw new Error(msg);
    }

    const data = await res.json();

    campaignSelect.innerHTML = `<option value="">Seleccione una campaña...</option>`;
    data.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      campaignSelect.appendChild(opt);
    });

    if (savedCampaignId) campaignSelect.value = savedCampaignId;

    campaignSelect.disabled = false;
  }

  // -------------------------
  // SFMC init + save
  // -------------------------
  connection.on("initActivity", function (data) {
    const args = data?.arguments?.execute?.inArguments?.[0] || {};

    // OJO: aquí es donde debe venir divisionId desde Journey (recomendado)
    savedDivisionId = args.divisionId || "";

    savedContactListId = args.contactListId || "";
    savedCampaignId = args.campaignId || "";

    chk.checked = !!args.useNewList;
    inp.value = args.newListName || "";

    toggleNewListInput();
    refreshNextButton();
  });

  connection.on("clickedNext", save);
  connection.on("clickedDone", save);

  function save() {
    const payload = {
      arguments: {
        execute: {
          inArguments: [
            {
              // Guardamos división también para que no dependas del querystring
              divisionId: getDivisionId(),

              contactListId: select.value,
              useNewList: chk.checked,
              newListName: chk.checked ? inp.value : "",
              campaignId: campaignSelect ? campaignSelect.value : ""
            }
          ]
        }
      }
    };

    connection.trigger("updateActivity", payload);
  }

  // -------------------------
  // DOM Ready
  // -------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    chk.addEventListener("change", toggleNewListInput);
    inp.addEventListener("input", onNewListNameChange);
    select.addEventListener("change", refreshNextButton);

    btnCreate.disabled = true;
    btnCreate.addEventListener("click", onCreateClick);

    btnNext.addEventListener("click", async () => {
      if (!canGoNext()) return;
      goTo(2);
      try {
        await loadCampaignsOnce();
      } catch (e) {
        console.error(e);
      }
    });

    btnBack.addEventListener("click", () => goTo(1));

    try {
      await loadContactLists();
      connection.trigger("ready");
    } catch (e) {
      console.error(e);
      select.innerHTML = `<option>Error cargando listas</option>`;
      setStatus(e.message || "Error cargando listas", "err");
      connection.trigger("ready");
    }
  });
})();