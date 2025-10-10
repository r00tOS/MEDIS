// TODO: maybe add promptAddEntry() & addCustomHistoryEvent() to this file
// maybe also a function to generateHistoryHTML() but not sure
// not sure if this is the right place for it
// but it is not model-view-controller compliant in any way ^^

/**
 * Types of history events for patient tracking:
 * - "statusChange": The patient's status has changed.
 * - "remark": A note or comment has been added to the patient's record.
 * - "patientDataChange": Demographic or medical data of the patient was modified.
 * - "assignmentChange": The care team or responsible personnel for the patient has changed.
 * - "resourceRequest": Additional resources or personnel have been requested for the patient.
 */

const attributeTypeMap = {
  status: "statusChange",
  remark: "remark",
  age: "patientDataChange",
  gender: "patientDataChange",
  diagnosis: "patientDataChange",
  location: "patientDataChange",
  discharge: "patientDataChange",
  transport: "patientDataChange",
  assignedTeam: "assignmentChange",
  unassignedTeam: "assignmentChange",
  assignedRTM: "assignmentChange",
  unassignedRTM: "assignmentChange",
  requestRTW: "resourceRequest",
  requestNEF: "resourceRequest",
  requestCarryTeam: "resourceRequest",
  resourceRequest: "resourceRequest",
  rename: "rename",
  // Add more mappings as needed...
};

/**
 * Adds a history event to an entity's record in local storage.
 * @param {Object} entity - The object (patient, trupp, etc.) to which the history event will be added.
 * @param {string} attribute - The attribute that is being changed (e.g., "Status", "Verdachtsdiagnose", "Patientenalter").
 * @param {string} message - The message to be added to the entity's history.
 * @param {any} [oldValue] - The optional old value of the attribute before the change.
 * @returns {void}
 */
function addHistoryEvent(entity, attribute, message, oldValue) {
  if (!entity || !message) return;

  // Preparing the payload
  var payload = {
    field: attribute,
    newValue: message,
  };

  // If it is the type statusChange or patientDataChange there is an oldValue
  // that is the value before the change
  const type = attributeTypeMap[attribute] || "remark";
  if (type === "statusChange" || type === "patientDataChange") {
    payload.oldValue = oldValue !== undefined ? oldValue : entity[attribute];
  }

  // Creating the history entry
  const historyEntry = {
    timestamp: Date.now(),
    type,
    payload,
  };

  // Initialize history if necessary and push the new entry.
  if (!Array.isArray(entity.history)) entity.history = [];
  entity.history.push(historyEntry);
}

/**
 * Returns the event history of an entity (patient, trupp, rtm, etc.) by their ID with the time formatted as HH:MM.
 * @param {Object} entity
 * @returns {array} - An array of history entries with time formatted as HH:MM.
 */
function getEntityHistoryHHMM(entity) {
  const history = entity.history || [];

  return history.map((historyEvent) => {
    const date = new Date(historyEvent.timestamp);
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    let entryText = `[${timeStr}] `;
    switch (historyEvent.type) {
      case "statusChange":
        entryText += `Status geändert auf: ${
          historyEvent?.payload?.newValue ?? "Unbekannt"
        }`;
        break;
      case "patientDataChange":
        if (historyEvent.payload?.oldValue !== undefined) {
          entryText += `${historyEvent.payload.field ?? "Feld"} geändert von ${
            historyEvent.payload.oldValue
          } zu ${historyEvent.payload.newValue}`;
        } else {
          entryText += `${historyEvent.payload.field ?? "Feld"} hinzugefügt: ${
            historyEvent.payload.newValue
          }`;
        }
        break;
      case "assignmentChange":
        let action = "zugewiesen";
        if (historyEvent.payload.field.startsWith("unassigned")) {
          action = "entzogen";
        }
        entryText += `${historyEvent.payload.newValue} ${action}`;
        break;
      case "resourceRequest":
        entryText += `${
          historyEvent.payload?.field ?? "Ressource"
        } angefordert`;
        break;
      default:
        entryText += historyEvent.payload?.newValue ?? "Unbekanntes Ereignis";
        break;
    }
    return entryText;
  });
}

/**
 * Generates HTML for the history modal for an entity.
 * @param {Object} entity - The entity (trupp, rtm, etc.)
 * @param {string} entityType - 'trupp' or 'rtm'
 * @returns {string} - The modal HTML string.
 */
function generateHistoryModalHTML(entity, entityType) {
  const modalId = entityType === "trupp" ? "truppHistorieModal" : "rtmHistorieModal";
  const closeFunction = entityType === "trupp" ? "closeTruppHistorieModal" : "closeRTMHistorieModal";
  const historyEntries = getEntityHistoryHHMM(entity);

  return `
    <div id="${modalId}" class="modal" style="display: flex; z-index: 2000;">
      <div class="modal-content" style="max-width: 700px; max-height: 85vh; overflow-y: auto;">
        <span class="close" onclick="${closeFunction}()">&times;</span>
        <h2>Historie: ${entity.name}</h2>
        
        <div style="margin: 20px 0;">
          <h3>Einsatzorte:</h3>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px; background: #f9f9f9;">
            ${entity.einsatzHistorie && entity.einsatzHistorie.length ?
              entity.einsatzHistorie.map(h => 
                `<div style="margin-bottom: 8px; padding: 6px; border-left: 3px solid #007bff; background: white; border-radius: 3px;">
                  <strong style="font-size: 1em;">${h.ort}</strong>
                  <br>
                  <small style="font-size: 0.9em;">${formatTime(h.von)} - ${formatTime(h.bis)}</small>
                </div>`
              ).join("") : "<em>Keine Einsatzorte erfasst</em>"}
          </div>
          
          <h3 style="margin-top: 20px;">Patientennummern:</h3>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px; background: #f9f9f9;">
            ${entity.patientHistorie && entity.patientHistorie.length ?
              entity.patientHistorie.map(h => 
                `<div style="margin-bottom: 8px; padding: 6px; border-left: 3px solid #28a745; background: white; border-radius: 3px;">
                  <strong style="font-size: 1em;">Patient ${h.nummer}</strong>
                  <br>
                  <small style="font-size: 0.9em;">${formatTime(h.von)} - ${formatTime(h.bis)}</small>
                </div>`
              ).join("") : "<em>Keine Patienten erfasst</em>"}
          </div>
          
          <h3 style="margin-top: 20px;">Status-Historie:</h3>
          <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px; background: #f9f9f9;">
            ${historyEntries.length ?
              historyEntries.map(entry => 
                `<div style="margin-bottom: 6px; padding: 4px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 0.95em; line-height: 1.3; background: white; border-radius: 3px; border-left: 2px solid #6c757d;">
                  ${entry}
                </div>`
              ).join("") : "<em>Keine Status-Änderungen erfasst</em>"}
          </div>
        </div>

        <div style="text-align: right; margin-top: 20px;">
          <button onclick="${closeFunction}()">Schließen</button>
        </div>
      </div>
    </div>
  `;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}