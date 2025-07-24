/**
 * Wandelt Millisekunden in MM:SS um.
 * @param {number} ms Millisekunden
 * @returns {string} formatierte Zeit MM:SS
 */
function formatMS(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


function clearAssignments(patientId, finalStatus) {
  const now = Date.now();
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;

  patient.status = finalStatus;
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients(patientId); // neu rendern (Team bleibt erhalten)

  // 2) Trupp-Tracker updaten: alle Trupps, die patientInput === patientId haben,
  //    bekommen ihren Einsatz beendet
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  trupps.forEach((t) => {
    if (t.patientInput === patientId) {
      // a) Patienteneinsatz abschließen
      if (t.patientStart) {
        t.patientHistorie = t.patientHistorie || [];
        t.patientHistorie.push({
          nummer: patientId,
          von: t.patientStart,
          bis: now,
        });
      }
      // b) Input­Felder zurücksetzen
      t.patientInput = null;
      t.patientStart = null;

      // c) Status auf 0 setzen
      t.status = 0;

      // d) Eigene Historie ergänzen
      t.history = t.history || [];
      t.history.push({
        when: now,
        event: 0,
      });
    }
  });

  // 3) Speichern & Storage‐Event feuern
  localStorage.setItem("trupps", JSON.stringify(trupps));
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "trupps",
      newValue: JSON.stringify(trupps),
    })
  );
}

function disposeRequest(id, request) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  patient.additionalRequest = request;
  if (!patient.history) patient.history = [];
  patient.history.push(`${getCurrentTime()} ${request}`);
  if (!patient.disposed) patient.disposed = {};
  patient.disposed[request] = false;
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients();
}

function markAsDisposed(id, request) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient.disposed) patient.disposed = {};
  patient.disposed[request] = true;
  // entfernt: kein Eintrag in Historie bei Disponiert
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients();
}

function dischargePatient(id) {
  const location = prompt("Wohin wurde der Patient entlassen?");
  if (!location) return;

  // 1) Discharge-Feld
  updatePatientData(id, "discharge", location);
  // 2) Status auf Entlassen
  updatePatientData(id, "status", "Entlassen");

  // 3) Noch einmal sicherstellen, dass der Trupp beendet wird:
  clearAssignments(id, "Entlassen");
}

// ✈️ Prompt für Transport-Ziel und Statuswechsel
function transportPatient(id) {
  const ziel = prompt("Bitte Zielklinik eingeben:");
  if (!ziel) return;
  // 1) Ziel speichern und in die Historie schreiben
  updatePatientData(id, "transport", ziel);
  // 2) Statuswechsel auslösen
  updatePatientData(id, "status", "Transport in KH");
  // 3) Trupp-Zuordnung beenden
  clearAssignments(id, "Transport in KH");
}

document.addEventListener("DOMContentLoaded", () => {
  // nur binden, wenn das Element wirklich da ist

  // loadPatients nur aufrufen, wenn die Patienten‐Container existieren

  if (document.getElementById("activePatients")) {
    loadPatients();
  }
});

