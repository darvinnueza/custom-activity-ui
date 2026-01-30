// ===============================
// ENV
// ===============================
const {
  API_BASE_URL,
  DIVISION_ID,
  INTERNAL_API_TOKEN
} = window.__ENV__ || {};

if (!API_BASE_URL || !DIVISION_ID || !INTERNAL_API_TOKEN) {
  console.error("ENV missing", { API_BASE_URL, DIVISION_ID, INTERNAL_API_TOKEN });
  throw new Error("Missing required environment variables");
}

// ===============================
// ENDPOINTS (DERIVADOS)
// ===============================
const ENDPOINTS = {
  CONTACT_LISTS: `${API_BASE_URL}/genesys/contactlists`,
  CAMPAIGNS: `${API_BASE_URL}/genesys/campaigns`
};

// ===============================
// LOAD CONTACT LISTS
// ===============================
async function loadContactLists() {
  const select = document.getElementById("contactListSelect");

  select.innerHTML = `<option>Cargando...</option>`;
  select.disabled = true;

  try {
    const url = `${ENDPOINTS.CONTACT_LISTS}?divisionId=${encodeURIComponent(DIVISION_ID)}`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "x-internal-token": INTERNAL_API_TOKEN   // 🔐 CLAVE
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const items = data.items || [];

    select.innerHTML = `<option value="">-- Seleccione una lista --</option>`;

    items.forEach(item => {
      if (!item.id || !item.name) return;

      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    });

    select.disabled = false;
  } catch (err) {
    console.error("Error loading contact lists", err);
    select.innerHTML = `<option>Error cargando listas</option>`;
  }
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", loadContactLists);