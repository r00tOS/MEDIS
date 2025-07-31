// sites/main.js

(function (global) {
  // 0) globalen Zähler initialisieren und bei storage-Events synchronisieren
  global.nextPatientNumber =
    parseInt(localStorage.getItem("nextPatientNumber"), 10) || 1;
  window.addEventListener("storage", (e) => {
    if (e.key === "nextPatientNumber") {
      global.nextPatientNumber = parseInt(e.newValue, 10) || 1;
    }
  });

  // 1) zentrale Patient-Erzeugung
  global.newPatient = function ({
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
    const timeStr = new Date(now).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const patient = {
      id: next,
      createdAt: now,
      status: initialStatus,
      statusTimestamps: {
        gemeldet: now,
        ...(initialStatus !== "gemeldet" ? { [initialStatus]: now } : {}),
      },
      team: Array.isArray(team) ? team : [team],
      location,
      history: [`${timeStr} Status: gemeldet`],
    };

    // in den Storage schreiben und Event feuern
    const all = JSON.parse(localStorage.getItem("patients") || "[]");
    all.push(patient);
    localStorage.setItem("patients", JSON.stringify(all));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(all),
      })
    );

    return next;
  };
})(window);

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}


      // Disposition status functions
      function toggleDispositionStatus(patientId, resource) {
        const patients = JSON.parse(localStorage.getItem("patients") || "[]");
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return;

        if (!patient.dispositionStatus) {
          patient.dispositionStatus = {};
        }

        // Toggle between dispatched and required
        if (patient.dispositionStatus[resource] === 'dispatched') {
          delete patient.dispositionStatus[resource];
        } else {
          patient.dispositionStatus[resource] = 'dispatched';
        }

        localStorage.setItem("patients", JSON.stringify(patients));
        window.dispatchEvent(new StorageEvent("storage", {
          key: "patients",
          newValue: JSON.stringify(patients),
        }));

        // Call appropriate render function based on what's available
        if (typeof renderRTMs === 'function') {
          renderRTMs();
        } else if (typeof renderTrupps === 'function') {
          renderTrupps();
        } else if (typeof loadPatients === 'function') {
          loadPatients();
        }
      }

      function toggleDispositionIgnore(event, patientId, resource) {
        event.preventDefault();
        event.stopPropagation();

        const patients = JSON.parse(localStorage.getItem("patients") || "[]");
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return;

        if (!patient.dispositionStatus) {
          patient.dispositionStatus = {};
        }

        const ignoreKey = resource + '_ignored';
        patient.dispositionStatus[ignoreKey] = !patient.dispositionStatus[ignoreKey];

        localStorage.setItem("patients", JSON.stringify(patients));
        window.dispatchEvent(new StorageEvent("storage", {
          key: "patients",
          newValue: JSON.stringify(patients),
        }));

        // Call appropriate render function based on what's available
        if (typeof renderRTMs === 'function') {
          renderRTMs();
        } else if (typeof renderTrupps === 'function') {
          renderTrupps();
        } else if (typeof loadPatients === 'function') {
          loadPatients();
        }
      }