function confirmEdit() {
  // 1) Basis-Daten speichern (Alter, Geschlecht, Standort, Bemerkung)
  const p = JSON.parse(localStorage.getItem("patients")).find(
    (x) => x.id === editPatientId
  );
  if (!p) return alert("Kein Patient geladen");

  // Gender
  const g = document.querySelector('input[name="editGender"]:checked');
  if (g && g.value !== p.gender) {
    updatePatientData(editPatientId, "gender", g.value);
  }
  // Age
  const age = document.getElementById("editAge").value.trim();
  if (age && age !== String(p.age)) {
    updatePatientData(editPatientId, "age", age);
  }
  // Location
  const loc = document.getElementById("editLocation").value.trim();
  if (loc && loc !== p.location) {
    updatePatientData(editPatientId, "location", loc);
  }
  // Remarks
  const rem = document.getElementById("editRemarks").value.trim();
  if (rem && rem !== p.remarks) {
    updatePatientData(editPatientId, "remarks", rem);
  }

  // 2) Stichwort-Diagnose übernehmen (angepasst von confirmKeyword)
  if (selectedCategory !== null && selectedKeyword !== null) {
    const cfg = alarmConfig[selectedCategory].keywords[selectedKeyword];
    let finalWord = cfg.word;

    // falls „sonstiger …“ sichtbar, hänge Zusatztext an
    if (document.getElementById("otherDetail").style.display === "block") {
      const extra = document.getElementById("otherInput").value.trim();
      if (!extra) {
        return alert("Bitte die Art des Notfalls genauer beschreiben.");
      }
      finalWord += " – " + extra;
    }

    // 2a) Diagnose setzen (inkl. Historie)
    updatePatientData(editPatientId, "diagnosis", finalWord);

    // 2b) vorgeschlagene Ressourcen ergänzen
    const arr = JSON.parse(localStorage.getItem("patients")) || [];
    const toUpdate = arr.find((x) => x.id === editPatientId);
    if (toUpdate) {
      toUpdate.suggestedResources = cfg.resources;
      localStorage.setItem("patients", JSON.stringify(arr));
      // Storage-Event, damit alle UIs neu rendern
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "patients",
          newValue: JSON.stringify(arr),
        })
      );
    }
  }

  // 3) Modal schließen & neu rendern
closeEditModal();
loadPatients(editPatientId);

// Trupp-Cards neu laden:
window.dispatchEvent(new StorageEvent('storage', {
  key: 'trupps',
  newValue: localStorage.getItem('trupps')
}));
  // 4) Immer die “Patientendaten geändert: …”-Zeile in die Historie schreiben
  //     – unabhängig davon, welche Felder wirklich verändert wurden.
  addCombinedHistoryEntry(editPatientId);
}

/**
 * Baut die Text‐Zeile „Patientendaten geändert: Verdachtsdiagnose=…, Alter=…, Geschlecht=…, Standort=…, Bemerkung=…“
 * und hängt sie an patient.history an. Persistiert in localStorage.
 */
function addCombinedHistoryEntry(patientId) {
  const stored = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = stored.find((p) => p.id === patientId);
  if (!patient) return;

  // Stelle sicher, dass history‐Array existiert
  if (!patient.history) patient.history = [];

  // Hole aktuellen Zeitstempel (so wie getCurrentTime() ihn formatiert)
  const nowFormatted = getCurrentTime(); // Voraussetzung: getCurrentTime() existiert

  // Baue den kombinierten Eintrag
  const line =
    `${nowFormatted} Patientendaten geändert: ` +
    `Verdachtsdiagnose=${patient.diagnosis || "–"}, ` +
    `Alter=${patient.age || "–"}, ` +
    `Geschlecht=${patient.gender || "–"}, ` +
    `Standort=${patient.location || "–"}, ` +
    `Bemerkung=${patient.remarks || "–"}`;

  // Hänge in history an
  patient.history.push(line);

  // Speichere zurück
  localStorage.setItem("patients", JSON.stringify(stored));

  // Damit alle UIs (z. B. loadPatients‐Listener) reagieren, feuern wir ein Storage‐Event:
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "patients",
      newValue: JSON.stringify(stored),
    })
  );
}



