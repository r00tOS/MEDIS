// === RTM Logic Functions ===

// Initialize RTMs array
let rtms = JSON.parse(localStorage.getItem("rtms") || "[]");

// Globale Variable für RTM Patient-Zuordnung
let _pendingRTMIndex = null;

// === RTM Creation Modal Functions ===
function openRTMCreationModal() {
  document.getElementById('rtmCreationModal').style.display = 'flex';
  
  // Präfix zurücksetzen
  document.getElementById('rtmPrefix').value = 'florian';
  
  // Standard-Felder zurücksetzen
  document.getElementById('rtmPart1').value = '';
  document.getElementById('rtmPart2').value = '';
  document.getElementById('rtmPart3').value = '';
  
  // Spezial-Feld zurücksetzen
  document.getElementById('rtmSpecialPart').value = '';
  
  // Standard-Modus anzeigen
  handlePrefixChange();
  
  // Fokus auf erstes Feld setzen
  setTimeout(() => {
    document.getElementById('rtmPart1').focus();
    document.getElementById('rtmPart1').select();
  }, 100);
}

function closeRTMCreationModal() {
  document.getElementById('rtmCreationModal').style.display = 'none';
}

function isNumberKey(evt) {
  var charCode = (evt.which) ? evt.which : evt.keyCode;
  if (charCode > 31 && (charCode < 48 || charCode > 57))
    return false;
  return true;
}

function formatTwoDigit(input) {
  let value = input.value;
  if (value.length > 2) {
    input.value = value.substring(0, 2);
  }
  updateRTMPreview();
}

function handleRTMTabNavigation(event, currentField) {
  if (event.key === 'Tab') {
    return; // Lass das normale Tab-Verhalten zu
  }
  
  if (event.key === 'Enter') {
    event.preventDefault();
    if (currentField < 3) {
      document.getElementById('rtmPart' + (currentField + 1)).focus();
      document.getElementById('rtmPart' + (currentField + 1)).select();
    } else {
      confirmRTMCreation();
    }
  }
  
  // Auto-advance nach 2 Ziffern
  if (event.target.value.length >= 1 && event.key >= '0' && event.key <= '9') {
    setTimeout(() => {
      if (event.target.value.length >= 2 && currentField < 3) {
        document.getElementById('rtmPart' + (currentField + 1)).focus();
        document.getElementById('rtmPart' + (currentField + 1)).select();
      }
    }, 50);
  }
}

function handlePrefixChange() {
  const prefix = document.getElementById('rtmPrefix').value;
  const isSpecial = prefix === 'christoph' || prefix === 'sar';
  
  // UI umschalten
  document.getElementById('rtmStandardInput').style.display = isSpecial ? 'none' : 'flex';
  document.getElementById('rtmSpecialInput').style.display = isSpecial ? 'block' : 'none';
  
  updateRTMPreview();
  
  // Fokus setzen
  setTimeout(() => {
    if (isSpecial) {
      document.getElementById('rtmSpecialPart').focus();
      document.getElementById('rtmSpecialPart').select();
    } else {
      document.getElementById('rtmPart1').focus();
      document.getElementById('rtmPart1').select();
    }
  }, 50);
}

function handleSpecialRTMNavigation(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    confirmRTMCreation();
  }
}

function updateRTMPreview() {
  const prefix = document.getElementById('rtmPrefix').value;
  const prefixTexts = {
    'florian': 'Florian Kiel',
    'sama': 'Sama Kiel', 
    'johannes': 'Johannes Kiel',
    'akkon': 'Akkon Kiel',
    'rotkreuz': 'Rotkreuz Kiel',
    'pelikan': 'Pelikan Kiel',
    'christoph': 'Christoph',
    'sar': 'SAR'
  };
  
  const prefixText = prefixTexts[prefix];
  const isSpecial = prefix === 'christoph' || prefix === 'sar';
  
  if (isSpecial) {
    const specialPart = document.getElementById('rtmSpecialPart').value || '...';
    document.getElementById('rtmPreview').textContent = `${prefixText} ${specialPart}`;
  } else {
    const part1 = document.getElementById('rtmPart1').value.padStart(2, '0');
    const part2 = document.getElementById('rtmPart2').value.padStart(2, '0');
    const part3 = document.getElementById('rtmPart3').value.padStart(2, '0');
    document.getElementById('rtmPreview').textContent = `${prefixText} ${part1}-${part2}-${part3}`;
  }
}

