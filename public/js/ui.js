const { API_BASE_URL, DIVISION_ID } = window.__ENV__ || {};

if (!API_BASE_URL || !DIVISION_ID) {
  console.error("ENV missing: API_BASE_URL or DIVISION_ID");
  throw new Error("Missing environment variables");
}

// endpoints derivados (ESTO ES EL ESTÁNDAR)
const ENDPOINTS = {
  CONTACT_LISTS: `${API_BASE_URL}/genesys/contactlists`,
  CAMPAIGNS: `${API_BASE_URL}/genesys/campaigns`
};

async function loadContactLists() {
  const select = document.getElementById("contactListSelect");
  select.innerHTML = `<option>Cargando...</option>`;
  select.disabled = true;

  try {
    const url = `${ENDPOINTS.CONTACT_LISTS}?divisionId=${encodeURIComponent(DIVISION_ID)}`;

    const res = await fetch(url, {
      headers: { accept: "application/json" }
    });

    if (!res.ok) throw new Error(res.status);

    const data = await res.json();
    const items = data.items || [];

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

document.addEventListener("DOMContentLoaded", loadContactLists);