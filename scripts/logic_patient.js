function clearAssignments(patientId, finalStatus) {
  const now = Date.now();
  
  console.log(`=== CLEAR ASSIGNMENTS START ===`);
  console.log(`Patient ID: ${patientId}, Final Status: ${finalStatus}`);
  
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    console.log(`ERROR: Patient ${patientId} not found!`);
    return;
  }

  console.log(`Patient before update:`, JSON.stringify(patient, null, 2));

  // WICHTIG: Bei finalen Status IMMER überschreiben
  if (finalStatus === "Entlassen" || finalStatus === "Transport in KH") {
    console.log(`Setting patient status to final: ${finalStatus}`);
    patient.status = finalStatus;
    // Sicherstellen dass der finale Status auch in der Historie steht (falls nicht schon da)
    if (!patient.history.some(h => h.includes(`Status: ${finalStatus}`))) {
      patient.history.push(`${getCurrentTime()} Status: ${finalStatus}`);
      console.log(`Added status history entry: Status: ${finalStatus}`);
    }
  }

  // 2) Trupp-Tracker updaten - BEIDE Wege: über patientInput UND über patient.team Namen
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  console.log(`Found ${trupps.length} trupps in storage`);
  
  let truppUpdates = 0;
  
  // 2a) Trupps über patientInput finden
  trupps.forEach((t) => {
    if (t.patientInput === patientId || t.patientInput === String(patientId)) {
      console.log(`Clearing trupp ${t.name} via patientInput for patient ${patientId}`);
      truppUpdates++;
      
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
  
  // 2b) ZUSÄTZLICH: Trupps auch über patient.team Namen-Liste finden
  if (Array.isArray(patient.team) && patient.team.length > 0) {
    console.log(`Patient has ${patient.team.length} teams in team array:`, patient.team);
    
    patient.team.forEach(teamName => {
      const trupp = trupps.find(t => t.name === teamName);
      if (trupp) {
        console.log(`Found Trupp ${teamName} in storage with status ${trupp.status}`);
        
        // Trupp auf Status 0 setzen, UNABHÄNGIG vom aktuellen Status
        if (trupp.status !== 0) {
          console.log(`Clearing Trupp ${teamName} via patient.team list for patient ${patientId}`);
          truppUpdates++;
          
          // a) Patienteneinsatz abschließen (falls nicht schon gemacht)
          if (trupp.patientStart && trupp.patientInput) {
            trupp.patientHistorie = trupp.patientHistorie || [];
            trupp.patientHistorie.push({
              nummer: patientId,
              von: trupp.patientStart,
              bis: now,
            });
          }
          // b) Input­Felder zurücksetzen
          trupp.patientInput = null;
          trupp.patientStart = null;

          // c) Status auf 0 setzen
          trupp.status = 0;

          // d) Eigene Historie ergänzen
          trupp.history = trupp.history || [];
          trupp.history.push({
            when: now,
            event: 0,
          });
        }
      } else {
        console.log(`Trupp ${teamName} NOT FOUND in storage!`);
      }
    });
  }
  console.log(`Updated ${truppUpdates} trupps`);

  // 3) RTM-Tracker updaten - ALLE RTMs durchgehen
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  console.log(`Found ${rtms.length} RTMs in storage`);
  
  let rtmUpdates = 0;
  
  // 3a) RTMs über patientInput finden
  rtms.forEach((r) => {
    if (r.patientInput === patientId || r.patientInput === String(patientId)) {
      console.log(`Clearing RTM ${r.name} via patientInput for patient ${patientId}`);
      rtmUpdates++;
      
      // a) Patienteneinsatz abschließen
      if (r.patientStart) {
        r.patientHistorie = r.patientHistorie || [];
        r.patientHistorie.push({
          nummer: patientId,
          von: r.patientStart,
          bis: now,
        });
      }
      // b) Input­Felder zurücksetzen
      r.patientInput = null;
      r.patientStart = null;

      // c) Status auf 0 setzen
      r.status = 0;

      // d) Eigene Historie ergänzen
      r.history = r.history || [];
      r.history.push({
        when: now,
        event: 0,
      });
    }
  });
  
  // 3b) ZUSÄTZLICH: RTMs auch über patient.rtm Namen-Liste finden
  if (Array.isArray(patient.rtm) && patient.rtm.length > 0) {
    console.log(`Patient has ${patient.rtm.length} RTMs in rtm array:`, patient.rtm);
    
    patient.rtm.forEach(rtmName => {
      const rtm = rtms.find(r => r.name === rtmName);
      if (rtm) {
        console.log(`Found RTM ${rtmName} in storage with status ${rtm.status}`);
        
        // RTM auf Status 0 setzen, UNABHÄNGIG vom aktuellen Status
        if (rtm.status !== 0) {
          console.log(`Clearing RTM ${rtmName} via patient.rtm list for patient ${patientId}`);
          rtmUpdates++;
          
          // a) Patienteneinsatz abschließen (falls nicht schon gemacht)
          if (rtm.patientStart && rtm.patientInput) {
            rtm.patientHistorie = rtm.patientHistorie || [];
            rtm.patientHistorie.push({
              nummer: patientId,
              von: rtm.patientStart,
              bis: now,
            });
          }
          // b) Input­Felder zurücksetzen
          rtm.patientInput = null;
          rtm.patientStart = null;

          // c) Status auf 0 setzen
          rtm.status = 0;

          // d) Eigene Historie ergänzen
          rtm.history = rtm.history || [];
          rtm.history.push({
            when: now,
            event: 0,
          });
        }
      } else {
        console.log(`RTM ${rtmName} NOT FOUND in storage!`);
      }
    });
  }
  console.log(`Updated ${rtmUpdates} RTMs total`);

  // 4) Bei finalen Status: RTMs und Teams IMMER aus patient Arrays entfernen
  if (finalStatus === "Entlassen" || finalStatus === "Transport in KH") {
    console.log(`Removing all RTMs and teams from patient ${patientId} due to final status`);
    
    if (Array.isArray(patient.rtm) && patient.rtm.length > 0) {
      const rtmCount = patient.rtm.length;
      patient.rtm.forEach(rtmName => {
        patient.history = patient.history || [];
        patient.history.push(`${getCurrentTime()} RTM ${rtmName} entfernt`);
      });
      patient.rtm = []; // Alle RTMs entfernen
      console.log(`Removed ${rtmCount} RTMs from patient`);
    }
    
    if (Array.isArray(patient.team) && patient.team.length > 0) {
      const teamCount = patient.team.length;
      patient.team.forEach(teamName => {
        patient.history = patient.history || [];
        patient.history.push(`${getCurrentTime()} Trupp ${teamName} entfernt`);
      });
      patient.team = []; // Alle Teams entfernen
      console.log(`Removed ${teamCount} teams from patient`);
    }
  }

  console.log(`Patient after update:`, JSON.stringify(patient, null, 2));

  // 5) Alles speichern
  localStorage.setItem("patients", JSON.stringify(patients));
  localStorage.setItem("trupps", JSON.stringify(trupps));
  localStorage.setItem("rtms", JSON.stringify(rtms));
  
  console.log(`Saved data to localStorage`);
  
  // 6) Storage‐Events feuern
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "patients",
      newValue: JSON.stringify(patients),
    })
  );
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "trupps",
      newValue: JSON.stringify(trupps),
    })
  );
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "rtms",
      newValue: JSON.stringify(rtms),
    })
  );

  console.log(`Dispatched storage events`);

  // 7) UI neu laden
  if (typeof loadPatients === 'function') {
    loadPatients(patientId);
    console.log(`Called loadPatients(${patientId})`);
  }
  
  console.log(`=== CLEAR ASSIGNMENTS END ===`);
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

  // STEP 1: Patient-Daten DIREKT modifizieren
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient) return;
  
  // Discharge und Status SOFORT setzen
  patient.discharge = location;
  patient.status = "Entlassen";
  if (!patient.history) patient.history = [];
  patient.history.push(`${getCurrentTime()} Entlassen: ${location}`);
  patient.history.push(`${getCurrentTime()} Status: Entlassen`);
  
  // STEP 2: ALLE Trupps die zu diesem Patienten gehören auf Status 0 setzen
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const now = Date.now();
  
  // A) Trupps über patientInput finden
  trupps.forEach(trupp => {
    if (trupp.patientInput === id || trupp.patientInput === String(id)) {
      if (trupp.patientStart) {
        trupp.patientHistorie = trupp.patientHistorie || [];
        trupp.patientHistorie.push({
          nummer: id,
          von: trupp.patientStart,
          bis: now
        });
      }
      trupp.patientInput = null;
      trupp.patientStart = null;
      trupp.status = 0;
      trupp.history = trupp.history || [];
      trupp.history.push({ when: now, event: 0 });
    }
  });
  
  // B) Trupps über patient.team Array finden
  if (Array.isArray(patient.team)) {
    patient.team.forEach(teamName => {
      const trupp = trupps.find(t => t.name === teamName);
      if (trupp && [3, 4, 7, 8].includes(trupp.status)) {
        if (trupp.patientStart) {
          trupp.patientHistorie = trupp.patientHistorie || [];
          trupp.patientHistorie.push({
            nummer: id,
            von: trupp.patientStart,
            bis: now
          });
        }
        trupp.patientInput = null;
        trupp.patientStart = null;
        trupp.status = 0;
        trupp.history = trupp.history || [];
        trupp.history.push({ when: now, event: 0 });
      }
    });
  }
  
  // STEP 3: ALLE RTMs die zu diesem Patienten gehören auf Status 0 setzen
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  
  // A) RTMs über patientInput finden
  rtms.forEach(rtm => {
    if (rtm.patientInput === id || rtm.patientInput === String(id)) {
      if (rtm.patientStart) {
        rtm.patientHistorie = rtm.patientHistorie || [];
        rtm.patientHistorie.push({
          nummer: id,
          von: rtm.patientStart,
          bis: now
        });
      }
      rtm.patientInput = null;
      rtm.patientStart = null;
      rtm.status = 0;
      rtm.history = rtm.history || [];
      rtm.history.push({ when: now, event: 0 });
    }
  });
  
  // B) RTMs über patient.rtm Array finden
  if (Array.isArray(patient.rtm)) {
    patient.rtm.forEach(rtmName => {
      const rtm = rtms.find(r => r.name === rtmName);
      if (rtm && [3, 4, 7, 8].includes(rtm.status)) {
        if (rtm.patientStart) {
          rtm.patientHistorie = rtm.patientHistorie || [];
          rtm.patientHistorie.push({
            nummer: id,
            von: rtm.patientStart,
            bis: now
          });
        }
        rtm.patientInput = null;
        rtm.patientStart = null;
        rtm.status = 0;
        rtm.history = rtm.history || [];
        rtm.history.push({ when: now, event: 0 });
      }
    });
  }
  
  // STEP 4: Teams und RTMs aus Patient-Arrays entfernen
  if (Array.isArray(patient.team)) {
    patient.team.forEach(teamName => {
      patient.history.push(`${getCurrentTime()} Trupp ${teamName} entfernt`);
    });
    patient.team = [];
  }
  
  if (Array.isArray(patient.rtm)) {
    patient.rtm.forEach(rtmName => {
      patient.history.push(`${getCurrentTime()} RTM ${rtmName} entfernt`);
    });
    patient.rtm = [];
  }
  
  // STEP 5: ALLES SPEICHERN
  localStorage.setItem("patients", JSON.stringify(patients));
  localStorage.setItem("trupps", JSON.stringify(trupps));
  localStorage.setItem("rtms", JSON.stringify(rtms));
  
  // STEP 6: Events auslösen
  window.dispatchEvent(new StorageEvent("storage", {
    key: "patients",
    newValue: JSON.stringify(patients)
  }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: "trupps", 
    newValue: JSON.stringify(trupps)
  }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: "rtms",
    newValue: JSON.stringify(rtms)
  }));
  
  // STEP 7: UI neu laden
  if (typeof loadPatients === 'function') {
    loadPatients(id);
  }
}