// 1) Zentrale Update-Funktion
function updatePatientData(id, field, value) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient) return;
  // History-Array initialisieren, falls nötig
  if (!patient.history) patient.history = [];

  // Hilfs-Objekte sicherstellen
  patient.statusTimestamps = patient.statusTimestamps || {};
  patient.durations = patient.durations || {};

  // 1) Timestamp & Dauer-Kalkulation zentral in recordStatusChange
  function doTimeTracking() {
    recordStatusChange(patient, value);
  }

  // 2) Update von History, Feld, Triggern von recordStatusChange und Speichern
  function applyUpdate() {
    // a) History-Eintrag
    if (field === "status") {
      patient.history.push(`${getCurrentTime()} Status: ${value}`);
    } else if (field === "discharge") {
      patient.history.push(`${getCurrentTime()} Entlassen: ${value}`);
    } else if (field === "transport") {
      patient.history.push(`${getCurrentTime()} Transport in KH: ${value}`);
    } else if (field === "additionalRequest") {
      patient.history.push(`${getCurrentTime()} ${value}`);
    } 

    // b) Feld setzen
    patient[field] = value;

    // c) Timestamp & Dauer-Berechnungen
    doTimeTracking();

    // d) persistieren
    localStorage.setItem("patients", JSON.stringify(patients));
  }

  // 3) Sonderfall Status → Animation + Delayed Update
  if (field === "status") {
    // a) History-Eintrag & Status setzen
    patient.history.push(`${getCurrentTime()} Status: ${value}`);
    patient.status = value;

    // b) Timestamp‐ und Dauer‐Berechnung
    recordStatusChange(patient, value);

    // c) Persist
    localStorage.setItem("patients", JSON.stringify(patients));

    // d) Animation & Trupp‐Aufräum‐Logik
    const oldCard = document.querySelector(`.patient-card[data-id='${id}']`);
    const finish = () => {
      if (value === "Entlassen" || value === "Transport in KH") {
        clearAssignments(id);
      }
      loadPatients(id);
      updateLiveTimers(); // einmal direkt nachladen
    };

    if (oldCard) {
      oldCard.classList.add("slide-out");
      oldCard.addEventListener("animationend", finish, { once: true });
    } else {
      finish();
    }
    return;
  }

  // 4) Alle anderen Felder → direkt updaten
  applyUpdate();
  loadPatients();
}

function recordStatusChange(patient, newStatus) {
  const now = Date.now();

  patient.statusTimestamps = patient.statusTimestamps || {};

  patient.durations = patient.durations || {};

  // 1) Timestamp für den neuen Status nur einmal setzen

  if (!patient.statusTimestamps[newStatus]) {
    patient.statusTimestamps[newStatus] = now;
  }

  // 2) Einsatzdauer → erst beim finalen Status

  if (
    (newStatus === "Entlassen" || newStatus === "Transport in KH") &&
    !patient.durations.einsatzdauer
  ) {
    patient.durations.einsatzdauer = formatMS(now - patient.createdAt);
  }

  // 3) Dispositionsdauer: gemeldet → disponiert

  if (
    newStatus === "disponiert" &&
    patient.statusTimestamps.gemeldet &&
    !patient.durations.dispositionsdauer
  ) {
    patient.durations.dispositionsdauer = formatMS(
      now - patient.statusTimestamps.gemeldet
    );
  }

  // 4) Ausrückdauer: disponiert → in Behandlung/UHS

  if (
    ["in Behandlung", "verlegt in UHS", "Behandlung in UHS"].includes(
      newStatus
    ) &&
    patient.statusTimestamps.disponiert &&
    !patient.durations.ausrueckdauer
  ) {
    patient.durations.ausrueckdauer = formatMS(
      now - patient.statusTimestamps.disponiert
    );
  }

  // 5) Verlegedauer UHS: verlegt in UHS → Behandlung in UHS

  if (
    newStatus === "Behandlung in UHS" &&
    patient.statusTimestamps["verlegt in UHS"] &&
    !patient.durations.verlegedauerUHS
  ) {
    patient.durations.verlegedauerUHS = formatMS(
      now - patient.statusTimestamps["verlegt in UHS"]
    );
  }

  // 6) **Behandlungsdauer**: wenn wir ins Finale wechseln

  if (
    (newStatus === "Entlassen" || newStatus === "Transport in KH") &&
    !patient.durations.behandlungsdauer
  ) {
    // 6a) nimm den Start-Timestamp „in Behandlung“ oder „Behandlung in UHS“

    const start =
      patient.statusTimestamps["in Behandlung"] ||
      patient.statusTimestamps["Behandlung in UHS"];

    if (start) {
      patient.durations.behandlungsdauer = formatMS(now - start);
    } else {
      // falls nie richtig in Behandlung

      patient.durations.behandlungsdauer = "00:00";
    }
  }

  // 7) alle übrigen Dauern beim finalen Status nachtragen

  if (newStatus === "Entlassen" || newStatus === "Transport in KH") {
    // Dispositionsdauer, falls nie auf disponiert gewechselt

    if (
      patient.statusTimestamps.gemeldet &&
      !patient.durations.dispositionsdauer
    ) {
      patient.durations.dispositionsdauer = formatMS(
        now - patient.statusTimestamps.gemeldet
      );
    }

    // Ausrückdauer, falls nie auf disponiert→in Behandlung gewechselt

    if (
      patient.statusTimestamps.disponiert &&
      !patient.durations.ausrueckdauer
    ) {
      patient.durations.ausrueckdauer = formatMS(
        now - patient.statusTimestamps.disponiert
      );
    }

    // Verlegedauer UHS, falls nie auf verlegt→UHS gewechselt

    if (
      patient.statusTimestamps["verlegt in UHS"] &&
      !patient.durations.verlegedauerUHS
    ) {
      patient.durations.verlegedauerUHS = formatMS(
        now - patient.statusTimestamps["verlegt in UHS"]
      );
    }
  }
}

