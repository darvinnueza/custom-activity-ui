/* global Postmonger */

const connection = new Postmonger.Session();
let payload = {};
let DIVISION_ID;
let INTERNAL_TOKEN;

let stepContact, stepCampaign;
let selectContactLists, chkNewList, inputNewList, btnCreateList, createStatus;
let campaignSelect;

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

    // --- LÓGICA DE CONTROL ---

    // 1. Al cambiar el Checkbox
    chkNewList.addEventListener("change", () => {
        const isChecked = chkNewList.checked;
        selectContactLists.disabled = isChecked;
        inputNewList.disabled = !isChecked;
        
        // Evaluar botón crear inmediatamente
        const tieneTexto = inputNewList.value.trim().length > 0;
        btnCreateList.disabled = !isChecked || !tieneTexto;
        
        if (isChecked) inputNewList.focus();
    });

    // 2. Al escribir (ESTO es lo que te estaba bloqueando)
    inputNewList.addEventListener("input", () => {
        const tieneTexto = inputNewList.value.trim().length > 0;
        // Habilitar solo si el check está activo Y hay texto
        btnCreateList.disabled = !chkNewList.checked || !tieneTexto;
    });

    // 3. Click en Crear
    btnCreateList.onclick = function() {
        createContactList();
    };

    // --- CARGA DE DATOS ---
    try {
        const res = await fetch("/api/env");
        const env = await res.json();
        DIVISION_ID = env.DIVISION_ID;
        INTERNAL_TOKEN = env.INTERNAL_TOKEN;
        
        await loadContactLists();
        connection.trigger('ready');
    } catch (err) {
        console.error("Error inicial:", err);
    }
}

// ==============================
// API GENESYS
// ==============================
async function createContactList() {
    const name = inputNewList.value.trim();
    if (!name) return;

    setStatus("Creando lista...", "");
    btnCreateList.disabled = true; 

    try {
        // Usando la ruta exacta del swagger
        const res = await fetch(`/api/genesys/contactlists/create`, {
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
        if (!res.ok) throw new Error(data.message || "Error al crear");

        setStatus("¡Lista creada!", "ok");
        
        // Reset de UI
        chkNewList.checked = false;
        inputNewList.value = "";
        inputNewList.disabled = true;
        selectContactLists.disabled = false;
        
        await loadContactLists(data.id);
    } catch (err) {
        setStatus(err.message, "err");
        btnCreateList.disabled = false;
    }
}

// ... (Resto de tus funciones loadContactLists, loadCampaigns y save igual que antes)

async function loadContactLists(selectIdToSet = "") {
    try {
        const res = await fetch(`/api/genesys/contactlists?divisionId=${encodeURIComponent(DIVISION_ID)}`, {
            headers: { "Authorization": `Bearer ${INTERNAL_TOKEN}` }
        });
        const data = await res.json();
        selectContactLists.innerHTML = `<option value="">-- Seleccione una lista --</option>`;
        (data.entities || []).forEach(item => {
            selectContactLists.add(new Option(item.name, item.id));
        });
        if (selectIdToSet) selectContactLists.value = selectIdToSet;
    } catch (err) { setStatus("Error cargando listas", "err"); }
}

function setStatus(msg, type) {
    createStatus.textContent = msg;
    createStatus.style.color = type === "err" ? "red" : "green";
}

document.addEventListener("DOMContentLoaded", initEnv);