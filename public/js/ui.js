/* global Postmonger */
(function () {
  const connection = new Postmonger.Session();

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

  // =========================
  // ENV helpers
  // =========================
  function env() {
    return window.__ENV__ || {};
  }

  function getServiceBase() {
    const v = (env().SERVICE_BASE || "").trim().replace(/\/+$/, "");
    if (!v) throw new Error("SERVICE_BASE vacío. Revisa /api/env.js y Vercel env + redeploy.");
    return v;
  }

  function getServiceToken() {
    const v = (env().SERVICE_TOKEN || "").trim();
    if (!v) throw new Error("SERVICE_TOKEN vacío. Debe ser el Bearer token para tu service.");
    return v;
  }

  function getDefaultDivisionId() {
    return (env().DEFAULT_DIVISION_ID || "").trim();
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

    // 2) querystring ?divisionId=...
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get("divisionId");
    if (q) return q;

    // 3) DEFAULT_DIVISION_ID (fallback)
    const d = getDefaultDivisionId();
    if (d) return d;

    return "";
  }

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      let msg = txt;
      try {
        const j = JSON.parse(txt);
        msg = j?.error || j?.message || j?.details || txt;
      } catch {}
      throw new Error(`HTTP ${res.status} - ${msg || "Error"}`);
    }

    // puede venir JSON o vacío
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  function authHeaders(extra = {}) {
    const token = getServiceToken();
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...extra,
    };
  }

  // -------------------------
  // Helpers: Wizard
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
  // Create contact list (POST al SERVICE)
  // -------------------------
  async function onCreateClick() {
    try {
      const base = getServiceBase();

      const name = inp.value.trim();
      if (!name) return;

      setStatus("Creando lista...", "");
      btnCreate.disabled = true;

      const payload = {
        name,
        columnNames: ["request_id", "contact_key", "phone_number", "status"],
        phoneColumns: [{ columnName: "phone_number", type: "cell" }],
      };

      const data = await fetchJSON(`${base}/genesys/contactlists`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      // agregar al combo
      const opt = document.createElement("option");
      opt.value = data.id;
      opt.textContent = data.name;
      select.appendChild(opt);

      // volver a modo existente y seleccionar
      chk.checked = false;
      toggleNewListInput();
      select.value = data.id;

      setStatus(`Lista creada: ${data.name}`, "ok");
      refreshNextButton();
    } catch (e) {
      setStatus(e.message, "err");
      btnCreate.disabled = false;
    }
  }

  // -------------------------
  // Load contact lists (GET al SERVICE)
  // -------------------------
  async function loadContactLists() {
    const base = getServiceBase();

    const divisionId = getDivisionId();
    if (!divisionId) {
      setStatus("Falta divisionId. Debe venir desde SFMC o por ?divisionId=... o DEFAULT_DIVISION_ID.", "err");
      select.innerHTML = `<option value="">Sin divisionId</option>`;
      select.disabled = true;
      return;
    }

    setStatus("", "");
    select.innerHTML = `<option value="">Cargando...</option>`;
    select.disabled = true;

    try {
      const url = `${base}/genesys/contactlists?divisionId=${encodeURIComponent(divisionId)}`;
      const data = await fetchJSON(url, { headers: authHeaders() });

      select.innerHTML = `<option value="">Seleccione una lista...</option>`;
      (data || []).forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = item.name;
        select.appendChild(opt);
      });

      if (savedContactListId && !chk.checked) select.value = savedContactListId;

      select.disabled = false;
      toggleNewListInput();
    } catch (e) {
      setStatus(`Error cargando listas: ${e.message}`, "err");
      select.innerHTML = `<option value="">Error cargando listas</option>`;
      select.disabled = true;
    }
  }

  // -------------------------
  // Load campaigns (GET al SERVICE)
  // -------------------------
  let campaignsLoaded = false;
  async function loadCampaignsOnce() {
    if (campaignsLoaded) return;
    campaignsLoaded = true;

    const base = getServiceBase();

    const divisionId = getDivisionId();
    if (!divisionId) {
      setStatus("Falta divisionId para cargar campañas.", "err");
      campaignSelect.innerHTML = `<option value="">Sin divisionId</option>`;
      campaignSelect.disabled = true;
      return;
    }

    campaignSelect.innerHTML = `<option value="">Cargando...</option>`;
    campaignSelect.disabled = true;

    try {
      const url = `${base}/genesys/campaigns?divisionId=${encodeURIComponent(divisionId)}`;
      const data = await fetchJSON(url, { headers: authHeaders() });

      campaignSelect.innerHTML = `<option value="">Seleccione una campaña...</option>`;
      (data || []).forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name;
        campaignSelect.appendChild(opt);
      });

      if (savedCampaignId) campaignSelect.value = savedCampaignId;
      campaignSelect.disabled = false;
    } catch (e) {
      setStatus(`Error cargando campañas: ${e.message}`, "err");
      campaignSelect.innerHTML = `<option value="">Error cargando campañas</option>`;
      campaignSelect.disabled = true;
    }
  }

  // -------------------------
  // SFMC init + save
  // -------------------------
  connection.on("initActivity", function (data) {
    const args = data?.arguments?.execute?.inArguments?.[0] || {};

    savedContactListId = args.contactListId || "";
    savedCampaignId = args.campaignId || "";
    savedDivisionId = args.divisionId || ""; // IMPORTANTE

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
              divisionId: getDivisionId(),
              contactListId: select.value,
              useNewList: chk.checked,
              newListName: chk.checked ? inp.value : "",
              campaignId: campaignSelect ? campaignSelect.value : "",
            },
          ],
        },
      },
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
      await loadCampaignsOnce();
    });

    btnBack.addEventListener("click", () => goTo(1));

    try {
      await loadContactLists();
      connection.trigger("ready");
    } catch (e) {
      setStatus(e.message, "err");
      connection.trigger("ready");
    }
  });
})();