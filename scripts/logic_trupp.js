// === 4) updateTrupp: wenn Status Patient, nextPatientNumber verwenden ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("confirmEinsatzort");
  if (!btn) {
    console.error("Button #confirmEinsatzort nicht gefunden!");
    return;
  }

  btn.addEventListener("click", () => {
    const ort = document.getElementById("customEinsatzort").value.trim();
    if (!ort || _pendingTruppIndex === null) return;
    const t = trupps[_pendingTruppIndex];
    t.currentOrt = ort;
    addHistoryEntry(t.patientInput, `Einsatzort gesetzt: ${ort}`);
    saveTrupps();
    renderTrupps();
    closeEinsatzortModal();
  });
});
function updateTrupp(index, status) {
  // 0) Scroll-Position merken
  const scrollEl = document.scrollingElement || document.documentElement;
  const scrollY = scrollEl.scrollTop;
  
  // Sicherstellen, dass trupps verfügbar ist
  let trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  if (!trupps[index]) {
    console.error("Trupp-Index nicht gefunden:", index);
    return;
  }
  
  // nextMaxEinsatzTime aus localStorage laden oder Standard verwenden
  const currentMaxEinsatzTime = parseInt(localStorage.getItem("nextMaxEinsatzTime"), 10) || 45;
  
  status = Number(status);
  const patientKeepStatuses = ["3","4","7","8"];
  const trupp = trupps[index];
  const oldStatus = trupp.status;
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

    if (oldStatus === 3 && status === 4 && trupp.patientInput) {
    // …dann setze im zugehörigen Patientendatensatz den Status auf "in Behandlung"
    updatePatientData(trupp.patientInput, 'status', 'in Behandlung');
  }

      if (oldStatus === 3 && status === 8 && trupp.patientInput) {
    // …dann setze im zugehörigen Patientendatensatz den Status auf "in Behandlung"
    updatePatientData(trupp.patientInput, 'status', 'Behandlung in UHS');
  }

      if (oldStatus === 4 && status === 7 && trupp.patientInput) {
    updatePatientData(trupp.patientInput, 'status', 'verlegt in UHS');
  }

        if (oldStatus === 7 && status === 8 && trupp.patientInput) {
    updatePatientData(trupp.patientInput, 'status', 'Behandlung in UHS');
  }

  // 1) Status-Gruppen definieren
    const einsatzStatuses = [
      11, // Streife
      3,  // Patient
      12, // Spielfeldrand
      0,  // Einsatz beendet
      4,  // dein neuer Status "Einsatzort" z.B.
      7,  // …
      8,  // …
    ];
  const pauseStatuses = [
    2,
    1,
    61,
  ];
  // Alles andere ist 6

  // 2) Wechsel IN Pausen-Status → Pause neu starten und Einsatzzeit zurücksetzen
  if (pauseStatuses.includes(status) && !pauseStatuses.includes(oldStatus)) {
    // Pause neu starten
    trupp.pausenzeit = 0;
    trupp.currentPauseStart = now;
    // Einsatzzeit zurücksetzen
    trupp.einsatzzeit = 0;
    trupp.currentEinsatzStart = null;
  }

  // 3) Wechsel WEG von Pausen-Status → Messung stoppen
  if (!pauseStatuses.includes(status) && pauseStatuses.includes(oldStatus)) {
    trupp.currentPauseStart = null;
  }

  // 4) Wechsel IN Einsatz-Status → Einsatz neu starten
  if (
    einsatzStatuses.includes(status) &&
    !einsatzStatuses.includes(oldStatus)
  ) {
    trupp.einsatzzeit = 0;
    trupp.currentEinsatzStart = now;
  }

  // 5) Wechsel WEG von Einsatz-Status → Messung stoppen
  if (
    !einsatzStatuses.includes(status) &&
    einsatzStatuses.includes(oldStatus)
  ) {
    trupp.currentEinsatzStart = null;
  }

  // 6) Historie-Eintrag
  if (!trupp.history) trupp.history = [];
  if (oldStatus !== status) {
    trupp.history.push(`${timeStr} Status: ${status}`);
  }

  // 7) Spezielle Abschlüsse für Patient & Streife
  // nur löschen, wenn wir aus 3 in *keinen* der Sonder‐Status [4,7,8] wechseln
if (
  oldStatus === 3 &&
  trupp.patientInput &&
  trupp.patientStart &&
  !patientKeepStatuses.includes(String(status))
) {
    trupp.patientHistorie.push({
      nummer: trupp.patientInput,
      von: trupp.patientStart,
      bis: now,
    });
    trupp.patientInput = trupp.patientStart = null;
  }
// 7b) Streife abschließen
if (oldStatus === 11 && trupp.currentOrt && trupp.einsatzStartOrt) {
  const abgeschlossenerOrt = trupp.currentOrt;
  // 1) In die Einsatz-Historie
  trupp.einsatzHistorie.push({
    ort: abgeschlossenerOrt,
    von: trupp.einsatzStartOrt,
    bis: now,
  });
  // 2) In die Trupp-History (für Timeline-Log)
  if (!trupp.history) trupp.history = [];
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  trupp.history.push(`${timeStr} Streife beendet am Ort: ${abgeschlossenerOrt}`);
  // 3) Felder zurücksetzen
  trupp.currentOrt = trupp.einsatzStartOrt = null;
}

  // 8) Wechsel auf Patient → Modal für Zuordnung öffnen
  if (oldStatus !== 3 && status === 3) {
    openPatientAssignmentModal(index);
    return; // Früher Ausstieg, da die weitere Logik im Modal-Callback passiert
  }

  // 9) Bei Streife → neuen Ort abfragen
if (status === 11) {
  openEinsatzortModal(index);
  // restliche Logik übernimmt dann confirmEinsatzort()
}
  // 10) Status übernehmen
  trupp.status = status;
  trupp.lastStatusChange = now;

  // 11) Trupp aus Patientendaten entfernen, wenn Weg von Patient
  //      Ausnahme: bleibe zugeordnet bei Status 3, 4, 7 oder 8
  const keepStatuses = [3, 4, 7, 8];
  if (oldStatus === 3 && !keepStatuses.includes(status)) {
    const stored = JSON.parse(localStorage.getItem("patients")) || [];
    stored.forEach((p) => {
      if (Array.isArray(p.team)) {
        const idx = p.team.indexOf(trupp.name);
        if (idx >= 0) {
          p.team.splice(idx, 1);
          p.history = p.history || [];
          p.history.push(`${timeStr} Trupp ${trupp.name} entfernt`);
        }
      }
    });
    localStorage.setItem("patients", JSON.stringify(stored));
    
    // Sofortiges Storage-Event für Patient-Updates
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(stored),
      })
    );
  }

  // 12) Trupps zurück speichern
  localStorage.setItem("trupps", JSON.stringify(trupps));
  localStorage.setItem("nextMaxEinsatzTime", currentMaxEinsatzTime);
  
  // Storage-Event auslösen
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "trupps",
      newValue: JSON.stringify(trupps),
    })
  );
  
  // Wenn ein Trupp einem Patienten zugewiesen wurde, Disposition-Status aktualisieren
  if (status === 3 && trupp.patientInput) {
    updatePatientDispositionStatus(trupp.patientInput);
    
    // Disposition-Update auslösen
    if (typeof triggerDispositionUpdate === 'function') {
      triggerDispositionUpdate();
    }
  }
  
  // Renderer nur aufrufen wenn verfügbar
  if (typeof renderTrupps === 'function') {
    renderTrupps();
  }
  
  // Scroll nur wenn im Trupp-Tracker
  if (typeof window.trupps !== 'undefined') {
    window.scrollTo(0, scrollY);
  }
}