// ✈️ Prompt für Transport-Ziel und Statuswechsel - KOMPLETT NEU
function transportPatient(id) {
  const ziel = prompt("Bitte Zielklinik eingeben:");
  if (!ziel) return;
  
  // STEP 1: Patient-Daten DIREKT modifizieren
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient) return;
  
  // Transport und Status SOFORT setzen
  patient.transport = ziel;
  patient.status = "Transport in KH";
  if (!patient.history) patient.history = [];
  patient.history.push(`${getCurrentTime()} Transport in KH: ${ziel}`);
  patient.history.push(`${getCurrentTime()} Status: Transport in KH`);
  
  // STEP 2: ALLE Trupps die zu diesem Patienten gehören auf Status 0 setzen
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const now = Date.now();
  
  // A) Trupps über patientInput finden
  trupps.forEach(trupp => {
    if (trupp.patientInput === id || trupp.patientInput === String(id)) {
      if (trupp.patientStart) {
        trupp.patientHistorie = trupp.patientHistorie || [];
        trupp.patientHistorie.push({
          nummer: id,
          von: trupp.patientStart,
          bis: now
        });
      }
      trupp.patientInput = null;
      trupp.patientStart = null;
      trupp.status = 0;
      trupp.history = trupp.history || [];
      trupp.history.push({ when: now, event: 0 });
    }
  });
  
  // B) Trupps über patient.team Array finden
  if (Array.isArray(patient.team)) {
    patient.team.forEach(teamName => {
      const trupp = trupps.find(t => t.name === teamName);
      if (trupp && [3, 4, 7, 8].includes(trupp.status)) {
        if (trupp.patientStart) {
          trupp.patientHistorie = trupp.patientHistorie || [];
          trupp.patientHistorie.push({
            nummer: id,
            von: trupp.patientStart,
            bis: now
          });
        }
        trupp.patientInput = null;
        trupp.patientStart = null;
        trupp.status = 0;
        trupp.history = trupp.history || [];
        trupp.history.push({ when: now, event: 0 });
      }
    });
  }
  
  // STEP 3: ALLE RTMs die zu diesem Patienten gehören auf Status 0 setzen
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  
  // A) RTMs über patientInput finden
  rtms.forEach(rtm => {
    if (rtm.patientInput === id || rtm.patientInput === String(id)) {
      if (rtm.patientStart) {
        rtm.patientHistorie = rtm.patientHistorie || [];
        rtm.patientHistorie.push({
          nummer: id,
          von: rtm.patientStart,
          bis: now
        });
      }
      rtm.patientInput = null;
      rtm.patientStart = null;
      rtm.status = 0;
      rtm.history = rtm.history || [];
      rtm.history.push({ when: now, event: 0 });
    }
  });
  
  // B) RTMs über patient.rtm Array finden
  if (Array.isArray(patient.rtm)) {
    patient.rtm.forEach(rtmName => {
      const rtm = rtms.find(r => r.name === rtmName);
      if (rtm && [3, 4, 7, 8].includes(rtm.status)) {
        if (rtm.patientStart) {
          rtm.patientHistorie = rtm.patientHistorie || [];
          rtm.patientHistorie.push({
            nummer: id,
            von: rtm.patientStart,
            bis: now
          });
        }
        rtm.patientInput = null;
        rtm.patientStart = null;
        rtm.status = 0;
        rtm.history = rtm.history || [];
        rtm.history.push({ when: now, event: 0 });
      }
    });
  }
  
  // STEP 4: Teams und RTMs aus Patient-Arrays entfernen
  if (Array.isArray(patient.team)) {
    patient.team.forEach(teamName => {
      patient.history.push(`${getCurrentTime()} Trupp ${teamName} entfernt`);
    });
    patient.team = [];
  }
  
  if (Array.isArray(patient.rtm)) {
    patient.rtm.forEach(rtmName => {
      patient.history.push(`${getCurrentTime()} RTM ${rtmName} entfernt`);
    });
    patient.rtm = [];
  }
  
  // STEP 5: ALLES SPEICHERN
  localStorage.setItem("patients", JSON.stringify(patients));
  localStorage.setItem("trupps", JSON.stringify(trupps));
  localStorage.setItem("rtms", JSON.stringify(rtms));
  
  // STEP 6: Events auslösen
  window.dispatchEvent(new StorageEvent("storage", {
    key: "patients",
    newValue: JSON.stringify(patients)
  }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: "trupps", 
    newValue: JSON.stringify(trupps)
  }));
  window.dispatchEvent(new StorageEvent("storage", {
    key: "rtms",
    newValue: JSON.stringify(rtms)
  }));
  
  // STEP 7: UI neu laden
  if (typeof loadPatients === 'function') {
    loadPatients(id);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // nur binden, wenn das Element wirklich da ist

  // loadPatients nur aufrufen, wenn die Patienten‐Container existieren
  if (document.getElementById("activePatients")) {
    loadPatients();
    
    // Beim Start auch alle dispositionStatus Einträge aktualisieren
    updateDispositionStatusFromAssignedResources();
  }
});

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
  
  // WICHTIG: Finale Status schützen - keine Status-Änderungen von finalen Zuständen weg
  // ABER: Erlaube Änderung ZU einem finalen Status
  if (field === "status" && (patient.status === "Entlassen" || patient.status === "Transport in KH")) {
    // Erlaube Änderung nur wenn es auch ein finaler Status ist
    if (value !== "Entlassen" && value !== "Transport in KH") {
      console.log(`Status-Änderung von ${patient.status} zu ${value} blockiert für Patient ${id}`);
      return; // Keine Status-Änderung von finalen Zuständen zu nicht-finalen Zuständen
    }
    // Ansonsten erlauben wir die Änderung zwischen finalen Zuständen
    console.log(`Status-Änderung von ${patient.status} zu ${value} erlaubt für Patient ${id}`);
  }
  
  // History-Array initialisieren, falls nötig
  if (!patient.history) patient.history = [];

  // Hilfs-Objekte sicherstellen
  patient.statusTimestamps = patient.statusTimestamps || {};

  // 2) Update von History, Feld, Triggern von recordStatusChange und Speichern
  function applyUpdate() {
    // a) History-Eintrag - NUR wenn value nicht leer ist
    if (field === "status") {
      patient.history.push(`${getCurrentTime()} Status: ${value}`);
    } else if (field === "discharge") {
      patient.history.push(`${getCurrentTime()} Entlassen: ${value}`);
    } else if (field === "transport") {
      patient.history.push(`${getCurrentTime()} Transport in KH: ${value}`);
    } else if (field === "additionalRequest") {
      patient.history.push(`${getCurrentTime()} ${value}`);
    } else if (field === "diagnosis" && value) { // Nur wenn diagnosis nicht leer
      patient.history.push(`${getCurrentTime()} Verdachtsdiagnose: ${value}`);
      
      // Spezialbehandlung für Diagnose: suggestedResources aktualisieren
      updateSuggestedResourcesForDiagnosis(patient, value);
    }

    // b) Feld IMMER setzen (auch bei leerem Wert)
    patient[field] = value;

    // d) persistieren
    localStorage.setItem("patients", JSON.stringify(patients));
    
    // e) Storage-Event auslösen für UI-Updates
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(patients),
      })
    );
  }

  // 3) Sonderfall Status → Animation + Delayed Update
  if (field === "status") {
    // a) History-Eintrag & Status setzen
    patient.history.push(`${getCurrentTime()} Status: ${value}`);
    patient.status = value;

    // c) Persist
    localStorage.setItem("patients", JSON.stringify(patients));

    // d) Animation & Trupp‐Aufräum‐Logik
    const oldCard = document.querySelector(`.patient-card[data-id='${id}']`);
    const finish = () => {
      if (value === "Entlassen" || value === "Transport in KH") {
        clearAssignments(id);
      }
      loadPatients(id);
    };

    if (oldCard) {
      oldCard.classList.add("slide-out");
      oldCard.addEventListener("animationend", finish, { once: true });
    } else {
      finish();
    }
    return;
  }

  // 4) Alle anderen Felder → direkt updaten OHNE Disposition-Update
  // Disposition-Updates erfolgen nur bei Trupp/RTM-Änderungen
  applyUpdate();
  loadPatients(); // Einfaches Neurendern ohne Disposition-Updates
}

