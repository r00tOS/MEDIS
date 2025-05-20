// sites/main.js
(function(global){
  // 0) globalen Zähler initialisieren und bei storage-Events synchronisieren
  global.nextPatientNumber = parseInt(localStorage.getItem("nextPatientNumber"), 10) || 1;
  window.addEventListener("storage", (e) => {
    if (e.key === "nextPatientNumber") {
      global.nextPatientNumber = parseInt(e.newValue, 10) || 1;
    }
  });

  // 1) zentrale Patient-Erzeugung
  global.newPatient = function({
    team = [],
    location = "",
    initialStatus = "gemeldet",
  } = {}) {
    // ID ziehen und hochzählen
    const next = global.nextPatientNumber;
    global.nextPatientNumber = next + 1;
    localStorage.setItem("nextPatientNumber", String(next + 1));

    // Patientendaten zusammenbauen
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const patient = {
      id: next,
      createdAt: now,
      status: initialStatus,
      statusTimestamps: {
        gemeldet: now,
        ...(initialStatus !== "gemeldet" ? {[initialStatus]: now} : {})
      },
      durations: {
        einsatzdauer: "",
        dispositionsdauer: "",
        ausrueckdauer: "",
        behandlungsdauer: "",
        verlegedauerUHS: ""
      },
      team: Array.isArray(team) ? team : [team],
      location,
      history: [`${timeStr} Status: gemeldet`],
    };

    // in den Storage schreiben und Event feuern
    const all = JSON.parse(localStorage.getItem("patients") || "[]");
    all.push(patient);
    localStorage.setItem("patients", JSON.stringify(all));
    window.dispatchEvent(new StorageEvent("storage", {
      key:      "patients",
      newValue: JSON.stringify(all)
    }));

    return next;
  };

})(window);
