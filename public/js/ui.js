/* global Postmonger */

let API_BASE_URL;
let DIVISION_ID;
let INTERNAL_TOKEN;

async function initEnv() {
  try {
    const res = await fetch("/api/env");

    if (!res.ok) {
      throw new Error("No se pudo cargar /api/env");
    }

    const env = await res.json();

    API_BASE_URL = env.API_BASE_URL;
    DIVISION_ID = env.DIVISION_ID;
    INTERNAL_TOKEN = env.INTERNAL_TOKEN; // ⚠️ NO se usa aquí, está bien así

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

async function loadContactLists() {
  const select = document.getElementById("contactListSelect");
  select.innerHTML = "<option>Cargando...</option>";
  select.disabled = true;

  try {
    const res = await fetch(
      `/api/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`
    );

    if (!res.ok) {
      const t = await res.text();
      throw new Error(t);
    }

    const data = await res.json();
    const items = data.items || [];

    select.innerHTML = `<option value="">-- Seleccione una lista --</option>`;

    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    });

    select.disabled = false;
  } catch (err) {
    console.error("CONTACT LIST ERROR:", err);
    select.innerHTML = "<option>Error cargando listas</option>";
  }
}

document.addEventListener("DOMContentLoaded", initEnv);