// Neue Hilfsfunktion: suggestedResources basierend auf Diagnose aktualisieren
function updateSuggestedResourcesForDiagnosis(patient, diagnosis) {
  // Versuche die Diagnose in den Alarm-Konfigurationen zu finden
  if (!window.alarmConfig || !window.alarmConfig.categories) {
    return; // Keine Konfiguration verfügbar
  }
  
  // Suche nach der Diagnose in allen Kategorien und Keywords
  let foundResources = null;
  
  window.alarmConfig.categories.forEach(category => {
    if (foundResources) return; // Bereits gefunden
    
    category.keywords.forEach(keyword => {
      if (foundResources) return; // Bereits gefunden
      
      // Prüfe ob die Diagnose mit dem Keyword übereinstimmt
      // Berücksichtige auch "sonstiger XYZ – Details" Format
      let keywordToMatch = keyword.word;
      let diagnosisToMatch = diagnosis;
      
      // Wenn Diagnose ein "– " enthält (sonstiger Fall), nur den ersten Teil vergleichen
      if (diagnosis.includes(' – ')) {
        const diagnosisParts = diagnosis.split(' – ');
        if (diagnosisParts[0] && keyword.word.toLowerCase().includes('sonstiger')) {
          // Für "sonstiger" Keywords, prüfe ob der erste Teil der Diagnose passt
          keywordToMatch = keyword.word;
          diagnosisToMatch = diagnosisParts[0];
        }
      }
      
      // Exakte Übereinstimmung oder "sonstiger" Match
      if (keywordToMatch.toLowerCase() === diagnosisToMatch.toLowerCase() || 
          (keyword.word.toLowerCase().includes('sonstiger') && diagnosis.toLowerCase().startsWith(keyword.word.toLowerCase().split(' – ')[0]))) {
        foundResources = keyword.resources;
      }
    });
  });
  
  // Wenn Ressourcen gefunden wurden, aktualisiere sie
  if (foundResources && Array.isArray(foundResources)) {
    patient.suggestedResources = [...foundResources]; // Kopie erstellen
    
    // Disposition-Status zurücksetzen, da neue Ressourcen vorgeschlagen werden
    if (patient.dispositionStatus) {
      // Behalte nur die bereits disponierten Ressourcen bei
      const newDispositionStatus = {};
      foundResources.forEach(resource => {
        if (patient.dispositionStatus[resource] === 'dispatched') {
          newDispositionStatus[resource] = 'dispatched';
        }
        // Ignored-Status auch beibehalten
        if (patient.dispositionStatus[resource + '_ignored'] === true) {
          newDispositionStatus[resource + '_ignored'] = true;
        }
      });
      patient.dispositionStatus = newDispositionStatus;
    }
  } else {
    // Keine passenden Ressourcen gefunden - bestehende beibehalten oder leeren
    // patient.suggestedResources = []; // Auskommentiert um bestehende Ressourcen zu behalten
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
    
    // Behandle mehrere RTMs (kommagetrennt)
    const rtmList = value.split(',').map(rtm => rtm.trim()).filter(rtm => rtm.length > 0);
    rtmList.forEach(rtm => {
      patient.rtm.push(rtm);
    });
  }

  // 3) Disposition-Status direkt aktualisieren
  if (!patient.dispositionStatus) patient.dispositionStatus = {};
  
  if (type === "rtm") {
    // RTMs zu Ressourcen-Namen mappen - für alle hinzugefügten RTMs
    const rtmList = value.split(',').map(rtm => rtm.trim()).filter(rtm => rtm.length > 0);
    
    rtmList.forEach(rtmName => {
      const rtmLower = rtmName.toLowerCase();
      
      console.log(`Processing RTM: ${rtmName} (${rtmLower})`);
      
      // KORRIGIERTE LOGIK: Bei Fahrzeugnummern ist die MITTLERE Nummer entscheidend
      // XX-83-XX = RTW
      // XX-82-XX = NEF
      
      // Prüfe ob RTM zu bekannten Ressourcen passt und aktualisiere alle passenden
      if (rtmLower.includes('rtw') || 
          rtmLower.includes('rettungswagen') ||
          /-83-/.test(rtmName) ||     // Standard RTW (XX-83-XX)
          /\b83\/\d+/.test(rtmName) || // Alternative Notation 83/XX
          /\b83\b/.test(rtmName)) {    // Einfache Nennung der 83
        patient.dispositionStatus['RTW'] = 'dispatched';
        console.log('Set RTW to dispatched - matched RTW pattern (83)');
      }
      
      if (rtmLower.includes('nef') || 
          rtmLower.includes('notarzteinsatzfahrzeug') ||
          /-82-/.test(rtmName) ||     // Standard NEF (XX-82-XX) 
          /\b82\/\d+/.test(rtmName) || // Alternative Notation 82/XX
          /\b82\b/.test(rtmName)) {    // Einfache Nennung der 82
        patient.dispositionStatus['NEF'] = 'dispatched';
        patient.dispositionStatus['UHS-Notarzt oder NEF'] = 'dispatched';
        patient.dispositionStatus['Ggf. UHS-Notarzt oder NEF'] = 'dispatched';
        console.log('Set NEF and UHS-Notarzt oder NEF to dispatched - matched NEF pattern (82)');
      }
      
      if (rtmLower.includes('rettungsdienst') || rtmLower.includes('rd')) {
        patient.dispositionStatus['RTW'] = 'dispatched';
      }
      
      if (rtmLower.includes('notarzt') || rtmLower.includes('na')) {
        patient.dispositionStatus['UHS-Notarzt oder NEF'] = 'dispatched';
        patient.dispositionStatus['Ggf. UHS-Notarzt oder NEF'] = 'dispatched';
      }
    });
    
    console.log('Updated dispositionStatus:', patient.dispositionStatus);
  } else if (type === "team") {
    // Trupp wurde zugeordnet
    patient.dispositionStatus['Trupp'] = 'dispatched';
  }

  // 4) Sofort speichern
  localStorage.setItem("patients", JSON.stringify(patients));

  // 5) Nur wenn vorher gemeldet → Status auf „disponiert" setzen
  if (patient.status === "gemeldet") {
    updatePatientData(id, "status", "disponiert");
  }

  // 6) Historieneintrag für die Ressource
  const updated = JSON.parse(localStorage.getItem("patients")) || [];
  const p2 = updated.find((p) => p.id === id);
  if (p2) {
    p2.history = p2.history || [];
    p2.history.push(`${getCurrentTime()} ${label} ${value.trim()} zugeordnet`);
    
    // Stelle sicher dass die Disposition-Status-Updates auch in der gespeicherten Version sind
    if (type === "rtm") {
      // Korrekte Patterns für zugewiesene RTMs anwenden
      updateDispositionStatusFromAssignedResources();
    }
    
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

  // 8) Disposition-Update NUR bei Trupp-Zuordnung auslösen
  if (typeof triggerDispositionUpdate === 'function') {
    triggerDispositionUpdate();
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
    
    // Disposition-Update NUR bei Trupp-Entfernung auslösen
    if (typeof triggerDispositionUpdate === 'function') {
      triggerDispositionUpdate();
    }
  }
}

function removeRtm(id, index) {
  if (!confirm("Soll dieses RTM wirklich entfernt werden?")) return;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  
  if (Array.isArray(patient.rtm)) {
    const removed = patient.rtm.splice(index, 1);
    const removedRtmName = removed[0];
    
    if (!patient.history) patient.history = [];
    patient.history.push(`${getCurrentTime()} RTM ${removedRtmName} entfernt`);
    
    // Save patient changes
    localStorage.setItem("patients", JSON.stringify(patients));
    
    // Now update the RTM in the RTM tracker
    const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
    const rtm = rtms.find(r => r.name === removedRtmName);
    
    if (rtm) {
      const now = Date.now();
      
      // Record patient association in history if active
      if (rtm.patientInput && rtm.patientStart) {
        rtm.patientHistorie = rtm.patientHistorie || [];
        rtm.patientHistorie.push({
          nummer: rtm.patientInput,
          von: rtm.patientStart,
          bis: now
        });
      }
      
      // Reset RTM status and patient data
      rtm.patientInput = null;
      rtm.patientStart = null;
      rtm.status = 0;
      
      // Add entry to RTM history
      rtm.history = rtm.history || [];
      const timeStr = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      rtm.history.push(`${timeStr} Status: 0`);
      
      // Save RTM changes
      localStorage.setItem("rtms", JSON.stringify(rtms));
      
      // Dispatch event for RTM tracker
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "rtms",
          newValue: JSON.stringify(rtms),
        })
      );
    }
    
    // Disposition-Update for UI refresh
    if (typeof triggerDispositionUpdate === 'function') {
      triggerDispositionUpdate();
    }
    
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
  if (!patient) {
    console.error("Patient nicht gefunden:", id);
    return;
  }

  const current = patient[field] || "";
  const labelMap = {
    age: "Alter",
    diagnosis: "Verdachtsdiagnose",
    location: "Standort",
    remarks: "Bemerkungen",
    gender: "Geschlecht",
  };

  let value;

  // Spezialbehandlung für Geschlecht
  if (field === "gender") {
    const options = ["M", "W", "D"];
    const currentIndex = options.indexOf(current);
    const selection = prompt(
      `Geschlecht auswählen:\n1 = M (Männlich)\n2 = W (Weiblich)\n3 = D (Divers)\n\nAktuell: ${current || "nicht gesetzt"}`,
      currentIndex >= 0 ? (currentIndex + 1).toString() : ""
    );

    if (selection === null) return; // Abgebrochen

    const selectedIndex = parseInt(selection) - 1;
    if (selectedIndex >= 0 && selectedIndex < options.length) {
      value = options[selectedIndex];
    } else {
      alert("Ungültige Auswahl. Bitte 1, 2 oder 3 eingeben.");
      return;
    }
  } else {
    // Normale Texteingabe für andere Felder
    value = prompt(
      `Neuen Wert für ${labelMap[field] || field} eingeben:`,
      current
    );
  }

  if (value !== null && value !== current) {
    console.log(`Updating ${field} from "${current}" to "${value}" for patient ${id}`);
    
    // WICHTIG: Frische Kopie der Patientendaten holen
    const freshPatients = JSON.parse(localStorage.getItem("patients")) || [];
    const freshPatient = freshPatients.find((p) => p.id === id);
    
    if (!freshPatient) {
      console.error("Patient nicht mehr gefunden nach Neuladen:", id);
      return;
    }
    
    // DIREKTE Datenaktualisierung
    freshPatient[field] = value;
    
    // History-Eintrag hinzufügen
    if (!freshPatient.history) freshPatient.history = [];
    const timeStr = getCurrentTime();
    
    if (field === "diagnosis") {
      freshPatient.history.push(`${timeStr} Verdachtsdiagnose: ${value}`);
      // Spezialbehandlung für Diagnose: suggestedResources aktualisieren
      updateSuggestedResourcesForDiagnosis(freshPatient, value);
    } else if (field === "age") {
      freshPatient.history.push(`${timeStr} Alter: ${value}`);
    } else if (field === "gender") {
      freshPatient.history.push(`${timeStr} Geschlecht: ${value}`);
    } else if (field === "location") {
      freshPatient.history.push(`${timeStr} Standort: ${value}`);
    } else if (field === "remarks") {
      freshPatient.history.push(`${timeStr} Bemerkungen: ${value}`);
    }
    
    // SOFORT speichern und UI komplett neu laden
    try {
      localStorage.setItem("patients", JSON.stringify(freshPatients));
      console.log(`Patient ${id} - ${field} erfolgreich gespeichert:`, value);
      
      // WICHTIG: Komplettes Neurendern erzwingen
      loadPatients();
      
      // Storage-Event auslösen für andere Tracker
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "patients",
          newValue: JSON.stringify(freshPatients),
        })
      );
      
    } catch (error) {
      console.error("Fehler beim Speichern der Patientendaten:", error);
      alert("Fehler beim Speichern der Daten. Bitte erneut versuchen.");
    }
  }
}