function assignResource(id, type) {
  const label = type === "team" ? "Trupp" : "RTM";
  const value = prompt(`${label} disponieren:`);
  if (!value || !value.trim()) return;

  // 1) Patienten laden und finden
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient  = patients.find((p) => p.id === id);
  if (!patient) return;

  // 2) Array sicherstellen und Ressource hinzufügen
  if (type === "team") {
    if (!Array.isArray(patient.team)) patient.team = [];
    patient.team.push(value.trim());
  } else {
    if (!Array.isArray(patient.rtm)) patient.rtm = [];
    patient.rtm.push(value.trim());
  }

  // 3) Sofort speichern
  localStorage.setItem("patients", JSON.stringify(patients));

  // 4) Nur wenn vorher gemeldet → Status auf „disponiert“ setzen
  if (patient.status === "gemeldet") {
    updatePatientData(id, "status", "disponiert");
  }

  // 5) Historieneintrag für die Ressource
  const updated = JSON.parse(localStorage.getItem("patients")) || [];
  const p2 = updated.find((p) => p.id === id);
  if (p2) {
    p2.history = p2.history || [];
    p2.history.push(`${getCurrentTime()} ${label} ${value.trim()} disponiert`);
    localStorage.setItem("patients", JSON.stringify(updated));
    loadPatients(id);
  }
}

function assignSelectedTrupp(patientId) {
  // 1) Patienten laden und finden
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient  = patients.find((p) => p.id === patientId);
  if (!patient) return;

  // 2) Team-Array sicherstellen
  if (!Array.isArray(patient.team)) patient.team = [];

  // 3) Gewählten Trupp aus dem <select> holen
  const sel       = document.getElementById(`teamSelect-${patientId}`);
  const truppName = sel ? sel.value : null;
  if (!truppName) {
    // nichts ausgewählt → nur speichern, zurück
    localStorage.setItem("patients", JSON.stringify(patients));
    return;
  }

  // 4) Trupp dem Team hinzufügen
  patient.team.push(truppName);
  // 5) Änderungen sofort persistieren
  localStorage.setItem("patients", JSON.stringify(patients));

  // 6) Nur wenn vorher gemeldet → Status auf „disponiert“ setzen
  if (patient.status === "gemeldet") {
    updatePatientData(patientId, "status", "disponiert");
  }

  // 7) Historieneintrag für den Trupp
  const updated = JSON.parse(localStorage.getItem("patients")) || [];
  const p2 = updated.find((p) => p.id === patientId);
  if (p2) {
    p2.history = p2.history || [];
    p2.history.push(`${getCurrentTime()} Trupp ${truppName} disponiert`);
    localStorage.setItem("patients", JSON.stringify(updated));
    loadPatients(patientId);
  }

  // 8) Und zum Schluss Trupp-Tracker starten, wie gehabt:
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const t = trupps.find((t) => t.name === truppName);
  if (t) {
    const now = Date.now();
    if (t.currentOrt && t.einsatzStartOrt) {
      t.einsatzHistorie = t.einsatzHistorie || [];
      t.einsatzHistorie.push({
        ort: t.currentOrt,
        von: t.einsatzStartOrt,
        bis: now,
      });
    }
    t.status              = 3;
    t.patientInput        = patientId;
    t.patientStart        = now;
    t.currentEinsatzStart = now;
    t.currentPauseStart   = null;
    localStorage.setItem("trupps", JSON.stringify(trupps));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "trupps",
        newValue: JSON.stringify(trupps),
      })
    );
  }
}


