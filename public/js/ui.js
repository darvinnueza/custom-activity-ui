/* global Postmonger */

let DIVISION_ID;
let INTERNAL_TOKEN;

// ==============================
// UI ELEMENTS
// ==============================
let stepContact;
let stepCampaign;

let selectContactLists;
let chkNewList;
let inputNewList;
let btnCreateList;
let createStatus;

let btnNext;
let btnBack;

let campaignSelect;

// ==============================
// HELPERS UI
// ==============================
function setStatus(msg, type) {
  if (!createStatus) return;

  createStatus.textContent = msg || "";
  createStatus.classList.remove("ok", "err");

  if (type === "ok") createStatus.classList.add("ok");
  if (type === "err") createStatus.classList.add("err");
}

function setNextEnabled(enabled) {
  if (!btnNext) return;
  btnNext.disabled = !enabled;
}

function showStep(step) {
  // step: "contact" | "campaign"
  if (stepContact) stepContact.style.display = step === "contact" ? "block" : "none";
  if (stepCampaign) stepCampaign.style.display = step === "campaign" ? "block" : "none";
}

function setNewListMode(enabled) {
  if (!chkNewList || !inputNewList || !btnCreateList || !selectContactLists) return;

  chkNewList.checked = enabled;

  if (enabled) {
    // En modo nueva lista se ignora el select existente
    selectContactLists.disabled = true;

    inputNewList.disabled = false;
    inputNewList.focus();

    btnCreateList.disabled = inputNewList.value.trim().length === 0;

    // "Siguiente" deshabilitado hasta crear OK
    setNextEnabled(false);
  } else {
    // Volver al modo lista existente
    inputNewList.value = "";
    inputNewList.disabled = true;

    btnCreateList.disabled = true;

    selectContactLists.disabled = false;

    setStatus("", "");

    // Siguiente depende de selección existente
    setNextEnabled(!!selectContactLists.value);
  }
}

function wireNewListToggle() {
  if (!chkNewList || !inputNewList || !btnCreateList) return;

  setNewListMode(false);

  chkNewList.addEventListener("change", () => {
    setNewListMode(chkNewList.checked);
  });

  inputNewList.addEventListener("input", () => {
    if (!chkNewList.checked) return;
    btnCreateList.disabled = inputNewList.value.trim().length === 0;
  });
}

// ==============================
// API CALLS - CONTACT LISTS
// ==============================
async function loadContactLists(selectIdToSet = "") {
  if (!selectContactLists) return;

  selectContactLists.innerHTML = "<option>Cargando...</option>";
  selectContactLists.disabled = true;

  try {
    const res = await fetch(
      `/api/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`,
      {
        headers: {
          Authorization: `Bearer ${INTERNAL_TOKEN}`,
          Accept: "application/json",
        },
      }
    );

    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    const items = Array.isArray(data.entities) ? data.entities : [];

    selectContactLists.innerHTML = `<option value="">-- Seleccione una lista --</option>`;

    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      selectContactLists.appendChild(opt);
    });

    if (selectIdToSet) {
      selectContactLists.value = selectIdToSet;
    }

    // si NO estás en modo nueva lista, habilita select
    if (!chkNewList?.checked) {
      selectContactLists.disabled = false;
      setNextEnabled(!!selectContactLists.value);
    } else {
      selectContactLists.disabled = true;
      setNextEnabled(false);
    }
  } catch (err) {
    console.error("CONTACT LIST ERROR:", err);
    selectContactLists.innerHTML = "<option>Error cargando listas</option>";
    selectContactLists.disabled = true;
    setNextEnabled(false);
  }
}