// Add dropdown functions for status changes
function openTruppStatusDropdown(event, truppName) {
  event.stopPropagation();
  
  // Remove any existing dropdowns
  const existingDropdowns = document.querySelectorAll('.status-dropdown-overlay');
  existingDropdowns.forEach(dropdown => dropdown.remove());
  
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const trupp = trupps.find(t => t.name === truppName);
  if (!trupp) return;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'status-dropdown-overlay';
  dropdown.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
    padding: 5px;
    min-width: 120px;
  `;
  
  // Position dropdown near the clicked element
  const rect = event.target.getBoundingClientRect();
  dropdown.style.left = rect.left + 'px';
  dropdown.style.top = (rect.bottom + 5) + 'px';
  
  // Add status options
  if (window.statusOptions) {
    window.statusOptions.forEach(option => {
      const optionDiv = document.createElement('div');
      optionDiv.style.cssText = `
        padding: 5px;
        cursor: pointer;
        border-radius: 2px;
        background: ${option.color};
        margin: 2px 0;
        color: black;
      `;
      optionDiv.textContent = option.status + ' - ' + option.text;
      optionDiv.onclick = () => {
        changeTruppStatus(truppName, option.status);
        dropdown.remove();
      };
      dropdown.appendChild(optionDiv);
    });
  }
  
  document.body.appendChild(dropdown);
}

function openRtmStatusDropdown(event, rtmName) {
  event.stopPropagation();
  
  // Remove any existing dropdowns
  const existingDropdowns = document.querySelectorAll('.status-dropdown-overlay');
  existingDropdowns.forEach(dropdown => dropdown.remove());
  
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  const rtm = rtms.find(r => r.name === rtmName);
  if (!rtm) return;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'status-dropdown-overlay';
  dropdown.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
    padding: 5px;
    min-width: 120px;
  `;
  
  // Position dropdown near the clicked element
  const rect = event.target.getBoundingClientRect();
  dropdown.style.left = rect.left + 'px';
  dropdown.style.top = (rect.bottom + 5) + 'px';
  
  // Add status options
  if (window.statusOptions) {
    window.statusOptions.forEach(option => {
      const optionDiv = document.createElement('div');
      optionDiv.style.cssText = `
        padding: 5px;
        cursor: pointer;
        border-radius: 2px;
        background: ${option.color};
        margin: 2px 0;
        color: black;
      `;
      optionDiv.textContent = option.status + ' - ' + option.text;
      optionDiv.onclick = () => {
        changeRtmStatus(rtmName, option.status);
        dropdown.remove();
      };
      dropdown.appendChild(optionDiv);
    });
  }
  
  document.body.appendChild(dropdown);
}

