// TODO: maybe add promptAddEntry() & addCustomHistoryEvent() to this file
// maybe also a function to generateHistoryHTML() but not sure
// not sure if this is the right place for it
// but it is not model-view-controller compliant in any way ^^

/**
 * Types of history events for patient tracking:
 * - "statusChange": The patient's status has changed.
 * - "noteAdded": A note or comment has been added to the patient's record.
 * - "patientDataChange": Demographic or medical data of the patient was modified.
 * - "assignmentChange": The care team or responsible personnel for the patient has changed.
 * - "resourceRequest": Additional resources or personnel have been requested for the patient.
 */

const attributeTypeMap = {
  status: "statusChange",
  noteAdded: "noteAdded",
  age: "patientDataChange",
  age: "patientDataChange",
  gender: "patientDataChange",
  diagnosis: "patientDataChange",
  location: "patientDataChange",
  assignedTeam: "assignmentChange",
  unassignedTeam: "assignmentChange",
  assignedRTM: "assignmentChange",
  unassignedRTM: "assignmentChange",
  requestRTW: "resourceRequest",
  requestNEF: "resourceRequest",
  requestCarryTeam: "resourceRequest",
  resourceRequest: "resourceRequest",
  // Add more mappings as needed...
};

/**
 * Adds a history event to an entity's record in local storage.
 * @param {Object} entity - The object (patient, trupp, etc.) to which the history event will be added.
 * @param {string} attribute - The attribute that is being changed (e.g., "Status", "Verdachtsdiagnose", "Patientenalter").
 * @param {string} message - The message to be added to the entity's history.
 * @returns {void}
 */
function addHistoryEvent(entity, attribute, message) {
  if (!entity || !message) return;

  // Preparing the payload
  var payload = {
    field: attribute,
    newValue: message,
  };

  // If it is the type statusChange or patientDataChange there is an oldValue
  // that is the value before the change
  const type = attributeTypeMap[attribute] || "noteAdded";
  if (type === "statusChange" || type === "patientDataChange") {
    payload.oldValue = entity[attribute];
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
 * Returns the event history of a patient by their ID with the time formatted as HH:MM.
 * @param {Object} patient
 * @returns {array} - An array of history entries with time formatted as HH:MM.
 */
function getPatientHistoryHHMM(patient) {
  const history = patient.history || [];

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