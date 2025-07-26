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
    // a) History-Eintrag
    if (field === "status") {
      patient.history.push(`${getCurrentTime()} Status: ${value}`);
    } else if (field === "discharge") {
      patient.history.push(`${getCurrentTime()} Entlassen: ${value}`);
    } else if (field === "transport") {
      patient.history.push(`${getCurrentTime()} Transport in KH: ${value}`);
    } else if (field === "additionalRequest") {
      patient.history.push(`${getCurrentTime()} ${value}`);
    } else if (field === "diagnosis") {
      patient.history.push(`${getCurrentTime()} Verdachtsdiagnose: ${value}`);
      
      // Spezialbehandlung für Diagnose: suggestedResources aktualisieren
      updateSuggestedResourcesForDiagnosis(patient, value);
    }

    // b) Feld setzen
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

  // 4) Alle anderen Felder → direkt updaten
  applyUpdate();
  loadPatients();
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
  if (value !== null && value !== current) {
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

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Funktionen für Status-Dropdown bei Trupps und RTMs
function openTruppStatusDropdown(event, truppName) {
  event.preventDefault();
  event.stopPropagation();
  
  // Finde den Trupp
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const trupp = trupps.find(t => t.name === truppName);
  
  if (!trupp) {
    alert('Trupp nicht gefunden!');
    return;
  }
  
  // Entferne existierendes Dropdown
  closeStatusDropdown();
  
  // Erstelle Status-Dropdown
  const dropdown = document.createElement('div');
  dropdown.id = 'patientStatusDropdown';
  dropdown.className = 'status-dropdown-overlay';
  dropdown.style.cssText = `
    position: fixed;
    z-index: 10000;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-height: 300px;
    overflow-y: auto;
    min-width: 200px;
  `;
  
  // Status-Optionen hinzufügen
  let optionsHTML = '';
  if (window.statusOptions) {
    window.statusOptions.forEach(option => {
      const isActive = option.status === trupp.status;
      optionsHTML += `
        <div class="status-option ${isActive ? 'active' : ''}" 
             onclick="changeTruppStatus('${truppName}', ${option.status}); event.stopPropagation();"
             style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; ${isActive ? 'background: #e9ecef;' : ''}">
          <span class="status-code" style="background: ${option.color}; border: 1px solid ${option.color}; color: black; padding: 2px 6px; border-radius: 2px; margin-right: 8px; font-size: 0.8em;">${option.status}</span>
          <span>${option.text}</span>
        </div>
      `;
    });
  }
  
  dropdown.innerHTML = optionsHTML;
  
  // Position berechnen
  const x = event.clientX;
  const y = event.clientY;
  
  document.body.appendChild(dropdown);
  
  // Position setzen
  dropdown.style.left = x + 'px';
  dropdown.style.top = y + 'px';
  
  // Sicherstellen, dass das Dropdown im Viewport bleibt
  const rect = dropdown.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (rect.right > viewportWidth) {
    dropdown.style.left = (x - rect.width) + 'px';
  }
  if (rect.bottom > viewportHeight) {
    dropdown.style.top = (y - rect.height) + 'px';
  }
  
  // Event-Listener für das Schließen bei Klick außerhalb
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('contextmenu', handleOutsideClick, true);
  }, 50);
}

function openRtmStatusDropdown(event, rtmName) {
  event.preventDefault();
  event.stopPropagation();
  
  // Finde das RTM
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  const rtm = rtms.find(r => r.name === rtmName);
  
  if (!rtm) {
    alert('RTM nicht gefunden!');
    return;
  }
  
  // Entferne existierendes Dropdown
  closeStatusDropdown();
  
  // Erstelle Status-Dropdown
  const dropdown = document.createElement('div');
  dropdown.id = 'patientStatusDropdown';
  dropdown.className = 'status-dropdown-overlay';
  dropdown.style.cssText = `
    position: fixed;
    z-index: 10000;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-height: 300px;
    overflow-y: auto;
    min-width: 200px;
  `;
  
  // Status-Optionen hinzufügen
  let optionsHTML = '';
  if (window.statusOptions) {
    window.statusOptions.forEach(option => {
      const isActive = option.status === rtm.status;
      optionsHTML += `
        <div class="status-option ${isActive ? 'active' : ''}" 
             onclick="changeRtmStatus('${rtmName}', ${option.status}); event.stopPropagation();"
             style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; ${isActive ? 'background: #e9ecef;' : ''}">
          <span class="status-code" style="background: ${option.color}; border: 1px solid ${option.color}; color: black; padding: 2px 6px; border-radius: 2px; margin-right: 8px; font-size: 0.8em;">${option.status}</span>
          <span>${option.text}</span>
        </div>
      `;
    });
  }
  
  dropdown.innerHTML = optionsHTML;
  
  // Position berechnen
  const x = event.clientX;
  const y = event.clientY;
  
  document.body.appendChild(dropdown);
  
  // Position setzen
  dropdown.style.left = x + 'px';
  dropdown.style.top = y + 'px';
  
  // Sicherstellen, dass das Dropdown im Viewport bleibt
  const rect = dropdown.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (rect.right > viewportWidth) {
    dropdown.style.left = (x - rect.width) + 'px';
  }
  if (rect.bottom > viewportHeight) {
    dropdown.style.top = (y - rect.height) + 'px';
  }
  
  // Event-Listener für das Schließen bei Klick außerhalb
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('contextmenu', handleOutsideClick, true);
  }, 50);
}