function changeTruppStatus(truppName, newStatus) {
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const trupp = trupps.find(t => t.name === truppName);
  if (!trupp) return;
  
  trupp.status = newStatus;
  trupp.history = trupp.history || [];
  trupp.history.push({
    when: Date.now(),
    event: newStatus
  });
  
  localStorage.setItem("trupps", JSON.stringify(trupps));
  
  // Update patient status based on trupp status change
  updatePatientStatusBasedOnResourceStatus(truppName, newStatus, 'trupp');
  
  // Trigger storage event to update all trackers
  window.dispatchEvent(new StorageEvent("storage", {
    key: "trupps",
    newValue: JSON.stringify(trupps)
  }));
  
  // Reload patients to show updated status
  loadPatients();
}

function changeRtmStatus(rtmName, newStatus) {
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  const rtm = rtms.find(r => r.name === rtmName);
  if (!rtm) return;
  
  rtm.status = newStatus;
  rtm.history = rtm.history || [];
  rtm.history.push({
    when: Date.now(),
    event: newStatus
  });
  
  localStorage.setItem("rtms", JSON.stringify(rtms));
  
  // Update patient status based on RTM status change
  updatePatientStatusBasedOnResourceStatus(rtmName, newStatus, 'rtm');
  
  // Trigger storage event to update all trackers
  window.dispatchEvent(new StorageEvent("storage", {
    key: "rtms",
    newValue: JSON.stringify(rtms)
  }));
  
  // Reload patients to show updated status
  loadPatients();
}

