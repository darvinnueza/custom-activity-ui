/* global Postmonger */

const connection = new Postmonger.Session();
let payload = {};
let DIVISION_ID;
let INTERNAL_TOKEN;
let AUTH_TOKEN_JWT; 

// SECCIÓN DE VALIDACIÓN (Al inicio del archivo)
connection.on('initActivity', async function (data) {
    if (data && data.jwt) {
        AUTH_TOKEN_JWT = data.jwt; 

        try {
            // Llamamos a nuestra API para validar e imprimir el log
            const res = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: AUTH_TOKEN_JWT })
            });

            if (res.ok) {
                // Si todo está bien, mostramos el formulario
                document.body.style.display = "block";
            } else {
                throw new Error("Acceso no autorizado");
            }
        } catch (err) {
            document.documentElement.innerHTML = "<h1>403 - Error de Firma JWT</h1>";
        }
    }
});

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

    inputNewList.disabled = true;
    btnCreateList.disabled = true;

    const validarBotonSiguiente = () => {
        const hayListaSeleccionada = selectContactLists.value !== "";
        connection.trigger('updateButton', { button: 'next', enabled: hayListaSeleccionada });
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
                "X-SFMC-JWT": AUTH_TOKEN_JWT, 
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

async function loadContactLists(selectIdToSet = "") {
    try {
        const res = await fetch(`/api/genesys/contactlists?divisionId=${DIVISION_ID}`, {
            headers: { 
                "Authorization": `Bearer ${INTERNAL_TOKEN}`,
                "X-SFMC-JWT": AUTH_TOKEN_JWT 
            }
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