function removeTrupp(id, index) {
  if (!confirm("Soll dieser Trupp wirklich entfernt werden?")) return;

  // 1) Patienten-Seite updaten
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  const removed = Array.isArray(patient.team)
    ? patient.team.splice(index, 1)
    : [];
  patient.history = patient.history || [];
  patient.history.push(`${getCurrentTime()} Trupp ${removed[0]} entfernt`);
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients();

  // 2) Trupp-Tracker updaten
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const t = trupps.find((t) => t.name === removed[0]);
  if (t) {
    const now = Date.now();

    // 📝 Falls gerade ein Patient zugewiesen, Patienteneinsatz abschließen
    if (t.patientInput && t.patientStart) {
      t.patientHistorie = t.patientHistorie || [];
      t.patientHistorie.push({
        nummer: t.patientInput,
        von: t.patientStart,
        bis: now,
      });
      // Reset der Patientendaten
      t.patientInput = "";
      t.patientStart = null;
    }

    // Statuswechsel, aber Einsatzzeit weiterlaufen lassen
    t.status = 0;

    // Eigene Trupp-Historie ergänzen
    t.history = t.history || [];
    t.history.push({
      when: now,
      event: 0,
    });

    // Speichern und Renderer anstoßen
    localStorage.setItem("trupps", JSON.stringify(trupps));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "trupps",
        newValue: JSON.stringify(trupps),
      })
    );
  }
}

function removeRtm(id, index) {
  if (!confirm("Soll dieses RTM wirklich entfernt werden?")) return;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (Array.isArray(patient.rtm)) {
    const removed = patient.rtm.splice(index, 1);
    if (!patient.history) patient.history = [];
    patient.history.push(`${getCurrentTime()} RTM ${removed[0]} entfernt`);
    localStorage.setItem("patients", JSON.stringify(patients));
    loadPatients();
  }
}

function editField(id, field) {
  if (field === "diagnosis") {
    // Modal für Stichwörter öffnen
    openKeywordModal(id);
    return;
  }
  // für alle anderen Felder weiter wie gehabt:
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  const current = patient[field] || "";
  const labelMap = {
    age: "Alter",
    diagnosis: "Verdachtsdiagnose",
    location: "Standort",
    remarks: "Bemerkungen",
  };
  const value = prompt(
    `Neuen Wert für ${labelMap[field] || field} eingeben:`,
    current
  );
  if (value !== null) {
    updatePatientData(id, field, value);
  }
}

function addCustomHistory(id, message) {
  if (!message.trim()) return;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient.history) patient.history = [];
  patient.history.push(`${getCurrentTime()} ${message}`);
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients();
}

// Globale Variable, die immer aktuell ist
window.nextPatientNumber =
  parseInt(localStorage.getItem("nextPatientNumber"), 10) || 1;

// 1) Polling
function syncNextPatientNumber() {
  window.nextPatientNumber =
    parseInt(localStorage.getItem("nextPatientNumber"), 10) || 1;
}
setInterval(syncNextPatientNumber, 2000);

// 2) storage-Event
window.addEventListener("storage", (e) => {
  if (e.key === "nextPatientNumber") syncNextPatientNumber();
});

window.addEventListener("storage", (e) => {
  if (e.key === "patients") {
    loadPatients();
  }
});

/**
 * Sammelt alle relevanten Felddaten des Patienten, formatiert sie
 * und kopiert den resultierenden Text in die Zwischenablage.
 */
function copyPatientData(id) {
  // Patientendaten laden
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient) return;

  // Felder extrahieren
  const trupp = Array.isArray(patient.team) ? patient.team.join(", ") : "–";
  const rtm = Array.isArray(patient.rtm) ? patient.rtm.join(", ") : "–";
  const nachf =
    (patient.history || []).filter((e) => /nachgefordert/.test(e)).join("\n") ||
    "–";
  const remarks = patient.remarks || "–";
  const historyText = (patient.history || []).join("\n") || "–";

  // Textblock zusammenbauen
  const text = `Patient Nr.: ${patient.id}
Trupp: ${trupp}
RTM: ${rtm}
Standort: ${patient.location || "–"}
Alter: ${patient.age || "–"}
Geschlecht: ${patient.gender || "–"}
Verdachtsdiagnose: ${patient.diagnosis || "–"}
Nachforderungen:
${nachf}
Bemerkung: ${remarks}

Patienten-Historie:
${historyText}`;

  copyToClipboard(text);
}

