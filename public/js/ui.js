/* global Postmonger */

const connection = new Postmonger.Session();
let payload = {};
let DIVISION_ID;
let INTERNAL_TOKEN;
let AUTH_TOKEN_JWT; // <--- Nueva variable para guardar el token de Salesforce

// --- FUNCIÓN DE SEGURIDAD (Añadida al inicio) ---
connection.on('initActivity', function (data) {
    if (data) {
        payload = data;
    }
    // Si activaste useJwt: true, Salesforce envía el token aquí
    AUTH_TOKEN_JWT = data.jwt; 
    console.log("Token JWT de Salesforce recibido");
});

let stepContact, stepCampaign, selectContactLists, chkNewList, inputNewList, btnCreateList, createStatus, campaignSelect;

async function initEnv() {
    // ... (Tu código actual de vinculación de elementos se mantiene igual)
    stepContact = document.getElementById("stepContact");
    stepCampaign = document.getElementById("stepCampaign");
    selectContactLists = document.getElementById("contactListSelect");
    chkNewList = document.getElementById("newListCheck");
    inputNewList = document.getElementById("newListName");
    btnCreateList = document.getElementById("btnCreateList");
    createStatus = document.getElementById("createStatus");
    campaignSelect = document.getElementById("campaignSelect");

    // --- ESTADO INICIAL ---
    inputNewList.disabled = true;
    btnCreateList.disabled = true;

    // ... (Tus funciones validarBotonSiguiente y refrescarInterfaz se mantienen igual)
    const validarBotonSiguiente = () => {
        const hayListaSeleccionada = selectContactLists.value !== "";
        if (hayListaSeleccionada) {
            connection.trigger('updateButton', { button: 'next', enabled: true });
        } else {
            connection.trigger('updateButton', { button: 'next', enabled: false });
        }
    };

    const refrescarInterfaz = () => {
        const estaMarcado = chkNewList.checked;
        const tieneTexto = inputNewList.value.trim().length > 0;
        inputNewList.disabled = !estaMarcado;
        selectContactLists.disabled = estaMarcado;
        btnCreateList.disabled = !(estaMarcado && tieneTexto);
        validarBotonSiguiente();
    };

    chkNewList.addEventListener("change", refrescarInterfaz);
    inputNewList.addEventListener("input", refrescarInterfaz);
    selectContactLists.addEventListener("change", validarBotonSiguiente);

    btnCreateList.onclick = createContactList;

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

// --- CAMBIO CLAVE EN LAS PETICIONES FETCH ---
async function createContactList() {
    const name = inputNewList.value.trim();
    if (!name) return;

    createStatus.textContent = "Creando lista...";
    btnCreateList.disabled = true; 

    try {
        const res = await fetch(`/api/genesys/contactlists/create`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${INTERNAL_TOKEN}`,
                "X-SFMC-JWT": AUTH_TOKEN_JWT, // <--- Enviamos el token al servidor para que valide
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

        createStatus.textContent = "¡Lista creada!";
        chkNewList.checked = false;
        inputNewList.value = "";
        inputNewList.disabled = true;
        selectContactLists.disabled = false;
        
        await loadContactLists(data.id);
        connection.trigger('updateButton', { button: 'next', enabled: true });

    } catch (err) {
        createStatus.textContent = "Error: " + err.message;
        btnCreateList.disabled = false;
    }
}

// ... (El resto de loadContactLists se mantiene igual)
async function loadContactLists(selectIdToSet = "") {
    try {
        const res = await fetch(`/api/genesys/contactlists?divisionId=${DIVISION_ID}`, {
            headers: { 
                "Authorization": `Bearer ${INTERNAL_TOKEN}`,
                "X-SFMC-JWT": AUTH_TOKEN_JWT // <--- También aquí para proteger la carga
            }
        });
        const data = await res.json();
        selectContactLists.innerHTML = '<option value="">-- Seleccione una lista --</option>';
        (data.entities || []).forEach(item => {
            selectContactLists.add(new Option(item.name, item.id));
        });
        if (selectIdToSet) selectContactLists.value = selectIdToSet;
    } catch (e) { console.error("Error cargando listas"); }
}

document.addEventListener("DOMContentLoaded", initEnv);