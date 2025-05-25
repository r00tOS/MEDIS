/**
 * Types of history events for patient tracking:
 * - "statusChange": The patient's status has changed (e.g., stable → critical).
 * - "noteAdded": A note or comment has been added to the patient's record.
 * - "patientDataChange": Demographic or medical data of the patient was modified.
 * - "assignmentChange": The care team or responsible personnel for the patient has changed.
 * - "resourceRequest": Additional resources or personnel have been requested for the patient (e.g., specialist, equipment).
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
  // Add more mappings as needed...
};

/**
 * Adds a history event to a patient's record in local storage.
 * @param {Object} patient - The patient object to which the history event will be added.
 * @param {string} attribute - The attribute that is being changed (e.g., "Status", "Verdachtsdiagnose", "Patientenalter").
 * @param {string} message - The message to be added to the patient's history.
 * @returns {void}
 */
function addHistoryEvent(patient, attribute, message) {
  if (!patient || !message) return;

  const type = attributeTypeMap[attribute] || "noteAdded";

  // Preparing the payload
  var payload = {
    field: attribute,
    newValue: message,
  };

  //if it is the type statusChagne or patientDataChange there is an oldValue
  // that is the value before the change
  if (type === "statusChange" || type === "patientDataChange") {
    payload.oldValue = patient[attribute];
  }

  // Creating the history entry
  const historyEntry = {
    timestamp: Date.now(),
    type,
    payload,
  };

  // Initialize history if necessary and push the new entry.
  if (!Array.isArray(patient.history)) patient.history = [];
  patient.history.push(historyEntry);
}

/**
 * Returns the Eventhistory of a patient by their ID with the time formatted as HH:MM.
 * @param {number} patientID
 * @returns {array} - An array of history entries with time formatted as HH:MM.
 */
function getPatientHistoryHHMM(patientID) {}
