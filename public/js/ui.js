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
// 1. INICIALIZACIÓN
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
    
    // ASEGURAR ESTADO INICIAL: Input de texto bloqueado por defecto
    inputNewList.disabled = true;
    btnCreateList.disabled = true;

    // ESCUCHAR EL CHECKBOX: Aquí es donde controlamos el "Tipeo"
    chkNewList.addEventListener("change", () => {
        const isChecked = chkNewList.checked;
        
        // Si el check es true -> habilita input. Si es false -> bloquea input.
        inputNewList.disabled = !isChecked;
        
        // El selector de arriba se bloquea si vamos a crear una nueva
        contactSelect.disabled = isChecked;
        
        if (isChecked) {
            // Limpia el input por si acaso y pone el foco
            inputNewList.value = "";
            inputNewList.focus();
            // Mientras el check esté activo, el botón Siguiente se bloquea 
            // porque el usuario prometió crear una lista nueva.
            btnNext.disabled = true;
        } else {
            // Si desmarca, el botón siguiente depende de si seleccionó algo arriba
            btnNext.disabled = !contactSelect.value;
            inputNewList.value = ""; // Limpia el texto si se arrepiente
        }
    });

    // Validar el botón "Crear Lista" solo cuando se escribe y el check está activo
    inputNewList.addEventListener("input", () => {
        const hasText = inputNewList.value.trim().length > 0;
        btnCreateList.disabled = !chkNewList.checked || !hasText;
    });

    // Validar selector normal (Paso 1)
    contactSelect.addEventListener("change", () => {
        if (!chkNewList.checked) {
            btnNext.disabled = !contactSelect.value;
        }
    });

    // Cargar entorno
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

// ==============================
// 2. NAVEGACIÓN
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
// 3. API GENESYS
// ==============================
async function loadContactLists(selectedId = "") {
    contactSelect.innerHTML = "<option>Cargando listas...</option>";
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
        
        // Si no hay check de nueva lista, validamos el botón siguiente
        if (!chkNewList.checked) {
            btnNext.disabled = !contactSelect.value;
        }
    } catch (err) {
        createStatus.textContent = "Error al cargar listas.";
    }
}

async function createContactList() {
    const name = inputNewList.value.trim();
    createStatus.textContent = "Creando lista en Genesys...";
    
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
        
        // RESET AUTOMÁTICO TRAS CREACIÓN
        chkNewList.checked = false;
        inputNewList.disabled = true;
        inputNewList.value = "";
        btnCreateList.disabled = true;
        contactSelect.disabled = false;
        
        await loadContactLists(data.id); // Recarga y selecciona la nueva automáticamente
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
// 4. SALESFORCE (POSTMONGER)
// ==============================
connection.on('initActivity', (data) => { if (data) payload = data; });

connection.on('clickedNext', () => {
    if (stepCampaign.style.display !== "none") save();
    else connection.trigger('ready');
});

function save() {
    if (!campaignSelect.value) {
        alert("Por favor, seleccione una campaña.");
        connection.trigger('ready');
        return;
    }

    // Usar la EventDefinitionKey dinámica del payload de SFMC
    const eventKey = payload.metaData.eventDefinitionKey;

    payload['arguments'].execute.inArguments = [{
        "requestId": "{{Event." + eventKey + ".request_id}}",
        "contactKey": "{{Contact.Key}}",
        "msisdn": "{{Event." + eventKey + ".msisdn}}",
        "contactListId": contactSelect.value,
        "campaignId": campaignSelect.value,
        "status": "NEW"
    }];

    payload['metaData'].isConfigured = true;
    connection.trigger('updateActivity', payload);
}