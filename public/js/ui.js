/* global Postmonger */

let API_BASE_URL;
let DIVISION_ID;
let INTERNAL_TOKEN;

// ==============================
// UI ELEMENTS
// ==============================
let selectContactLists;
let chkNewList;
let inputNewList;
let btnCreateList;
let createStatus;
let btnNext;

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

function setNewListMode(enabled) {
  if (!chkNewList || !inputNewList || !btnCreateList) return;

  chkNewList.checked = enabled;

  if (enabled) {
    inputNewList.disabled = false;
    inputNewList.focus();
    btnCreateList.disabled = inputNewList.value.trim().length === 0;
  } else {
    inputNewList.value = "";
    inputNewList.disabled = true;
    btnCreateList.disabled = true;
    setStatus("", "");
  }
}

function wireNewListToggle() {
  if (!chkNewList || !inputNewList || !btnCreateList) return;

  // default (bloqueado)
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
// API CALLS
// ==============================
async function loadContactLists() {
  selectContactLists.innerHTML = "<option>Cargando...</option>";
  selectContactLists.disabled = true;

  try {
    const res = await fetch(
      `/api/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`,
      {
        headers: {
          // si tu backend requiere auth también para GET, déjalo
          Authorization: `Bearer ${INTERNAL_TOKEN}`,
          Accept: "application/json",
        },
      }
    );

    const text = await res.text();

    if (!res.ok) {
      throw new Error(text || `HTTP ${res.status}`);
    }

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    // ✅ Swagger: ContactListResponse.entities
    const items = Array.isArray(data.entities) ? data.entities : [];

    selectContactLists.innerHTML = `<option value="">-- Seleccione una lista --</option>`;

    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      selectContactLists.appendChild(opt);
    });

    selectContactLists.disabled = false;
  } catch (err) {
    console.error("CONTACT LIST ERROR:", err);
    selectContactLists.innerHTML = "<option>Error cargando listas</option>";
    selectContactLists.disabled = true;
  }
}

async function createContactList() {
  try {
    setStatus("", "");
    const name = inputNewList.value.trim();
    if (!name) return;

    // ✅ CONTRATO (Swagger + lo que tu servicio valida)
    const payload = {
      name,
      columnNames: ["request_id", "contact_key", "msisdn", "status", "activityId"],
      phoneColumns: [{ columnName: "msisdn", type: "cell" }],
      division: { id: DIVISION_ID },
    };

    btnCreateList.disabled = true;
    setStatus("Creando lista...", "");

    const res = await fetch(`/api/genesys/contactlists`, {
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
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      console.error("CREATE LIST ERROR:", data || text);
      // muestra algo útil
      const msg =
        data?.error ||
        data?.message ||
        (typeof text === "string" && text.length < 200 ? text : "Error creando la lista.");
      setStatus(msg, "err");
      btnCreateList.disabled = false; // permitir reintento
      return;
    }

    setStatus("Lista creada correctamente ✅", "ok");

    // Refresca listas y selecciona la nueva
    await loadContactLists();
    if (data?.id) {
      selectContactLists.value = data.id;
    }

    // Opcional: apaga modo nueva lista
    setNewListMode(false);

    // habilita "Siguiente" si aplica tu flujo
    if (btnNext) btnNext.disabled = false;
  } catch (err) {
    console.error("CREATE LIST EXCEPTION:", err);
    setStatus("Error creando la lista. Revise consola / network.", "err");
    btnCreateList.disabled = false;
  }
}

// ==============================
// INIT ENV
// ==============================
async function initEnv() {
  try {
    // bind elements (IMPORTANTE: esperar DOM)
    selectContactLists = document.getElementById("contactListSelect");
    chkNewList = document.getElementById("newListCheck");
    inputNewList = document.getElementById("newListName");
    btnCreateList = document.getElementById("btnCreateList");
    createStatus = document.getElementById("createStatus");
    btnNext = document.getElementById("btnNext");

    // activa lógica UI
    wireNewListToggle();

    // click crear lista
    if (btnCreateList) {
      btnCreateList.addEventListener("click", () => {
        if (!chkNewList.checked) return;
        createContactList();
      });
    }

    const res = await fetch("/api/env");
    if (!res.ok) throw new Error("No se pudo cargar /api/env");

    const env = await res.json();

    API_BASE_URL = env.API_BASE_URL;
    DIVISION_ID = env.DIVISION_ID;
    INTERNAL_TOKEN = env.INTERNAL_TOKEN;

    if (!API_BASE_URL || !DIVISION_ID || !INTERNAL_TOKEN) {
      throw new Error("Missing ENV variables (API_BASE_URL / DIVISION_ID / INTERNAL_TOKEN)");
    }

    await loadContactLists();
  } catch (err) {
    console.error("ENV ERROR:", err);
    const select = document.getElementById("contactListSelect");
    if (select) {
      select.innerHTML = "<option>Error cargando configuración</option>";
    }
  }
}

document.addEventListener("DOMContentLoaded", initEnv);