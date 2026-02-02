/* global Postmonger */

// ==============================
// 1. CONFIGURACIÓN Y ESTADO
// ==============================
const connection = new Postmonger.Session();
let payload = {};
let DIVISION_ID = "";
let INTERNAL_TOKEN = "";

// Elementos del DOM
const stepContact = document.getElementById("stepContact");
const stepCampaign = document.getElementById("stepCampaign");
const contactSelect = document.getElementById("contactListSelect");
const campaignSelect = document.getElementById("campaignSelect");
const chkNewList = document.getElementById("newListCheck");
const inputNewList = document.getElementById("newListName");
const btnCreateList = document.getElementById("btnCreateList");
const btnNext = document.getElementById("btnNext");
const btnBack = document.getElementById("btnBack");
const createStatus = document.getElementById("createStatus");

// ==============================
// 2. INICIALIZACIÓN
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
    // Escuchar cambios en el selector para habilitar el botón Siguiente
    contactSelect.addEventListener("change", () => {
        btnNext.disabled = !contactSelect.value;
    });

    // Manejo del checkbox de "Nueva Lista"
    chkNewList.addEventListener("change", () => {
        const isChecked = chkNewList.checked;
        contactSelect.disabled = isChecked;
        inputNewList.disabled = !isChecked;
        btnCreateList.disabled = !isChecked || inputNewList.value.trim().length === 0;
        
        if (isChecked) {
            btnNext.disabled = true; // Bloquear siguiente hasta que cree la lista
            inputNewList.focus();
        } else {
            btnNext.disabled = !contactSelect.value;
        }
    });

    // Habilitar botón de crear solo si hay texto
    inputNewList.addEventListener("input", () => {
        btnCreateList.disabled = !chkNewList.checked || inputNewList.value.trim().length === 0;
    });

    // Cargar variables de entorno y datos iniciales
    try {
        const res = await fetch("/api/env");
        const env = await res.json();
        DIVISION_ID = env.DIVISION_ID;
        INTERNAL_TOKEN = env.INTERNAL_TOKEN;
        
        await loadContactLists();
        connection.trigger('ready');
    } catch (e) {
        console.error("Error al inicializar:", e);
    }
});

// ==============================
// 3. LOGICA DE NAVEGACIÓN
// ==============================

btnNext.onclick = () => {
    stepContact.style.display = "none";
    stepCampaign.style.display = "block";
    loadCampaigns();
};

btnBack.onclick = () => {
    stepContact.style.display = "block";
    stepCampaign.style.display = "none";
};

// ==============================
// 4. LLAMADAS API (GENESYS)
// ==============================

async function loadContactLists(selectedId = "") {
    contactSelect.innerHTML = "<option>Cargando...</option>";
    try {
        const res = await fetch(`/api/genesys/contactlists?divisionId=${DIVISION_ID}`, {
            headers: { "Authorization": `Bearer ${INTERNAL_TOKEN}` }
        });
        const data = await res.json();
        
        contactSelect.innerHTML = '<option value="">-- Seleccione una lista --</option>';
        (data.entities || []).forEach(list => {
            const opt = new Option(list.name, list.id);
            contactSelect.add(opt);
        });

        if (selectedId) {
            contactSelect.value = selectedId;
        }
        btnNext.disabled = !contactSelect.value;
    } catch (err) {
        createStatus.textContent = "Error al cargar listas.";
    }
}

async function createContactList() {
    const name = inputNewList.value.trim();
    createStatus.textContent = "Creando lista...";
    
    try {
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

        createStatus.textContent = "¡Lista creada!";
        await loadContactLists(data.id); // Recarga y selecciona la nueva
        
        // Resetear formulario de nueva lista
        chkNewList.checked = false;
        inputNewList.value = "";
        inputNewList.disabled = true;
        btnCreateList.disabled = true;
        contactSelect.disabled = false;
        
    } catch (err) {
        createStatus.textContent = "Error: " + err.message;
    }
}

async function loadCampaigns() {
    campaignSelect.innerHTML = "<option>Cargando campañas...</option>";
    try {
        const res = await fetch(`/api/genesys/campaigns?divisionId=${DIVISION_ID}`, {
            headers: { "Authorization": `Bearer ${INTERNAL_TOKEN}` }
        });
        const data = await res.json();
        
        campaignSelect.innerHTML = '<option value="">-- Seleccione una campaña --</option>';
        (data.entities || []).forEach(camp => {
            campaignSelect.add(new Option(camp.name, camp.id));
        });
    } catch (err) {
        console.error("Error al cargar campañas");
    }
}

// ==============================
// 5. POSTMONGER (SFMC)
// ==============================

connection.on('initActivity', (data) => {
    if (data) payload = data;
});

connection.on('clickedNext', () => {
    if (stepCampaign.style.display !== "none") {
        save();
    } else {
        connection.trigger('ready');
    }
});

function save() {
    const listId = contactSelect.value;
    const campId = campaignSelect.value;

    if (!campId) {
        alert("Por favor seleccione una campaña");
        connection.trigger('ready');
        return;
    }

    payload['arguments'].execute.inArguments = [{
        "request_id": "{{Event." + payload.metaData.eventDefinitionKey + ".request_id}}",
        "contact_key": "{{Contact.Key}}",
        "msisdn": "{{Event." + payload.metaData.eventDefinitionKey + ".msisdn}}",
        "status": "ready",
        "genesysListId": listId,
        "genesysCampaignId": campId
    }];

    payload['metaData'].isConfigured = true;
    connection.trigger('updateActivity', payload);
}