function handleOutsideClick(event) {
  const dropdown = document.getElementById('patientStatusDropdown');
  if (dropdown) {
    // Prüfe ob der Klick innerhalb des Dropdowns war
    if (!dropdown.contains(event.target)) {
      closeStatusDropdown();
    }
  }
}

function closeStatusDropdown() {
  const dropdown = document.getElementById('patientStatusDropdown');
  if (dropdown) {
    dropdown.remove();
  }
  // Event-Listener entfernen
  document.removeEventListener('click', handleOutsideClick, true);
  document.removeEventListener('contextmenu', handleOutsideClick, true);
}

function changeTruppStatus(truppName, newStatus) {
  // Dropdown sofort schließen
  closeStatusDropdown();
  
  // Verwende die neue updateTruppByName Funktion
  if (typeof updateTruppByName === 'function') {
    updateTruppByName(truppName, newStatus);
  } else if (typeof updateTrupp === 'function') {
    // Fallback: Trupp-Index finden und updateTrupp verwenden
    const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
    const truppIndex = trupps.findIndex(t => t.name === truppName);
    
    if (truppIndex !== -1) {
      updateTrupp(truppIndex, newStatus);
    }
  } else {
    // Letzter Fallback: Direkte Status-Änderung
    const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
    const truppIndex = trupps.findIndex(t => t.name === truppName);
    
    if (truppIndex !== -1) {
      const trupp = trupps[truppIndex];
      trupp.status = newStatus;
      trupp.lastStatusChange = Date.now();
      
      // Historie hinzufügen
      if (!trupp.history) trupp.history = [];
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      trupp.history.push(`${timeStr} Status: ${newStatus}`);
      
      localStorage.setItem("trupps", JSON.stringify(trupps));
      
      // Storage-Event auslösen
      window.dispatchEvent(new StorageEvent("storage", {
        key: "trupps",
        newValue: JSON.stringify(trupps),
      }));
    }
  }
  
  // Patient-Karten neu laden
  if (typeof loadPatients === 'function') {
    loadPatients();
  }
}

function changeRtmStatus(rtmName, newStatus) {
  // Dropdown sofort schließen
  closeStatusDropdown();
  
  // Verwende die updateRTMByName Funktion falls verfügbar
  if (typeof updateRTMByName === 'function') {
    updateRTMByName(rtmName, newStatus);
  } else if (typeof updateRTM === 'function') {
    // Fallback: RTM-Index finden und updateRTM verwenden
    const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
    const rtmIndex = rtms.findIndex(r => r.name === rtmName);
    
    if (rtmIndex !== -1) {
      updateRTM(rtmIndex, newStatus);
    }
  } else {
    // Letzter Fallback: Direkte Status-Änderung
    const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
    const rtmIndex = rtms.findIndex(r => r.name === rtmName);
    
    if (rtmIndex !== -1) {
      const rtm = rtms[rtmIndex];
      rtm.status = newStatus;
      rtm.lastStatusChange = Date.now();
      
      // Historie hinzufügen
      if (!rtm.history) rtm.history = [];
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      rtm.history.push(`${timeStr} Status: ${newStatus}`);
      
      localStorage.setItem("rtms", JSON.stringify(rtms));
      
      // Storage-Event auslösen
      window.dispatchEvent(new StorageEvent("storage", {
        key: "rtms",
        newValue: JSON.stringify(rtms),
      }));
    }
  }
  
  // Patient-Karten neu laden
  if (typeof loadPatients === 'function') {
    loadPatients();
  }
}
