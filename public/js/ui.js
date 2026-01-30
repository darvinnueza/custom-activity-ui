/* global Postmonger */

let API_BASE_URL;
let DIVISION_ID;

// ==============================
// UI ELEMENTS
// ==============================
const chkNewList = document.getElementById("newListCheck");
const inputNewList = document.getElementById("newListName");
const btnCreateList = document.getElementById("btnCreateList");
const selectContactList = document.getElementById("contactListSelect");
const statusEl = document.getElementById("createStatus");

// ==============================
// HELPERS
// ==============================
function setStatus(msg, type /* ok|err|'' */) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.classList.remove("ok", "err");
  if (type === "ok") statusEl.classList.add("ok");
  if (type === "err") statusEl.classList.add("err");
}

function setNewListMode(enabled) {
  if (!chkNewList || !inputNewList || !btnCreateList || !selectContactList) return;

  chkNewList.checked = enabled;

  if (enabled) {
    // modo crear
    selectContactList.disabled = true;

    inputNewList.disabled = false;
    inputNewList.focus();

    const name = inputNewList.value.trim();
    btnCreateList.disabled = name.length === 0;

    setStatus("", "");
  } else {
    // modo seleccionar
    inputNewList.value = "";
    inputNewList.disabled = true;
    btnCreateList.disabled = true;

    selectContactList.disabled = false;

    setStatus("", "");
  }
}

function wireNewListToggle() {
  if (!chkNewList || !inputNewList || !btnCreateList || !selectContactList) return;

  // estado inicial (CRÍTICO)
  setNewListMode(false);

  chkNewList.addEventListener("change", () => {
    setNewListMode(chkNewList.checked);
  });

  inputNewList.addEventListener("input", () => {
    if (!chkNewList.checked) return;
    btnCreateList.disabled = inputNewList.value.trim().length === 0;
  });

  btnCreateList.addEventListener("click", createContactList);
}

// ==============================
// CREATE CONTACT LIST (POST)
// ==============================
async function createContactList() {
  try {
    const name = (inputNewList.value || "").trim();
    if (!name) {
      setStatus("Ingrese un nombre para la lista.", "err");
      return;
    }

    btnCreateList.disabled = true;
    setStatus("Creando lista...", "");

    // Body SEGÚN SWAGGER
    const payload = {
      name,
      columnNames: ["request_id", "contact_key", "msisdn", "status"],
      phoneColumns: [{ columnName: "msisdn", type: "cell" }]
    };

    const res = await fetch("/api/genesys/contactlists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

    let created = {};
    try { created = text ? JSON.parse(text) : {}; } catch { created = {}; }

    setStatus("Lista creada correctamente.", "ok");

    // Recargar listas y seleccionar la nueva
    await loadContactLists();

    // Si tu API devuelve {id,name} (como swagger), selecciona
    if (created && created.id) {
      selectContactList.value = created.id;
    }

    // salir del modo crear
    setNewListMode(false);

  } catch (err) {
    console.error("CREATE LIST ERROR:", err);
    setStatus("Error creando la lista. Revise consola / network.", "err");
    btnCreateList.disabled = false;
  }
}

// ==============================
// INIT ENV (TU CÓDIGO)
// ==============================
async function initEnv() {
  try {
    // activar lógica UI
    wireNewListToggle();

    const res = await fetch("/api/env");
    if (!res.ok) throw new Error("No se pudo cargar /api/env");

    const env = await res.json();

    API_BASE_URL = env.API_BASE_URL;
    DIVISION_ID = env.DIVISION_ID;

    if (!API_BASE_URL || !DIVISION_ID) {
      throw new Error("Missing ENV variables");
    }

    await loadContactLists();
  } catch (err) {
    console.error("ENV ERROR:", err);
    if (selectContactList) {
      selectContactList.innerHTML = "<option>Error cargando configuración</option>";
      selectContactList.disabled = true;
    }
  }
}

// ==============================
// LOAD CONTACT LISTS (TU CÓDIGO)
// ==============================
async function loadContactLists() {
  if (!selectContactList) return;

  selectContactList.innerHTML = "<option>Cargando...</option>";
  selectContactList.disabled = true;

  try {
    const res = await fetch(
      `/api/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`
    );

    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    // Swagger: ContactListResponse.entities
    const items = Array.isArray(data.entities) ? data.entities : [];

    selectContactList.innerHTML = `<option value="">-- Seleccione una lista --</option>`;

    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      selectContactList.appendChild(opt);
    });

    // Solo habilitar si NO estás en modo crear
    if (!chkNewList.checked) {
      selectContactList.disabled = false;
    }
  } catch (err) {
    console.error("CONTACT LIST ERROR:", err);
    selectContactList.innerHTML = "<option>Error cargando listas</option>";
    selectContactList.disabled = true;
  }
}

document.addEventListener("DOMContentLoaded", initEnv);