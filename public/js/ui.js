/* global Postmonger */

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
// INICIALIZACIÓN
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. Lógica del Checkbox (Bloquear/Desbloquear campos)
    chkNewList.addEventListener("change", () => {
        const isChecked = chkNewList.checked;
        
        // Si el check está marcado: habilita input de texto, bloquea el selector de arriba
        contactSelect.disabled = isChecked;
        inputNewList.disabled = !isChecked;
        
        // Solo habilita el botón de crear si hay texto y el check está marcado
        btnCreateList.disabled = !isChecked || inputNewList.value.trim().length === 0;
        
        if (isChecked) {
            btnNext.disabled = true; // No puede avanzar hasta que cree la lista
            inputNewList.focus();
        } else {
            // Si desmarca, vuelve a validar el selector de arriba
            btnNext.disabled = !contactSelect.value;
        }
    });

    // 2. Habilitar botón de crear MIENTRAS se escribe (si el check está activo)
    inputNewList.addEventListener("input", () => {
        if (chkNewList.checked) {
            btnCreateList.disabled = inputNewList.value.trim().length === 0;
        }
    });

    // 3. Validar selector normal
    contactSelect.addEventListener("change", () => {
        if (!chkNewList.checked) {
            btnNext.disabled = !contactSelect.value;
        }
    });

    // 4. Obtener entorno y cargar datos
    try {
        const res = await fetch("/api/env");
        const env = await res.json();
        DIVISION_ID = env.DIVISION_ID;
        INTERNAL_TOKEN = env.INTERNAL_TOKEN;
        
        await loadContactLists();
        connection.trigger('ready');
    } catch (e) {
        console.error("Error inicializando:", e);
    }
});

// --- NAVEGACIÓN ---
btnNext.onclick = () => {
    stepContact.style.display = "none";
    stepCampaign.style.display = "block";
    loadCampaigns();
};

btnBack.onclick = () => {
    stepContact.style.display = "block";
    stepCampaign.style.display = "none";
};

// --- GENESYS API ---
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

        if (selectedId) contactSelect.value = selectedId;
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
        if (!res.ok) throw new Error(data.message || "Error al crear lista");

        createStatus.textContent = "¡Lista creada!";
        
        // Importante: Desmarcamos el check y volvemos a modo normal
        chkNewList.checked = false;
        inputNewList.disabled = true;
        contactSelect.disabled = false;
        
        await loadContactLists(data.id); // Recarga y selecciona la nueva lista
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

// --- SFMC ---
connection.on('initActivity', (data) => { if (data) payload = data; });

connection.on('clickedNext', () => {
    if (stepCampaign.style.display !== "none") save();
    else connection.trigger('ready');
});

function save() {
    if (!campaignSelect.value) {
        alert("Seleccione una campaña");
        connection.trigger('ready');
        return;
    }

    payload['arguments'].execute.inArguments = [{
        "request_id": "{{Event." + payload.metaData.eventDefinitionKey + ".request_id}}",
        "contact_key": "{{Contact.Key}}",
        "msisdn": "{{Event." + payload.metaData.eventDefinitionKey + ".msisdn}}",
        "status": "ready",
        "genesysListId": contactSelect.value,
        "genesysCampaignId": campaignSelect.value
    }];

    payload['metaData'].isConfigured = true;
    connection.trigger('updateActivity', payload);
}