// New function to update patient status based on resource status changes
function updatePatientStatusBasedOnResourceStatus(resourceName, newStatus, resourceType) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  let patientsUpdated = false;
  
  patients.forEach(patient => {
    // Skip if patient is already in final states - WICHTIG: Finale Status schützen (erweitert)
    const isFinalState = patient.status === "Entlassen" || 
                        patient.status === "Transport in KH" ||
                        patient.transport ||  // Hat Transport-Ziel
                        patient.discharge;    // Hat Entlassungsort
    
    if (isFinalState) {
      return;
    }
    
    // Check if this resource is assigned to this patient
    let isAssigned = false;
    if (resourceType === 'trupp' && Array.isArray(patient.team)) {
      isAssigned = patient.team.includes(resourceName);
    } else if (resourceType === 'rtm' && Array.isArray(patient.rtm)) {
      isAssigned = patient.rtm.includes(resourceName);
    }
    
    if (!isAssigned) return;
    
    // Update patient status based on resource status
    let newPatientStatus = null;
    
    switch (newStatus) {
      case 3: // Einsatz übernommen
        if (patient.status === "gemeldet") {
          newPatientStatus = "disponiert";
        }
        break;
      case 4: // Am Einsatzort
        if (["gemeldet", "disponiert"].includes(patient.status)) {
          newPatientStatus = "in Behandlung";
        }
        break;
      case 7: // Transport in UHS
        if (["gemeldet", "disponiert", "in Behandlung"].includes(patient.status)) {
          newPatientStatus = "verlegt in UHS";
        }
        break;
      case 8: // Transportziel erreicht
        if (["gemeldet", "disponiert", "in Behandlung", "verlegt in UHS"].includes(patient.status)) {
          newPatientStatus = "Behandlung in UHS";
        }
        break;
    }
    
    // Apply status change if needed
    if (newPatientStatus && newPatientStatus !== patient.status) {
      patient.status = newPatientStatus;
      patient.history = patient.history || [];
      patient.history.push(`${getCurrentTime()} Status: ${newPatientStatus} (via ${resourceType === 'trupp' ? 'Trupp' : 'RTM'} ${resourceName})`);
      patientsUpdated = true;
    }
  });
  
  // Save updated patients if any changes were made
  if (patientsUpdated) {
    localStorage.setItem("patients", JSON.stringify(patients));
    
    // Trigger storage event for patient updates
    window.dispatchEvent(new StorageEvent("storage", {
      key: "patients",
      newValue: JSON.stringify(patients)
    }));
  }
}