function confirmRTMCreation() {
  const prefix = document.getElementById('rtmPrefix').value;
  const isSpecial = ['christoph', 'sar'].includes(prefix);
  
  let rtmName;
  let rtmType = null;
  
  if (isSpecial) {
    const specialPart = document.getElementById('rtmSpecialPart').value.trim();
    if (!specialPart) {
      alert('Bitte Kennung eingeben');
      return;
    }
    const prefixText = prefix === 'christoph' ? 'Christoph' : 'SAR';
    rtmName = `${prefixText} ${specialPart}`;
    // Für Christoph und SAR können wir spezielle RTM-Typen setzen
    rtmType = prefix === 'christoph' ? 'RTH' : 'SAR';
  } else {
    const part1 = document.getElementById('rtmPart1').value.padStart(2, '0');
    const part2 = document.getElementById('rtmPart2').value.padStart(2, '0');
    const part3 = document.getElementById('rtmPart3').value.padStart(2, '0');
    
    if (!part1 || !part2 || !part3) {
      alert('Bitte alle Felder ausfüllen');
      return;
    }
    
    const prefixMap = {
      'florian': 'Florian Kiel',
      'sama': 'Sama Kiel',
      'johannes': 'Johannes Kiel',
      'akkon': 'Akkon Kiel',
      'rotkreuz': 'Rotkreuz Kiel',
      'pelikan': 'Pelikan Kiel'
    };
    
    const prefixText = prefixMap[prefix];
    rtmName = `${prefixText} ${part1}-${part2}-${part3}`;
    
    // RTM-Typ aus der mittleren Nummer extrahieren
    rtmType = parseInt(part2, 10);
  }
  
  // Check if editing existing RTM
  if (window.editingRTMMode && typeof window.editingRTMIndex === 'number') {
    const rtm = rtms[window.editingRTMIndex];
    if (rtm) {
      const oldName = rtm.name;
      rtm.name = rtmName;
      rtm.rtmType = rtmType; // RTM-Typ auch beim Umbenennen aktualisieren
      
      // Update patients that reference this RTM
      const patients = JSON.parse(localStorage.getItem("patients") || "[]");
      let patientsUpdated = false;
      
      patients.forEach(patient => {
        if (Array.isArray(patient.rtm)) {
          const index = patient.rtm.indexOf(oldName);
          if (index !== -1) {
            patient.rtm[index] = rtmName;
            if (!patient.history) patient.history = [];
            const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            patient.history.push(`${timeStr} RTM umbenannt: ${oldName} → ${rtmName}`);
            patientsUpdated = true;
          }
        }
      });
      
      if (patientsUpdated) {
        localStorage.setItem("patients", JSON.stringify(patients));
        window.dispatchEvent(new StorageEvent("storage", {
          key: "patients",
          newValue: JSON.stringify(patients),
        }));
      }
      
      saveRTMs();
      renderRTMs();
    }
    
    // Clear editing mode
    window.editingRTMMode = false;
    window.editingRTMIndex = undefined;
  } else {
    // Check if RTM already exists
    if (rtms.find(r => r.name === rtmName)) {
      alert('RTM mit diesem Namen existiert bereits');
      return;
    }
    
    // Create new RTM with correct rtmType
    addRTM(rtmName, rtmType);
  }
  
  closeRTMCreationModal();
}

