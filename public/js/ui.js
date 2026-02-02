const connection = new Postmonger.Session();
let payload = {};
let DIVISION_ID;
let INTERNAL_TOKEN;

async function loadContactLists(selectIdToSet = "") {
    selectContactLists.innerHTML = "<option>Cargando...</option>";
    try {
        const res = await fetch(`/api/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`, {
            headers: { "Authorization": `Bearer ${INTERNAL_TOKEN}` }
        });
        const data = await res.json();
        const items = data.entities || [];

        selectContactLists.innerHTML = `<option value="">-- Seleccione una lista --</option>`;
        items.forEach(item => {
            const opt = new Option(item.name, item.id);
            selectContactLists.add(opt);
        });

        if (selectIdToSet) selectContactLists.value = selectIdToSet;
        selectContactLists.disabled = false;
    } catch (err) {
        setStatus("Error cargando listas de Genesys", "err");
    }
}