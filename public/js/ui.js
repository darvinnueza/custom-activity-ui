const { DIVISION_ID } = window.__ENV__ || {}; // si quieres, o ponlo fijo/desde SFMC

if (!DIVISION_ID) {
  console.error("ENV missing: DIVISION_ID");
  throw new Error("Missing DIVISION_ID");
}

async function loadContactLists() {
  const select = document.getElementById("contactListSelect");
  select.innerHTML = `<option>Cargando...</option>`;
  select.disabled = true;

  try {
    const url = `/api/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });

    if (!res.ok) {
      const raw = await res.text();
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`);
    }

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