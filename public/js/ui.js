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

// ==============================
// INIT
// ==============================
async function initEnv() {
    // Vincular elementos del DOM
    stepContact = document.getElementById("stepContact");
    stepCampaign = document.getElementById("stepCampaign");
    selectContactLists = document.getElementById("contactListSelect");
    chkNewList = document.getElementById("newListCheck");
    inputNewList = document.getElementById("newListName");
    btnCreateList = document.getElementById("btnCreateList");
    createStatus = document.getElementById("createStatus");
    campaignSelect = document.getElementById("campaignSelect");

    // Listeners de UI
    chkNewList.addEventListener("change", () => setNewListMode(chkNewList.checked));
    //btnCreateList.addEventListener("click", createContactList);
    inputNewList.addEventListener("input", () => {
        btnCreateList.disabled = inputNewList.value.trim().length === 0;
    });

    // Obtener variables de entorno
    try {
        const res = await fetch("/api/env");
        const env = await res.json();
        DIVISION_ID = env.DIVISION_ID;
        INTERNAL_TOKEN = env.INTERNAL_TOKEN;
        
        await loadContactLists();
        
        // AVISAR A SALESFORCE QUE LA UI ESTÁ LISTA
        connection.trigger('ready');
    } catch (err) {
        console.error("Error de inicialización:", err);
    }
}

document.addEventListener("DOMContentLoaded", initEnv);