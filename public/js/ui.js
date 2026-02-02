/* global Postmonger */

// ==============================
// POSTMONGER CONFIG
// ==============================
const connection = new Postmonger.Session();
let payload = {};
let DIVISION_ID;
let INTERNAL_TOKEN;

// ==============================
// UI ELEMENTS
// ==============================
let stepContact, stepCampaign;
let selectContactLists, chkNewList, inputNewList, btnCreateList, createStatus;
let campaignSelect;

// ==============================
// 1. INITIALIZATION (Postmonger)
// ==============================
connection.on('initActivity', function (data) {
    if (data) {
        payload = data;
    }
    console.log("Payload inicial de SFMC:", payload);
});

connection.on('clickedNext', function () {
    if (stepContact.style.display !== 'none') {
        const selectedListId = selectContactLists?.value || "";
        if (selectedListId) {
            goToCampaignStep();
            connection.trigger('ready'); 
        } else {
            setStatus("Seleccione o cree una lista antes de continuar.", "err");
            connection.trigger('ready');
        }
    } else {
        save();
    }
});

// ==============================
// 2. SAVE LOGIC
// ==============================
function save() {
    const selectedListId = selectContactLists.value;
    const selectedCampaignId = campaignSelect.value;

    if (!selectedCampaignId) {
        setStatus("Seleccione una campaña para finalizar.", "err");
        connection.trigger('ready');
        return;
    }

    // Usar la EventDefinitionKey dinámica para que los datos se vinculen bien en SFMC
    const eventKey = payload.metaData.eventDefinitionKey;

    payload['arguments'].execute.inArguments = [{
        "request_id": "{{Event." + eventKey + ".request_id}}",
        "contact_key": "{{Contact.Key}}",
        "msisdn": "{{Event." + eventKey + ".msisdn}}",
        "status": "ready",
        "genesysListId": selectedListId,
        "genesysCampaignId": selectedCampaignId
    }];

    payload['metaData'].isConfigured = true;
    connection.trigger('updateActivity', payload);
}

// ==============================
// 3. UI HELPERS & API
// ==============================

function setStatus(msg, type) {
    if (!createStatus) return;
    createStatus.textContent = msg || "";
    createStatus.className = "status-message " + (type || "");
}

function showStep(step) {
    stepContact.style.display = step === "contact" ? "block" : "none";
    stepCampaign.style.display = step === "campaign" ? "block" : "none";
}

function setNewListMode(enabled) {
    if (!chkNewList) return;
    selectContactLists.disabled = enabled;
    inputNewList.disabled = !enabled;
    // Solo habilitar botón si está el check Y hay texto
    btnCreateList.disabled = !enabled || inputNewList.value.trim().length === 0;
    if (enabled) {
        inputNewList.focus();
    } else {
        inputNewList.value = "";
    }
}

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

async function createContactList() {
    const name = inputNewList.value.trim();
    if (!name) return;

    setStatus("Creando lista...", "");
    btnCreateList.disabled = true; // Evitar clicks múltiples

    try {
        // CORRECCIÓN: URL exacta del Swagger
        const res = await fetch(`/api/genesys/contactlists`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${INTERNAL_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                columnNames: ["request_id", "contact_key", "msisdn", "status"],
                phoneColumns: [{ columnName: "msisdn", type: "cell" }],
                division: { id: DIVISION_ID }
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error API");

        setStatus("¡Lista creada!", "ok");
        
        // Volver al modo normal tras éxito
        chkNewList.checked = false;
        setNewListMode(false);
        
        // Recargar y seleccionar la nueva
        await loadContactLists(data.id);
        
    } catch (err) {
        setStatus("Error: " + err.message, "err");
        btnCreateList.disabled = false;
    }
}

async function loadCampaigns() {
    campaignSelect.innerHTML = "<option>Cargando campañas...</option>";
    try {
        const res = await fetch(`/api/genesys/campaigns?divisionId=${encodeURIComponent(DIVISION_ID)}`, {
            headers: { "Authorization": `Bearer ${INTERNAL_TOKEN}` }
        });
        const data = await res.json();
        campaignSelect.innerHTML = `<option value="">-- Seleccione una campaña --</option>`;
        (data.entities || []).forEach(c => {
            campaignSelect.add(new Option(c.name, c.id));
        });
        campaignSelect.disabled = false;
    } catch (err) {
        setStatus("Error cargando campañas", "err");
    }
}

function goToCampaignStep() {
    showStep("campaign");
    loadCampaigns();
}

// ==============================
// INIT
// ==============================
async function initEnv() {
    stepContact = document.getElementById("stepContact");
    stepCampaign = document.getElementById("stepCampaign");
    selectContactLists = document.getElementById("contactListSelect");
    chkNewList = document.getElementById("newListCheck");
    inputNewList = document.getElementById("newListName");
    btnCreateList = document.getElementById("btnCreateList");
    createStatus = document.getElementById("createStatus");
    campaignSelect = document.getElementById("campaignSelect");

    // Estado inicial: Input bloqueado hasta que se use el check
    inputNewList.disabled = true;
    btnCreateList.disabled = true;

    chkNewList.addEventListener("change", function() {
        setNewListMode(chkNewList.checked);
    });
    
    // Conexión explícita del click del botón
    btnCreateList.onclick = function() {
        createContactList();
    };
    
    inputNewList.addEventListener("input", function() {
        btnCreateList.disabled = !chkNewList.checked || inputNewList.value.trim().length === 0;
    });

    try {
        const res = await fetch("/api/env");
        const env = await res.json();
        DIVISION_ID = env.DIVISION_ID;
        INTERNAL_TOKEN = env.INTERNAL_TOKEN;
        
        await loadContactLists();
        connection.trigger('ready');
    } catch (err) {
        console.error("Error de inicialización:", err);
    }
}

document.addEventListener("DOMContentLoaded", initEnv);