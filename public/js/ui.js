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

  function setStatus(text, kind /* "ok" | "err" | "" */) {
    if (!status) return;
    status.textContent = text || "";
    status.className = "status";
    if (kind === "ok") status.className = "status ok";
    if (kind === "err") status.className = "status err";
  }

  function getDivisionId() {
    // 1) desde lo guardado en SFMC
    if (savedDivisionId) return savedDivisionId;

    // 2) fallback querystring ?divisionId=
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get("divisionId");
    if (q) return q;

    return "";
  }

  async function fetchJSON(url, options) {
    const res = await fetch(url, options);
    const txt = await res.text().catch(() => "");
    let body = null;
    try {
      body = txt ? JSON.parse(txt) : null;
    } catch {
      body = { raw: txt };
    }

    if (!res.ok) {
      const msg = body?.error || body?.message || body?.details || txt || "Error";
      throw new Error(`HTTP ${res.status} - ${msg}`);
    }
    return body;
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
    if (!chk.checked) btnCreate.disabled = true;
    else btnCreate.disabled = !(inp.value.trim().length > 0);

    refreshNextButton();
  }

  // -------------------------
  // Create contact list (POST -> proxy /api/genesys/contactlists)
  // -------------------------
  async function onCreateClick() {
    try {
      const name = inp.value.trim();
      if (!name) return;

      const divisionId = getDivisionId();
      if (!divisionId) {
        setStatus("Falta divisionId (SFMC o ?divisionId=...)", "err");
        return;
      }

      setStatus("Creando lista...", "");
      btnCreate.disabled = true;

      const payload = {
        name,
        columnNames: ["request_id", "contact_key", "phone_number", "status"],
        phoneColumns: [{ columnName: "phone_number", type: "cell" }],
      };

      const data = await fetchJSON(
        `/api/genesys/contactlists?divisionId=${encodeURIComponent(divisionId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const opt = document.createElement("option");
      opt.value = data.id;
      opt.textContent = data.name;
      select.appendChild(opt);

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
  // Load contact lists (GET -> proxy /api/genesys/contactlists)
  // -------------------------
  async function loadContactLists() {
    const divisionId = getDivisionId();
    if (!divisionId) {
      setStatus("Falta divisionId (SFMC o ?divisionId=...)", "err");
      select.innerHTML = `<option value="">Sin divisionId</option>`;
      select.disabled = true;
      return;
    }

    setStatus("", "");
    select.innerHTML = `<option value="">Cargando...</option>`;
    select.disabled = true;

    try {
      const data = await fetchJSON(
        `/api/genesys/contactlists?divisionId=${encodeURIComponent(divisionId)}`
      );

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
  // Load campaigns (GET -> proxy /api/genesys/campaigns)
  // -------------------------
  let campaignsLoaded = false;
  async function loadCampaignsOnce() {
    if (campaignsLoaded) return;
    campaignsLoaded = true;

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
      const data = await fetchJSON(
        `/api/genesys/campaigns?divisionId=${encodeURIComponent(divisionId)}`
      );

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
    savedDivisionId = args.divisionId || "";

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
    } catch {
      connection.trigger("ready");
    }
  });
})();