// Neue Funktion für Status-Änderung nach Trupp-Name
function updateTruppByName(truppName, status) {
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const truppIndex = trupps.findIndex(t => t.name === truppName);
  
  if (truppIndex === -1) {
    console.error("Trupp nicht gefunden:", truppName);
    return;
  }
  
  updateTrupp(truppIndex, status);
}

// EventListener für automatische Disposition-Updates
window.addEventListener('storage', (e) => {
  if (e.key === 'patients') {
    // Trupps aus localStorage laden statt globale Variable zu verwenden
    const currentTrupps = JSON.parse(localStorage.getItem("trupps")) || [];
    
    // Prüfe ob Disposition-relevante Änderungen vorliegen
    const updatedPatients = JSON.parse(e.newValue || '[]');
    
    // Für jeden Patienten mit Dispositionsvorschlägen prüfen
    updatedPatients.forEach(patient => {
      if (patient.suggestedResources && patient.suggestedResources.length > 0) {
        updatePatientDispositionStatusSilent(patient.id, currentTrupps);
      }
    });
    
    // Trupp-Karten neu rendern nach Disposition-Updates (nur wenn renderTrupps verfügbar)
    if (typeof renderTrupps === 'function') {
      renderTrupps();
    }
  }
});

// Neue Hilfsfunktion für die Aktualisierung der Disposition-Status (ohne Re-Render)
function updatePatientDispositionStatusSilent(patientId, truppsArray = null) {
  // Trupps aus Parameter oder localStorage laden
  const currentTrupps = truppsArray || JSON.parse(localStorage.getItem("trupps")) || [];
  
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  
  if (!patient || !patient.suggestedResources) return;
  
  if (!patient.dispositionStatus) {
    patient.dispositionStatus = {};
  }
  
  // Alle Trupps finden, die diesem Patienten zugeordnet sind
  const assignedTrupps = currentTrupps.filter(t => t.patientInput === patientId && [3, 4, 7, 8].includes(t.status));
  
  // Trupp-Symbol auf dispatched setzen wenn mindestens ein Trupp zugeordnet
  if (assignedTrupps.length > 0 && patient.suggestedResources.includes('Trupp')) {
    patient.dispositionStatus['Trupp'] = 'dispatched';
  }
  
  // First Responder auf dispatched setzen wenn mehr als ein Trupp zugeordnet
  if (assignedTrupps.length > 1 && patient.suggestedResources.includes('First Responder')) {
    patient.dispositionStatus['First Responder'] = 'dispatched';
  }
  
  // Patienten-Daten zurück speichern (ohne Event auszulösen)
  localStorage.setItem("patients", JSON.stringify(patients));
}

