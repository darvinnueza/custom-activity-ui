/* global Postmonger */

let API_BASE_URL;
let DIVISION_ID;

// ==============================
// UI ELEMENTS (NUEVA LISTA)
// ==============================
const chkNewList = document.getElementById("newListCheck");
const inputNewList = document.getElementById("newListName");
const btnCreateList = document.getElementById("btnCreateList");

// ==============================
// ESTADO INICIAL (CRÍTICO)
// ==============================
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
  }
}

function wireNewListToggle() {
  if (!chkNewList || !inputNewList || !btnCreateList) return;

  // default
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
// INIT ENV (TU CÓDIGO)
// ==============================
async function initEnv() {
  try {
    // 🔧 activar la lógica UI sin tocar APIs
    wireNewListToggle();

    const res = await fetch("/api/env");

    if (!res.ok) {
      throw new Error("No se pudo cargar /api/env");
    }

    const env = await res.json();

    API_BASE_URL = env.API_BASE_URL;
    DIVISION_ID = env.DIVISION_ID;

    if (!API_BASE_URL || !DIVISION_ID) {
      throw new Error("Missing ENV variables");
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

// ==============================
// LOAD CONTACT LISTS (TU CÓDIGO)
// ==============================
async function loadContactLists() {
  const select = document.getElementById("contactListSelect");
  select.innerHTML = "<option>Cargando...</option>";
  select.disabled = true;

  try {
    const res = await fetch(
      `/api/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`
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

    // 🔥 Swagger: ContactListResponse.entities
    const items = Array.isArray(data.entities) ? data.entities : [];

    select.innerHTML = `<option value="">-- Seleccione una lista --</option>`;

    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    });

    select.disabled = false;
  } catch (err) {
    console.error("CONTACT LIST ERROR:", err);
    select.innerHTML = "<option>Error cargando listas</option>";
    select.disabled = true;
  }
}

document.addEventListener("DOMContentLoaded", initEnv);