function closeRTMCreationModal() {
  document.getElementById('rtmCreationModal').style.display = 'none';
  
  // Clear editing mode
  window.editingRTMMode = false;
  window.editingRTMIndex = undefined;
  
  // Reset form
  document.getElementById('rtmPrefix').value = 'florian';
  document.getElementById('rtmPart1').value = '';
  document.getElementById('rtmPart2').value = '';
  document.getElementById('rtmPart3').value = '';
  document.getElementById('rtmSpecialPart').value = '';
  handlePrefixChange();
  updateRTMPreview();
}

// === DOM Ready Event Listeners ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("confirmEinsatzort");
  if (btn) {
    btn.addEventListener("click", () => {
      const ort = document.getElementById("customEinsatzort").value.trim();
      if (!ort || _pendingRTMIndex === null) return;
      const rtm = rtms[_pendingRTMIndex];
      rtm.currentOrt = ort;
      addHistoryEntry(rtm.patientInput, `Einsatzort gesetzt: ${ort}`);
      saveRTMs();
      renderRTMs();
      closeEinsatzortModal();
    });
  }

  // Enter-Taste im RTM Creation Modal bestätigt das Modal
  document.addEventListener("keydown", function (e) {
    const modal = document.getElementById("rtmCreationModal");
    if (modal && modal.style.display === "flex" && e.key === "Enter") {
      e.preventDefault();
      confirmRTMCreation();
    }
  });
});

// === Main RTM Functions ===
function updateRTM(index, status) {
  // 0) Scroll-Position merken
  const scrollEl = document.scrollingElement || document.documentElement;
  const scrollY = scrollEl.scrollTop;
  status = Number(status);
  const patientKeepStatuses = ["3","4","7","8"];
  const rtm = rtms[index];
  const oldStatus = rtm.status;
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

    if (oldStatus === 3 && status === 4 && rtm.patientInput) {
    // …dann setze im zugehörigen Patientendatensatz den Status auf "in Behandlung"
    updatePatientData(rtm.patientInput, 'status', 'in Behandlung');
  }

      if (oldStatus === 3 && status === 8 && rtm.patientInput) {
    // …dann setze im zugehörigen Patientendatensatz den Status auf "in Behandlung"
    updatePatientData(rtm.patientInput, 'status', 'Behandlung in UHS');
  }

      if (oldStatus === 4 && status === 7 && rtm.patientInput) {
    updatePatientData(rtm.patientInput, 'status', 'verlegt in UHS');
  }

        if (oldStatus === 7 && status === 8 && rtm.patientInput) {
    updatePatientData(rtm.patientInput, 'status', 'Behandlung in UHS');
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
    rtm.pausenzeit = 0;
    rtm.currentPauseStart = now;
    // Einsatzzeit zurücksetzen
    rtm.einsatzzeit = 0;
    rtm.currentEinsatzStart = null;
  }

  // 3) Wechsel WEG von Pausen-Status → Messung stoppen
  if (!pauseStatuses.includes(status) && pauseStatuses.includes(oldStatus)) {
    rtm.currentPauseStart = null;
  }

  // 4) Wechsel IN Einsatz-Status → Einsatz neu starten
  if (
    einsatzStatuses.includes(status) &&
    !einsatzStatuses.includes(oldStatus)
  ) {
    rtm.einsatzzeit = 0;
    rtm.currentEinsatzStart = now;
  }

  // 5) Wechsel WEG von Einsatz-Status → Messung stoppen
  if (
    !einsatzStatuses.includes(status) &&
    einsatzStatuses.includes(oldStatus)
  ) {
    rtm.currentEinsatzStart = null;
  }

  // 6) Historie-Eintrag
  if (!rtm.history) rtm.history = [];
  if (oldStatus !== status) {
    rtm.history.push(`${timeStr} Status: ${status}`);
  }

  // 7) Spezielle Abschlüsse für Patient & Streife
  // nur löschen, wenn wir aus 3 in *keinen* der Sonder‐Status [4,7,8] wechseln
if (
  oldStatus === 3 &&
  rtm.patientInput &&
  rtm.patientStart &&
  !patientKeepStatuses.includes(String(status))
) {
    rtm.patientHistorie.push({
      nummer: rtm.patientInput,
      von: rtm.patientStart,
      bis: now,
    });
    rtm.patientInput = rtm.patientStart = null;
  }
// 7b) Streife abschließen
if (oldStatus === 11 && rtm.currentOrt && rtm.einsatzStartOrt) {
  const abgeschlossenerOrt = rtm.currentOrt;
  // 1) In die Einsatz-Historie
  rtm.einsatzHistorie.push({
    ort: abgeschlossenerOrt,
    von: rtm.einsatzStartOrt,
    bis: now,
  });
  // 2) In die RTM-Historie (für Timeline-Log)
  if (!rtm.history) rtm.history = [];
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  rtm.history.push(`${timeStr} Streife beendet am Ort: ${abgeschlossenerOrt}`);
  // 3) Felder zurücksetzen
  rtm.currentOrt = rtm.einsatzStartOrt = null;
}

  // 8) Wechsel auf Patient → Modal für Zuordnung öffnen
  if (oldStatus !== 3 && status === 3) {
    openRTMPatientAssignmentModal(index);
    return; // Früher Ausstieg, da die weitere Logik im Modal-Callback passiert
  }

  // 9) Bei Streife → neuen Ort abfragen
if (status === 11) {
  openEinsatzortModal(index);
  // restliche Logik übernimmt dann confirmEinsatzort()
}
  // 10) Status übernehmen
  rtm.status = status;
  rtm.lastStatusChange = now;

  // 11) RTM aus Patientendaten entfernen, wenn Weg von Patient
  //      Ausnahme: bleibe zugeordnet bei Status 3, 4, 7 oder 8
  const keepStatuses = [3, 4, 7, 8];
  if (oldStatus === 3 && !keepStatuses.includes(status)) {
    const stored = JSON.parse(localStorage.getItem("patients")) || [];
    stored.forEach((p) => {
      if (Array.isArray(p.team)) {
        const idx = p.team.indexOf(rtm.name);
        if (idx >= 0) {
          p.team.splice(idx, 1);
          p.history = p.history || [];
          p.history.push(`${timeStr} RTM ${rtm.name} entfernt`);
        }
      }
    });
  }

  // 12) Speichern & neu rendern
  saveRTMs();

  // Wenn ein RTM einem Patienten zugewiesen wurde, Disposition-Status aktualisieren
  if (status === 3 && rtm.patientInput) {
    updateRTMPatientDispositionStatus(rtm.patientInput);
  }

  // Sofortige UI-Aktualisierung
  renderRTMs();
  window.scrollTo(0, scrollY);
}

