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
      
      // Prüfe ob RTM zu bekannten Ressourcen passt und aktualisiere alle passenden
      if (rtmLower.includes('rtw')) {
        patient.dispositionStatus['RTW'] = 'dispatched';
        console.log('Set RTW to dispatched');
      }
      if (rtmLower.includes('nef')) {
        patient.dispositionStatus['NEF'] = 'dispatched';
        patient.dispositionStatus['UHS-Notarzt oder NEF'] = 'dispatched';
        console.log('Set NEF and UHS-Notarzt oder NEF to dispatched');
      }
      if (rtmLower.includes('rettungsdienst') || rtmLower.includes('rd')) {
        patient.dispositionStatus['RTW'] = 'dispatched';
      }
      if (rtmLower.includes('notarzt') || rtmLower.includes('na')) {
        patient.dispositionStatus['UHS-Notarzt oder NEF'] = 'dispatched';
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
      const rtmList = value.split(',').map(rtm => rtm.trim()).filter(rtm => rtm.length > 0);
      rtmList.forEach(rtmName => {
        const rtmLower = rtmName.toLowerCase();
        if (rtmLower.includes('rtw')) {
          p2.dispositionStatus = p2.dispositionStatus || {};
          p2.dispositionStatus['RTW'] = 'dispatched';
        }
        if (rtmLower.includes('nef')) {
          p2.dispositionStatus = p2.dispositionStatus || {};
          p2.dispositionStatus['NEF'] = 'dispatched';
          p2.dispositionStatus['UHS-Notarzt oder NEF'] = 'dispatched';
        }
      });
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
    if (!patient.history) patient.history = [];
    patient.history.push(`${getCurrentTime()} RTM ${removed[0]} entfernt`);
    localStorage.setItem("patients", JSON.stringify(patients));
    
    // Disposition-Update NUR bei RTM-Entfernung auslösen
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
    // Skip if patient is already in final states
    if (patient.status === "Entlassen" || patient.status === "Transport in KH") {
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