// Vereinfachte Disposition-Update-Funktion (wird nur noch bei Trupp-Zuordnung verwendet)
function updatePatientDispositionStatus(patientId) {
  updatePatientDispositionStatusSilent(patientId);
}

function saveTrupps() {
  // nextMaxEinsatzTime aus localStorage laden oder Standard verwenden
  const currentMaxEinsatzTime = parseInt(localStorage.getItem("nextMaxEinsatzTime"), 10) || 45;
  localStorage.setItem("nextMaxEinsatzTime", currentMaxEinsatzTime);
  localStorage.setItem("trupps", JSON.stringify(trupps));
}

function resetAll() {
  if (confirm("Willst du wirklich alle Daten löschen?")) {
    // Entferne alle relevanten LocalStorage-Einträge
    localStorage.removeItem("trupps");
    localStorage.removeItem("nextPatientNumber");
    localStorage.removeItem("nextMaxEinsatzTime");

    // Setze Arrays/Variablen zurück
    trupps = [];
    nextPatientNumber = 1;
    nextMaxEinsatzTime = 45;

    // Aktualisiere die Eingabefelder
    document.getElementById("maxEinsatzTime").value = nextMaxEinsatzTime;

    // Speichere und rendere neu
    saveTrupps();
    renderTrupps();
  }
}

function addTrupp(name = null) {
  const input = name || document.getElementById("newTruppName").value.trim();
  if (!input) return;
  trupps.push({
    name: input,
    status: 6,
    lastStatusChange: Date.now(),
    currentPauseStart: Date.now(),
    currentEinsatzStart: null,
    totalPauseTime: 0,
    pausenzeit: 0, // neu: initiale Pausenzeit
    einsatzzeit: 0, // neu: initiale Einsatzzeit
    einsatzHistorie: [],
    patientHistorie: [],
    patientInput: "",
    currentOrt: "",
    einsatzStartOrt: null,
    patientStart: null,
  });

  // Eingabefeld leeren, wenn vom Nutzer getriggert
  if (!name) document.getElementById("newTruppName").value = "";
  saveTrupps();
  renderTrupps();
}

function addTrupps(prefix, start, end, step = 1) {
  if (!confirm(`Willst du wirklich neue Trupps hinzufügen?`)) return;
  for (let i = start; i <= end; i += step) {
    addTrupp(`${prefix} ${i}`);
  }
}