async function createContactList() {
  try {
    setStatus("", "");

    const name = (inputNewList?.value || "").trim();
    if (!name) return;

    const payload = {
      name,
      columnNames: ["request_id", "contact_key", "msisdn", "status", "activityId"],
      phoneColumns: [{ columnName: "msisdn", type: "cell" }],
      division: { id: DIVISION_ID },
    };

    btnCreateList.disabled = true;
    setStatus("Creando lista...", "");

    // POST separado
    const res = await fetch(`/api/genesys/contactlists/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${INTERNAL_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!res.ok) {
      console.error("CREATE LIST ERROR:", data || text);
      const msg =
        data?.error ||
        data?.message ||
        data?.details ||
        (typeof text === "string" && text.length < 200 ? text : "Error creando la lista.");
      setStatus(msg, "err");
      btnCreateList.disabled = inputNewList.value.trim().length === 0;
      return;
    }

    setStatus("Lista creada correctamente ✅", "ok");

    const newId = data?.id || "";
    await loadContactLists(newId);

    // volver a modo lista existente, ya con la nueva seleccionada
    setNewListMode(false);
    setNextEnabled(true);
  } catch (err) {
    console.error("CREATE LIST EXCEPTION:", err);
    setStatus("Error creando la lista. Revise consola / network.", "err");
    btnCreateList.disabled = inputNewList.value.trim().length === 0;
  }
}

// ==============================
// API CALLS - CAMPAIGNS
// ==============================
async function loadCampaigns(selectIdToSet = "") {
  if (!campaignSelect) return;

  campaignSelect.innerHTML = "<option>Cargando...</option>";
  campaignSelect.disabled = true;

  try {
    const res = await fetch(
      `/api/genesys/campaigns?divisionId=${encodeURIComponent(DIVISION_ID)}`,
      {
        headers: {
          Authorization: `Bearer ${INTERNAL_TOKEN}`,
          Accept: "application/json",
        },
      }
    );

    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    const items = Array.isArray(data.entities) ? data.entities : [];

    campaignSelect.innerHTML = `<option value="">-- Seleccione una campaña --</option>`;

    items.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      campaignSelect.appendChild(opt);
    });

    if (selectIdToSet) campaignSelect.value = selectIdToSet;

    campaignSelect.disabled = false;
  } catch (err) {
    console.error("CAMPAIGNS ERROR:", err);
    campaignSelect.innerHTML = "<option>Error cargando campañas</option>";
    campaignSelect.disabled = true;
  }
}

// ==============================
// FLOW: NEXT/BACK
// ==============================
function goToCampaignStep() {
  // Validación mínima: debe haber contact list seleccionada
  const selectedListId = selectContactLists?.value || "";
  if (!selectedListId) {
    setStatus("Seleccione una lista de contactos.", "err");
    return;
  }

  // cambia UI al paso 2
  showStep("campaign");

  // carga campañas
  loadCampaigns();
}

function goBackToContactStep() {
  showStep("contact");
}

// ==============================
// INIT ENV + BIND
// ==============================
async function initEnv() {
  try {
    // bind elements
    stepContact = document.getElementById("stepContact");
    stepCampaign = document.getElementById("stepCampaign");

    selectContactLists = document.getElementById("contactListSelect");
    chkNewList = document.getElementById("newListCheck");
    inputNewList = document.getElementById("newListName");
    btnCreateList = document.getElementById("btnCreateList");
    createStatus = document.getElementById("createStatus");

    btnNext = document.getElementById("btnNext");
    btnBack = document.getElementById("btnBack");

    campaignSelect = document.getElementById("campaignSelect");

    // default step
    showStep("contact");

    // UI wiring
    wireNewListToggle();

    // select change -> habilita siguiente
    if (selectContactLists) {
      selectContactLists.addEventListener("change", () => {
        if (chkNewList?.checked) return;
        setStatus("", "");
        setNextEnabled(!!selectContactLists.value);
      });
    }

    // crear lista
    if (btnCreateList) {
      btnCreateList.addEventListener("click", () => {
        if (!chkNewList?.checked) return;
        createContactList();
      });
    }

    // siguiente
    if (btnNext) {
      btnNext.addEventListener("click", () => {
        goToCampaignStep();
      });
    }

    // back
    if (btnBack) {
      btnBack.addEventListener("click", () => {
        goBackToContactStep();
      });
    }

    // ENV
    const res = await fetch("/api/env");
    if (!res.ok) throw new Error("No se pudo cargar /api/env");

    const env = await res.json();

    DIVISION_ID = env.DIVISION_ID;
    INTERNAL_TOKEN = env.INTERNAL_TOKEN;

    if (!DIVISION_ID || !INTERNAL_TOKEN) {
      throw new Error("Missing ENV variables (DIVISION_ID / INTERNAL_TOKEN)");
    }

    await loadContactLists();
  } catch (err) {
    console.error("ENV ERROR:", err);
    if (selectContactLists) {
      selectContactLists.innerHTML = "<option>Error cargando configuración</option>";
      selectContactLists.disabled = true;
    }
    setNextEnabled(false);
  }
}

document.addEventListener("DOMContentLoaded", initEnv);