/**
 * Kopiert reinen Text in die Zwischenablage, mit Fallback.
 */
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Clipboard write failed, fallback:", err);
      fallbackCopyTextToClipboard(text);
    });
  } else {
    fallbackCopyTextToClipboard(text);
  }
}

function fallbackCopyTextToClipboard(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed"; // verhindert Scroll-Jump
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    alert("Patientendaten kopiert 🎉");
  } catch (err) {
    console.error("Fallback: Copy failed", err);
  }
  document.body.removeChild(ta);
}

function deletePatient(id) {
  if (!confirm("Soll Patient " + id + " wirklich gelöscht werden?")) return;
  // aus localStorage holen
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  // Patient finden und entfernen
  const idx = patients.findIndex((p) => p.id === id);
  if (idx > -1) {
    patients.splice(idx, 1);
    localStorage.setItem("patients", JSON.stringify(patients));
    // neu rendern
    loadPatients();
  }
}

function updateLiveTimers() {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const now = Date.now();
  let dirty = false;

  patients.forEach((p) => {
    const isFinal = p.status === "Entlassen" || p.status === "Transport in KH";
    if (isFinal) return;
    const t = p.statusTimestamps || {};
    const d = (p.durations ||= {});
    const id = p.id;

    // 1) Einsatzdauer → läuft bis final
    if (!isFinal) {
      const val = formatMS(now - p.createdAt);
      const el = document.querySelector(`.timer.einsatzdauer[data-id='${id}']`);
      if (el) el.textContent = val;
      if (d.einsatzdauer !== val) {
        d.einsatzdauer = val;
        dirty = true;
      }
    }

    // 2) Dispositionsdauer → nur bis dispo gesetzt
    if (t.gemeldet && !t.disponiert) {
      const val = formatMS(now - t.gemeldet);
      const el = document.querySelector(
        `.timer.dispositionsdauer[data-id='${id}']`
      );
      if (el) el.textContent = val;
      if (d.dispositionsdauer !== val) {
        d.dispositionsdauer = val;
        dirty = true;
      }
    }

    // 3) Ausrückdauer → nur zwischen dispo und Behandlungs-/UHS-Start
    if (
      t.disponiert &&
      !t["in Behandlung"] &&
      !t["verlegt in UHS"] &&
      !t["Behandlung in UHS"]
    ) {
      const val = formatMS(now - t.disponiert);
      const el = document.querySelector(
        `.timer.ausrueckdauer[data-id='${id}']`
      );
      if (el) el.textContent = val;
      if (d.ausrueckdauer !== val) {
        d.ausrueckdauer = val;
        dirty = true;
      }
    }

    // 4) Verlegedauer UHS → von verlegt → Behandlung in UHS
    if (t["verlegt in UHS"] && !t["Behandlung in UHS"]) {
      const val = formatMS(now - t["verlegt in UHS"]);
      const el = document.querySelector(
        `.timer.verlegedauerUHS[data-id='${id}']`
      );
      if (el) el.textContent = val;
      if (d.verlegedauerUHS !== val) {
        d.verlegedauerUHS = val;
        dirty = true;
      }
    }

    // 5) Behandlungsdauer → läuft während in Behandlung oder UHS-Behandlung
    const behandlungsStart = t["in Behandlung"] ?? t["Behandlung in UHS"];
    if (behandlungsStart && !isFinal) {
      const val = formatMS(now - behandlungsStart);
      const el = document.querySelector(
        `.timer.behandlungsdauer[data-id='${id}']`
      );
      if (el) el.textContent = val;
      if (d.behandlungsdauer !== val) {
        d.behandlungsdauer = val;
        dirty = true;
      }
    }
  });
}