/**
 * Zeigt einen Prompt an, um einen benutzerdefinierten Eintrag zur Patienten-Historie hinzuzufügen
 * @param {string|number} patientId - ID des Patienten
 */
function promptAddEntry(patientId) {
  // Patienten aus dem localStorage laden
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  
  // Sicherstellen, dass patientId korrekt verglichen wird (als String)
  const strPatientId = String(patientId);
  const patient = patients.find((p) => String(p.id) === strPatientId);
  
  if (!patient) {
    console.error(`Patient mit ID ${patientId} nicht gefunden!`);
    return;
  }

  // Eingabeaufforderung für den neuen Eintrag
  const newEntry = prompt("Bitte geben Sie einen neuen Eintrag für die Patienten-Historie ein:");
  
  // Abbrechen bei leerem Eintrag
  if (!newEntry || !newEntry.trim()) return;
  
  // History-Array sicherstellen
  if (!patient.history) patient.history = [];
  
  // Aktuellen Zeitstempel holen - mit Fallback
  let timeStr;
  try {
    timeStr = getCurrentTime();
  } catch (e) {
    timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    console.warn("getCurrentTime() nicht verfügbar, verwende Fallback");
  }
  
  // Eintrag zur Historie hinzufügen
  patient.history.push(`${timeStr} ${newEntry.trim()}`);
  
  console.log(`Hinzufügen von Eintrag zu Patient ${patientId}:`, patient.history);
  
  // Zurück in localStorage speichern
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Storage-Event auslösen für UI-Updates in anderen Fenstern/Tabs
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "patients",
      newValue: JSON.stringify(patients),
    })
  );
  
  // UI aktualisieren - auch hier ID als String übergeben
  if (typeof loadPatients === 'function') {
    console.log(`loadPatients(${strPatientId}) wird aufgerufen`);
    loadPatients(strPatientId);
  } else {
    console.warn("loadPatients() nicht verfügbar");
  }
  
  console.log(`Eintrag hinzugefügt für Patient ${patientId}: ${newEntry.trim()}`);
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

/**
 * Kopiert die Patientendaten in die Zwischenablage
 * @param {string|number} patientId - ID des Patienten
 */
function copyPatientData(patientId) {
  // Patientendaten aus localStorage laden
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  
  if (!patient) {
    console.error(`Patient mit ID ${patientId} nicht gefunden!`);
    return;
  }
  
  // Patient-ID als String für copyToClipboard übergeben
  // Der Typ 'patient' wird als neue Entität für copyToClipboard verwendet
  copyToClipboard(String(patientId), 'patient');
}

/**
 * Entlässt einen Trupp aus seinem aktuellen Einsatz/Patientenzuordnung
 * @param {string} truppName - Name des Trupps
 * @param {string|number} patientId - ID des Patienten
 */
function releaseTruppFromAssignment(truppName, patientId) {
  if (!confirm(`Soll ${truppName} wirklich aus dem Einsatz entlassen werden?`)) return;

  console.log(`Entlasse Trupp ${truppName} von Patient ${patientId}`);
  
  // 1) Patient finden und Trupp aus team-Array entfernen
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId || p.id === String(patientId));
  
  if (!patient || !Array.isArray(patient.team)) {
    console.error(`Patient ${patientId} nicht gefunden oder hat kein team-Array`);
    return;
  }
  
  const truppIndex = patient.team.indexOf(truppName);
  if (truppIndex === -1) {
    console.error(`Trupp ${truppName} nicht im team-Array von Patient ${patientId} gefunden`);
    return;
  }
  
  // Trupp aus Array entfernen
  patient.team.splice(truppIndex, 1);
  
  // Historieneintrag hinzufügen
  if (!patient.history) patient.history = [];
  const timeStr = getCurrentTime();
  patient.history.push(`${timeStr} Trupp ${truppName} entfernt`);
  
  // Patientendaten speichern
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // 2) Trupp im Trupp-Tracker aktualisieren
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const trupp = trupps.find(t => t.name === truppName);
  
  if (trupp) {
    const now = Date.now();
    
    // Patienteneinsatz abschließen falls vorhanden
    if (trupp.patientInput && trupp.patientStart) {
      trupp.patientHistorie = trupp.patientHistorie || [];
      trupp.patientHistorie.push({
        nummer: trupp.patientInput,
        von: trupp.patientStart,
        bis: now,
      });
    }
    
    // Patientendaten zurücksetzen
    trupp.patientInput = null;
    trupp.patientStart = null;
    
    // Status auf "Einsatz beendet" setzen
    trupp.status = 0;
    
    // Historieneintrag hinzufügen
    trupp.history = trupp.history || [];
    trupp.history.push({
      when: now,
      event: 0,
    });
    
    // Trupp-Daten speichern
    localStorage.setItem("trupps", JSON.stringify(trupps));
    
    // Storage-Event auslösen
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "trupps",
        newValue: JSON.stringify(trupps),
      })
    );
  }
  
  // 3) Disposition-Status aktualisieren und UI neu laden
  if (typeof triggerDispositionUpdate === 'function') {
    triggerDispositionUpdate();
  }
  
  // UI aktualisieren
  loadPatients();
}

/**
 * Entlässt ein RTM aus seinem aktuellen Einsatz/Patientenzuordnung
 * @param {string} rtmName - Name des RTM
 * @param {string|number} patientId - ID des Patienten
 */
