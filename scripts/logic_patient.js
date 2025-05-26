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

      // c) Status auf "Einsatz beendet" setzen
      t.status = "Einsatz beendet";

      // d) Eigene Historie ergänzen
      addCustomHistoryEvent(t, "statusChange", "Einsatz beendet");
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

function updatePatientData(id, field, value) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient) return;

  // Hilfs-Objekte sicherstellen
  patient.statusTimestamps = patient.statusTimestamps || {};
  patient.durations = patient.durations || {};

  // 1) Timestamp & Dauer-Kalkulation zentral in recordStatusChange
  function doTimeTracking() {
    recordStatusChange(patient, value);
  }

  // 2) Update von History, Feld, Triggern von recordStatusChange und Speichern
  // TODO: What is this used for? this dosnt push stuff into the history on status changes
  function applyUpdate() {
    addHistoryEvent(patient, field, value);

    // // a) History-Eintrag
    // if (field === "status") {
    //   patient.history.push(`${getCurrentTime()} Status: ${value}`);
    // } else if (field === "diagnosis") {
    //   patient.history.push(
    //     `${getCurrentTime()} Verdachtsdiagnose geändert: ${value}`
    //   );
    // } else if (field === "discharge") {
    //   patient.history.push(`${getCurrentTime()} Entlassen: ${value}`);
    // } else if (field === "transport") {
    //   addHistoryEvent(patient, field, value);
    // } else if (field === "additionalRequest") {
    //   patient.history.push(`${getCurrentTime()} ${value}`);
    // } else if (
    //   !["age", "gender", "location", "team", "rtm", "remarks"].includes(field)
    // ) {
    //   patient.history.push(`${getCurrentTime()} ${field} geändert: ${value}`);
    // }

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

    addHistoryEvent(patient, field, value);
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

function disposeRequest(id, request) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  patient.additionalRequest = request;
  addCustomHistoryEvent(patient, "resourceRequest", request);
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
  if (value !== null && value.trim() !== "") {
    const patients = JSON.parse(localStorage.getItem("patients")) || [];
    const patient = patients.find((p) => p.id === id);
    if (type === "team") {
      if (!Array.isArray(patient.team)) patient.team = [];
      patient.team.push(value);
    } else {
      if (!Array.isArray(patient.rtm)) patient.rtm = [];
      patient.rtm.push(value);
    }
    // Nur wenn vorher noch kein Trupp und kein RTM zugewiesen war:
    if (
      patient.status !== "in Behandlung" &&
      (!Array.isArray(patient.team) || patient.team.length === 0) &&
      (!Array.isArray(patient.rtm) || patient.rtm.length === 0)
    ) {
      patient.status = "disponiert";
      addHistoryEvent(
        patient,
        type === "team" ? "assignedTeam" : "assignedRTM",
        value
      );
    }
    addHistoryEvent(
      patient,
      type === "team" ? "assignedTeam" : "assignedRTM",
      value
    );
    // Und immer Eintrag, dass RTM disponiert wurde:

    localStorage.setItem("patients", JSON.stringify(patients));
    loadPatients();
  }
}

function assignSelectedTrupp(patientId) {
  // Patienten laden und Objekt finden
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;

  // Sicherstellen, dass p.team ein Array ist
  if (!Array.isArray(patient.team)) patient.team = [];

  // ①: Status-Logik & Timestamp setzen, bevor irgendwas anderes passiert
  recordStatusChange(patient, "disponiert");

  // ②: Wenn noch kein Trupp/RTM und Status nicht 'in Behandlung', auf 'disponiert' setzen
  if (
    patient.status !== "in Behandlung" &&
    patient.team.length === 0 &&
    (!Array.isArray(patient.rtm) || patient.rtm.length === 0)
  ) {
    patient.status = "disponiert";
    addHistoryEvent(patient, "status", "disponiert");
  }

  // ③: Tatsächlichen Trupp-Namen aus dem Select ziehen
  const sel = document.getElementById(`teamSelect-${patientId}`);
  const truppName = sel ? sel.value : null;
  if (!truppName) {
    // Nichts ausgewählt → abbrechen
    localStorage.setItem("patients", JSON.stringify(patients));
    return;
  }

  // ④: Trupp zu p.team hinzufügen und Historie eintragen
  patient.team.push(truppName);
  addHistoryEvent(patient, "assignedTeam", truppName);

  // ⑤: Speichern und neu rendern
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients(patientId);

  // ⑥: Trupp-Tracker aktualisieren (Einsatzzeit starten)
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const t = trupps.find((t) => t.name === truppName);
  if (t) {
    const now = Date.now();

    // a) eventuell laufenden Einsatz beenden
    if (t.currentOrt && t.einsatzStartOrt) {
      t.einsatzHistorie = t.einsatzHistorie || [];
      t.einsatzHistorie.push({
        ort: t.currentOrt,
        von: t.einsatzStartOrt,
        bis: now,
      });
    }

    // b) Status auf Patient setzen
    t.status = "Patient";
    t.patientInput = patientId;
    // c) Einsatz-Timer starten
    t.patientStart = now;
    t.currentEinsatzStart = now;
    // d) Pause-Timer zurücksetzen
    t.currentPauseStart = null;

    // e) Speichern & Storage-Event feuern
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
  addHistoryEvent(patient, "unassignedTeam", removed[0]);
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
    t.status = "Einsatz beendet";

    // Eigene Trupp-Historie ergänzen
    addHistoryEvent(t, "status", "Einsatz beendet");

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
    addHistoryEvent(patient, "unassignedRTM", removed[0]);
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
