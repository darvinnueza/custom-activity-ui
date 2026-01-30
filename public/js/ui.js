const { API_BASE_URL, DIVISION_ID } = window.__ENV__ || {};

if (!API_BASE_URL || !DIVISION_ID) {
  throw new Error("Missing ENV variables");
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

    items.forEach(i => {
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