/* global Postmonger */

const connection = new Postmonger.Session();
let payload = {};
let DIVISION_ID;
let INTERNAL_TOKEN;

// Elementos de la interfaz
let stepContact, stepCampaign, selectContactLists, chkNewList, inputNewList, btnCreateList, createStatus, campaignSelect;

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
    
    // Función simple para habilitar el botón
    const refrescarBoton = () => {
        const tieneTexto = inputNewList.value.trim().length > 0;
        // Solo habilitar si el check está marcado Y hay texto escrito
        btnCreateList.disabled = !(chkNewList.checked && tieneTexto);
    };

    chkNewList.addEventListener("change", () => {
        selectContactLists.disabled = chkNewList.checked;
        inputNewList.disabled = !chkNewList.checked;
        if (chkNewList.checked) inputNewList.focus();
        refrescarBoton();
    });

    inputNewList.addEventListener("input", refrescarBoton);

    // Asignar el clic directamente
    btnCreateList.onclick = createContactList;

    // Cargar credenciales
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
// CREACIÓN (Con tu ruta exacta)
// ==============================
async function createContactList() {
    const name = inputNewList.value.trim();
    if (!name) return;

    createStatus.textContent = "Creando lista...";
    createStatus.style.color = "blue";
    btnCreateList.disabled = true; 

    try {
        // USANDO LA RUTA QUE TÚ DICES: /create
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

        createStatus.textContent = "¡Lista creada correctamente!";
        createStatus.style.color = "green";
        
        // Reset de UI para volver a modo selección
        chkNewList.checked = false;
        inputNewList.value = "";
        inputNewList.disabled = true;
        selectContactLists.disabled = false;
        
        // Recargar el dropdown y seleccionar la nueva lista automáticamente
        await loadContactLists(data.id);

    } catch (err) {
        createStatus.textContent = "Error: " + err.message;
        createStatus.style.color = "red";
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
    } catch (err) {
        console.error("Error cargando listas");
    }
}

document.addEventListener("DOMContentLoaded", initEnv);