const API_URL = window.__ENV__?.API_URL;
const DIVISION_ID = window.__ENV__?.DIVISION_ID;

if (!API_URL || !DIVISION_ID) {
  console.error("ENV missing: API_URL or DIVISION_ID");
}

const url = `${API_URL}?divisionId=${encodeURIComponent(DIVISION_ID)}`;

async function loadContactLists() {
  const select = document.getElementById("contactListSelect");
  select.innerHTML = `<option>Cargando...</option>`;
  select.disabled = true;

  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(res.status);

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
    console.error(e);
    select.innerHTML = `<option>Error cargando listas</option>`;
  }
}

document.addEventListener("DOMContentLoaded", loadContactLists);