function releaseRtmFromAssignment(rtmName, patientId) {
  if (!confirm(`Soll ${rtmName} wirklich aus dem Einsatz entlassen werden?`)) return;

  console.log(`Entlasse RTM ${rtmName} von Patient ${patientId}`);
  
  // 1) Patient finden und RTM aus rtm-Array entfernen
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId || p.id === String(patientId));
  
  if (!patient || !Array.isArray(patient.rtm)) {
    console.error(`Patient ${patientId} nicht gefunden oder hat kein rtm-Array`);
    return;
  }
  
  const rtmIndex = patient.rtm.indexOf(rtmName);
  if (rtmIndex === -1) {
    console.error(`RTM ${rtmName} nicht im rtm-Array von Patient ${patientId} gefunden`);
    return;
  }
  
  // RTM aus Array entfernen
  patient.rtm.splice(rtmIndex, 1);
  
  // Historieneintrag hinzufügen
  if (!patient.history) patient.history = [];
  const timeStr = getCurrentTime();
  patient.history.push(`${timeStr} RTM ${rtmName} entfernt`);
  
  // Patientendaten speichern
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // 2) RTM im RTM-Tracker aktualisieren
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  const rtm = rtms.find(r => r.name === rtmName);
  
  if (rtm) {
    const now = Date.now();
    
    // Patienteneinsatz abschließen falls vorhanden
    if (rtm.patientInput && rtm.patientStart) {
      rtm.patientHistorie = rtm.patientHistorie || [];
      rtm.patientHistorie.push({
        nummer: rtm.patientInput,
        von: rtm.patientStart,
        bis: now,
      });
    }
    
    // Patientendaten zurücksetzen
    rtm.patientInput = null;
    rtm.patientStart = null;
    
    // Status auf "Einsatz beendet" setzen
    rtm.status = 0;
    
    // Historieneintrag hinzufügen
    rtm.history = rtm.history || [];
    const formattedTime = new Date(now).toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    rtm.history.push(`${formattedTime} Status: 0`);
    
    // RTM-Daten speichern
    localStorage.setItem("rtms", JSON.stringify(rtms));
    
    // Storage-Event auslösen
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "rtms",
        newValue: JSON.stringify(rtms),
      })
    );
  }
  
  // 3) Disposition-Status aktualisieren und UI neu laden
  if (typeof triggerDispositionUpdate === 'function') {
    triggerDispositionUpdate();
  }
  
  // UI aktualisieren
  loadPatients();
}

/**
 * Aktualisiert für alle Patienten die dispositionStatus basierend auf den zugewiesenen RTMs
 * Wichtig, um bereits zugewiesene RTMs korrekt zu erkennen (z.B. mit Nummern wie 10-83-XX)
 */
function updateDispositionStatusFromAssignedResources() {
  console.log("Updating disposition status from assigned resources...");
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  let updatesCount = 0;
  
  patients.forEach(patient => {
    // Überspringe Patienten ohne RTMs oder ohne suggestedResources
    if (!Array.isArray(patient.rtm) || !Array.isArray(patient.suggestedResources)) {
      return;
    }
    
    // Stelle sicher, dass dispositionStatus existiert
    if (!patient.dispositionStatus) {
      patient.dispositionStatus = {};
    }
    
    // Für Trupp immer einfach setzen, wenn vorhanden
    if (Array.isArray(patient.team) && patient.team.length > 0 && 
        patient.suggestedResources.includes('Trupp')) {
      patient.dispositionStatus['Trupp'] = 'dispatched';
      updatesCount++;
    }
    
    // Alle zugewiesenen RTMs durchgehen und erkennen
    patient.rtm.forEach(rtmName => {
      const rtmLower = rtmName.toLowerCase();
      let updates = 0;
      
      // Debug-Log für das Pattern-Matching
      console.log(`Analyzing RTM: ${rtmName} (${rtmLower})`);
      console.log(`Pattern check: contains '-83-'?: ${/-83-/.test(rtmName)}`);
      
      // RTW Erkennung
      if (rtmLower.includes('rtw') || 
          rtmLower.includes('rettungswagen') ||
          /-83-/.test(rtmName) ||      // Standard RTW (XX-83-XX)
          /\b83\/\d+/.test(rtmName) ||  // Alternative Notation 83/XX
          /\b83\b/.test(rtmName)) {     // Einfache Nennung der 83
        
        if (patient.suggestedResources.includes('RTW') && 
            patient.dispositionStatus['RTW'] !== 'dispatched') {
          patient.dispositionStatus['RTW'] = 'dispatched';
          updates++;
          console.log(`Set RTW to dispatched for patient ${patient.id} based on RTM ${rtmName}`);
        }
      }
      
      // NEF Erkennung
      if (rtmLower.includes('nef') || 
          rtmLower.includes('notarzteinsatzfahrzeug') ||
          /-82-/.test(rtmName) ||       // Standard NEF (XX-82-XX) 
          /\b82\/\d+/.test(rtmName) ||   // Alternative Notation 82/XX
          /\b82\b/.test(rtmName)) {      // Einfache Nennung der 82
        
        const notarztResources = [
          'NEF', 
          'UHS-Notarzt oder NEF', 
          'Ggf. UHS-Notarzt oder NEF'
        ];
        
        notarztResources.forEach(resource => {
          if (patient.suggestedResources.includes(resource) && 
              patient.dispositionStatus[resource] !== 'dispatched') {
            patient.dispositionStatus[resource] = 'dispatched';
            updates++;
            console.log(`Set ${resource} to dispatched for patient ${patient.id} based on RTM ${rtmName}`);
          }
        });
      }
      
      // Allgemeine RD Erkennung
      if (rtmLower.includes('rettungsdienst') || rtmLower.includes('rd')) {
        if (patient.suggestedResources.includes('RTW') && 
            patient.dispositionStatus['RTW'] !== 'dispatched') {
          patient.dispositionStatus['RTW'] = 'dispatched';
          updates++;
          console.log(`Set RTW to dispatched for patient ${patient.id} based on general RD mention in ${rtmName}`);
        }
      }
      
      // Notarzt Erkennung
      if (rtmLower.includes('notarzt') || rtmLower.includes('na')) {
        const notarztResources = [
          'UHS-Notarzt oder NEF', 
          'Ggf. UHS-Notarzt oder NEF'
        ];
        
        notarztResources.forEach(resource => {
          if (patient.suggestedResources.includes(resource) && 
              patient.dispositionStatus[resource] !== 'dispatched') {
            patient.dispositionStatus[resource] = 'dispatched';
            updates++;
            console.log(`Set ${resource} to dispatched for patient ${patient.id} based on NA mention in ${rtmName}`);
          }
        });
      }
      
      updatesCount += updates;
    });
  });
  
  // Wenn es Änderungen gab, speichern und events auslösen
  if (updatesCount > 0) {
    console.log(`Updated ${updatesCount} disposition status entries`);
    localStorage.setItem("patients", JSON.stringify(patients));
    
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(patients),
      })
    );
    
    // UI neu laden
    if (typeof loadPatients === 'function') {
      loadPatients();
    }
  } else {
    console.log("No disposition status updates needed");
  }
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
