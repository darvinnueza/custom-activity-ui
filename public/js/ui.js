// ===== ENV =====
const API_BASE_URL = window.__ENV__?.API_BASE_URL;
const DIVISION_ID = window.__ENV__?.DIVISION_ID;

if (!API_BASE_URL || !DIVISION_ID) {
  console.error("ENV missing: API_BASE_URL or DIVISION_ID");
}

// ===== ENDPOINTS (claros y extensibles) =====
const endpoints = {
  contactLists: () =>
    `${API_BASE_URL}/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`,

  campaigns: () =>
    `${API_BASE_URL}/genesys/campaigns?divisionId=${encodeURIComponent(DIVISION_ID)}`
};

// ===== UI LOGIC =====
async function loadContactLists() {
  const select = document.getElementById("contactListSelect");
  select.innerHTML = `<option>Cargando...</option>`;
  select.disabled = true;

  try {
    const res = await fetch(endpoints.contactLists(), {
      headers: { accept: "application/json" }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const items = data.items || data || [];

    select.innerHTML = `<option value="">-- Seleccione una lista --</option>`;

    items.forEach(i => {
      if (!i.id || !i.name) return;

      const opt = document.createElement("option");
      opt.value = i.id;
      opt.textContent = i.name;
      select.appendChild(opt);
    });

    select.disabled = false;
  } catch (e) {
    console.error("Error loading contact lists", e);
    select.innerHTML = `<option>Error cargando listas</option>`;
  }
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", loadContactLists);
