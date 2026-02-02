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
    
    // Si ya había configuración previa (ej. al re-editar la actividad)
    const hasInArguments = !!(
        payload['arguments'] &&
        payload['arguments'].execute &&
        payload['arguments'].execute.inArguments &&
        payload['arguments'].execute.inArguments.length > 0
    );

    const inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

    // Aquí podrías pre-cargar valores si existen en inArguments[0]
    console.log("Payload inicial de SFMC:", payload);
});

// Escuchar el clic en el botón "Siguiente" de la interfaz de Salesforce
connection.on('clickedNext', function () {
    if (stepContact.style.display !== 'none') {
        // Si estamos en el paso 1, intentamos pasar al 2
        const selectedListId = selectContactLists?.value || "";
        if (selectedListId) {
            goToCampaignStep();
            connection.trigger('ready'); 
        } else {
            setStatus("Seleccione o cree una lista antes de continuar.", "err");
            connection.trigger('ready');
        }
    } else {
        // Si ya estamos en el paso de campaña, guardamos todo
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

    // Mapeo de datos para el config.json
    payload['arguments'].execute.inArguments = [{
        "request_id": "{{Event.request_id}}",
        "contact_key": "{{Event.contact_key}}",
        "msisdn": "{{Event.msisdn}}",
        "status": "{{Event.status}}",
        "genesysListId": selectedListId,
        "genesysCampaignId": selectedCampaignId
    }];

    payload['metaData'].isConfigured = true;

    console.log("Guardando configuración final:", payload);
    connection.trigger('updateActivity', payload);
}

// ==============================
// 3. UI HELPERS & API (Tu lógica original adaptada)
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
    btnCreateList.disabled = !enabled || inputNewList.value.trim().length === 0;
    if (enabled) inputNewList.focus();
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

    setStatus("Creando lista en Genesys...", "");
    try {
        const res = await fetch(`/api/genesys/contactlists/create`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${INTERNAL_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                columnNames: ["request_id", "contact_key", "msisdn", "status"],
                phoneColumns: [{ columnName: "msisdn", type: "cell" }],
                division: { id: DIVISION_ID }
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error API");

        setStatus("¡Lista creada!", "ok");
        await loadContactLists(data.id);
        setNewListMode(false);
        chkNewList.checked = false;
    } catch (err) {
        setStatus(err.message, "err");
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
    btnCreateList.addEventListener("click", createContactList);
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