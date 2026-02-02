/* global Postmonger */

const connection = new Postmonger.Session();
let payload = {};
let DIVISION_ID;
let INTERNAL_TOKEN;

let stepContact, stepCampaign, selectContactLists, chkNewList, inputNewList, btnCreateList, createStatus, campaignSelect;

async function initEnv() {
    // 1. Vincular elementos
    stepContact = document.getElementById("stepContact");
    stepCampaign = document.getElementById("stepCampaign");
    selectContactLists = document.getElementById("contactListSelect");
    chkNewList = document.getElementById("newListCheck");
    inputNewList = document.getElementById("newListName");
    btnCreateList = document.getElementById("btnCreateList");
    createStatus = document.getElementById("createStatus");
    campaignSelect = document.getElementById("campaignSelect");

    // 2. ESTADO INICIAL (Esto es lo que faltaba al recargar)
    // Forzamos el estado visual correcto desde el inicio
    inputNewList.disabled = true;
    btnCreateList.disabled = true;
    chkNewList.checked = false; 

    // 3. Lógica de validación
    const refrescarInterfaz = () => {
        const estaMarcado = chkNewList.checked;
        const tieneTexto = inputNewList.value.trim().length > 0;

        // El input solo funciona si el check está puesto
        inputNewList.disabled = !estaMarcado;
        selectContactLists.disabled = estaMarcado;

        // El botón SOLO se habilita si está marcado Y hay texto
        btnCreateList.disabled = !(estaMarcado && tieneTexto);
    };

    // Escuchadores de eventos
    chkNewList.addEventListener("change", () => {
        refrescarInterfaz();
        if (chkNewList.checked) inputNewList.focus();
    });

    inputNewList.addEventListener("input", refrescarInterfaz);

    btnCreateList.onclick = createContactList;

    // 4. Carga de datos
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
// CREACIÓN (Ruta /create corregida)
// ==============================
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
        if (!res.ok) throw new Error(data.message || "Error en el servidor");

        createStatus.textContent = "¡Lista creada!";
        
        // Volver al estado inicial tras éxito
        chkNewList.checked = false;
        inputNewList.value = "";
        inputNewList.disabled = true;
        selectContactLists.disabled = false;
        btnCreateList.disabled = true;
        
        await loadContactLists(data.id);

    } catch (err) {
        createStatus.textContent = "Error: " + err.message;
        btnCreateList.disabled = false;
    }
}

async function loadContactLists(selectIdToSet = "") {
    try {
        const res = await fetch(`/api/genesys/contactlists?divisionId=${DIVISION_ID}`, {
            headers: { "Authorization": `Bearer ${INTERNAL_TOKEN}` }
        });
        const data = await res.json();
        selectContactLists.innerHTML = '<option value="">-- Seleccione una lista --</option>';
        (data.entities || []).forEach(item => {
            selectContactLists.add(new Option(item.name, item.id));
        });
        if (selectIdToSet) selectContactLists.value = selectIdToSet;
    } catch (e) {
        console.error("Error cargando listas");
    }
}

document.addEventListener("DOMContentLoaded", initEnv);