function saveRTMs() {
  localStorage.setItem("nextMaxEinsatzTime", nextMaxEinsatzTime);
  localStorage.setItem("rtms", JSON.stringify(rtms));
  
  // Storage-Event für andere Tabs/Fenster auslösen
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "rtms",
      newValue: JSON.stringify(rtms),
    })
  );
}

function addRTM(name = null, rtmType = null) {
  // Wenn kein Name übergeben wurde, verwende das alte Eingabefeld (für Rückwärtskompatibilität)
  const input = name || document.getElementById("newRTMName")?.value.trim();
  if (!input) return;
  
  // RTM-Typ aus dem Namen extrahieren, falls nicht direkt übergeben
  let extractedRtmType = rtmType;
  if (!extractedRtmType) {
    // Versuche RTM-Typ aus dem Namen zu extrahieren
    const match = input.match(/(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
      const middleNumber = parseInt(match[2], 10);
      extractedRtmType = middleNumber;
    }
  }
  
  rtms.push({
    name: input,
    rtmType: extractedRtmType || null, // RTM-Typ aus der mittleren Nummer
    status: 6,
    lastStatusChange: Date.now(),
    currentPauseStart: Date.now(),
    currentEinsatzStart: null,
    totalPauseTime: 0,
    pausenzeit: 0,
    einsatzzeit: 0,
    einsatzHistorie: [],
    patientHistorie: [],
    patientInput: "",
    currentOrt: "",
    einsatzStartOrt: null,
    patientStart: null,
    history: []
  });

  // Eingabefeld leeren, wenn vom alten System getriggert
  if (!name && document.getElementById("newRTMName")) {
    document.getElementById("newRTMName").value = "";
  }
  
  saveRTMs();
  // Sofortige UI-Aktualisierung
  setTimeout(() => renderRTMs(), 50);
}

function deleteRTM(index) {
  if (!confirm("Willst du dieses RTM wirklich löschen?")) return;
  const key = rtms[index].name;
  const el = document.querySelector(`[data-key="${key}"]`);
  if (el) {
    el.classList.add("move-out");
    setTimeout(() => {
      rtms.splice(index, 1);
      saveRTMs();
      renderRTMs();
    }, 300);
  } else {
    rtms.splice(index, 1);
    saveRTMs();
    renderRTMs();
  }
}

function toggleRTMStatusDropdown(rtmId) {
  const prev = localStorage.getItem('openRTMId');
  const next = prev === rtmId ? null : rtmId;
  localStorage.setItem('openRTMId', next);
  renderRTMs();
}

function closeRTMStatusDropdown() {
  localStorage.removeItem('openRTMId');
  renderRTMs();
}

function onRTMStatusSelected(i, status, rtmId) {
  updateRTM(i, status);
  closeRTMStatusDropdown();
}

function editOrt(index) {
  openEinsatzortModal(index);
}

function editPatient(index) {
  const rtm = rtms[index];
  const newPatient = prompt(
    "Neue Patientennummer eingeben:",
    rtm.patientInput || ""
  );
  if (newPatient !== null) {
    rtm.patientInput = newPatient.trim();
    saveRTMs();
    // Sofortige UI-Aktualisierung
    renderRTMs();
  }
}

// RTM-spezifische Patient Assignment Modal Funktion
function openRTMPatientAssignmentModal(rtmIndex) {
  _pendingTruppIndexForPatient = rtmIndex; // Verwende die gleiche Variable für Kompatibilität
  
  // Radio-Buttons zurücksetzen
  document.querySelector('input[name="assignmentType"][value="new"]').checked = true;
  document.getElementById('existingPatientSelection').style.display = 'none';
  document.getElementById('existingPatientSelect').innerHTML = '<option value="">Bitte Patient wählen...</option>';
  
  document.getElementById('patientAssignmentModal').style.display = 'flex';
}

// Neue Hilfsfunktion für die Aktualisierung der Disposition-Status für RTMs
function updateRTMPatientDispositionStatus(patientId) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  
  if (!patient || !patient.suggestedResources) return;
  
  if (!patient.dispositionStatus) {
    patient.dispositionStatus = {};
  }
  
  // Alle RTMs finden, die diesem Patienten zugeordnet sind
  const assignedRTMs = rtms.filter(r => (r.patientInput === patientId || r.patientInput === String(patientId)) && [3, 4, 7, 8].includes(r.status));
  
  // RTM-Symbol auf dispatched setzen wenn mindestens ein RTM zugeordnet
  if (assignedRTMs.length > 0) {
    if (patient.suggestedResources.includes('RTM')) {
      patient.dispositionStatus['RTM'] = 'dispatched';
    }
    // Auch Trupp-Symbol auf dispatched setzen, da RTMs oft als Trupps fungieren
    if (patient.suggestedResources.includes('Trupp')) {
      patient.dispositionStatus['Trupp'] = 'dispatched';
    }
  }
  
  // First Responder auf dispatched setzen wenn mehr als ein RTM zugeordnet
  if (assignedRTMs.length > 1 && patient.suggestedResources.includes('First Responder')) {
    patient.dispositionStatus['First Responder'] = 'dispatched';
  }
  
  // Patienten-Daten zurück speichern
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Event für Aktualisierung auslösen
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "patients",
      newValue: JSON.stringify(patients),
    })
  );
  
  // Sofortige lokale Aktualisierung der RTM-Karten
  if (typeof updateTruppCardDisposition === 'function') {
    updateTruppCardDisposition(patientId);
  }
}