function deleteTrupp(index) {
  if (!confirm("Willst du diesen Trupp wirklich löschen?")) return;
  const key = trupps[index].name;
  const el = document.querySelector(`[data-key="${key}"]`);
  if (el) {
    el.classList.add("move-out");
    setTimeout(() => {
      trupps.splice(index, 1);
      saveTrupps();
      renderTrupps();
    }, 300); // Delay matches CSS transition time
  } else {
    trupps.splice(index, 1);
    saveTrupps();
    renderTrupps();
  }
}

function copyToClipboard(truppName) {
  const trupp = trupps.find((t) => t.name === truppName);
  if (!trupp) return;

  let textToCopy = "";

  // Für alle Patienten-Status (3,4,7,8): Patientendaten holen
  if ([3, 4, 7, 8].includes(trupp.status)) {
    const patients = JSON.parse(localStorage.getItem("patients")) || [];
    const patient = patients.find((p) => p.id === trupp.patientInput);
    if (!patient) return;

    const teamList = Array.isArray(patient.team)
      ? patient.team.join(", ")
      : "–";
    const rtmList = Array.isArray(patient.rtm)
      ? patient.rtm.join(", ")
      : "–";
    const nachf = (patient.history || [])
      .filter((e) => /nachgefordert/.test(e))
      .join("\n") || "–";
    const remarks = patient.remarks || "–";
    const historyText = (patient.history || []).join("\n") || "–";

    textToCopy = `Patient Nr.: ${patient.id}
Trupp: ${teamList}
RTM: ${rtmList}
Standort: ${patient.location || "–"}
Alter: ${patient.age || "–"}
Geschlecht: ${patient.gender || "–"}
Verdachtsdiagnose: ${patient.diagnosis || "–"}
Nachforderungen:
${nachf}
Bemerkung: ${remarks}

Patienten-Historie:
${historyText}`;
  }
  else {
    switch (trupp.status) {
      case 2:
        textToCopy = `${trupp.name} einsatzbereit in UHS`;
        break;
      case 6:
        textToCopy = `${trupp.name} nicht einsatzbereit`;
        break;
      case 11:
        textToCopy = `${trupp.name} übernimmt Streifengebiet ${trupp.currentOrt || "[Ort]"}`;
        break;
      case 12:
        const alle = trupps
          .filter((t) => t.status === 12)
          .map((t) => t.name)
          .join(", ");
        textToCopy = `${alle} Spielfeldrand erreicht`;
        break;
      default:
        textToCopy = `${trupp.name}: ${trupp.status}`;
    }
  }

  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      console.log("In Zwischenablage kopiert:", textToCopy);
    })
    .catch((err) => {
      console.error("Fehler beim Kopieren:", err);
    });
}



function addHistoryEntry(pid, entry) {
  // Alle Patienten aus dem lokalen Speicher holen
  const allPatients = JSON.parse(localStorage.getItem("patients") || "[]");

  // Den Patienten mit der angegebenen pid finden
  const patient = allPatients.find((p) => p.id === pid);

  // Wenn der Patient gefunden wird, Historie aktualisieren
  if (patient) {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Füge den neuen Status zur Historie des Patienten hinzu
    patient.history.push(`${timeStr} ${entry}`);

    // Speichern der aktualisierten Patienten-Daten im lokalen Speicher
    localStorage.setItem("patients", JSON.stringify(allPatients));

    // Event für die Aktualisierung auslösen
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(allPatients),
      })
    );
  } else {
    console.error("Patient nicht gefunden: " + pid);
  }
}


function toggleStatusDropdown(truppId) {
  const prev = localStorage.getItem('openTruppId');
  const next = prev === truppId ? null : truppId;
  localStorage.setItem('openTruppId', next);
  renderTrupps();
}

function closeStatusDropdown() {
  localStorage.removeItem('openTruppId');
  renderTrupps();
}

// Wird von jedem <li> aufgerufen, nachdem updateTrupp() ausgeführt wurde:
function onStatusSelected(i, status, truppId) {
  updateTrupp(i, status);
  // schließe das Dropdown
  closeStatusDropdown();
}