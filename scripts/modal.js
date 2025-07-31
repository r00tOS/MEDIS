// öffnet den Einsatzort-Modal und füllt die Liste
function openEinsatzortModal(truppIndex) {
  _pendingTruppIndex = truppIndex;
  const ul = document.getElementById("presetList");
  ul.innerHTML = "";
  // window.einsatzorte muss aus deiner presets-Datei kommen
  window.einsatzorte.forEach(o => {
    const li = document.createElement("li");
    li.className = "item";
    li.textContent = o;
    li.onclick = () => {
      ul.querySelectorAll("li").forEach(x => x.classList.remove("selected"));
      li.classList.add("selected");
      document.getElementById("customEinsatzort").value = o;
    };
    ul.appendChild(li);
  });
  document.getElementById("customEinsatzort").value = "";
  document.getElementById("einsatzortModal").style.display = "flex";
}

// schließt den Modal
function closeEinsatzortModal() {
  document.getElementById("einsatzortModal").style.display = "none";
  _pendingTruppIndex = null;
}

// klick auf OK im Modal
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("confirmEinsatzort");
  if (btn) {
    btn.addEventListener("click", () => {
      const ort = document.getElementById("customEinsatzort").value.trim();
      if (!ort || _pendingTruppIndex === null) return;

      const t = trupps[_pendingTruppIndex];
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // 1) Ort setzen
      t.currentOrt = ort;
      t.einsatzStartOrt = now;

      // 2) Trupp-Historie ergänzen
      if (!t.history) t.history = [];
      t.history.push(`${timeStr} Einsatzort gesetzt: ${ort}`);

      // 3) Speichern & neu rendern
      saveTrupps();
      renderTrupps();

      // 4) Modal schließen
      closeEinsatzortModal();
    });
  }

  // Ensure timer system is not disrupted by modal creation
  if (typeof updateLiveTimers === 'function' && document.getElementById("activePatients")) {
    // Timer bereits in logic_patient.js initialisiert
  }
});

// ————————————————————————————————————————————————————————————————
// 1) Discharge-Modal definieren
const dischargeModalHTML = `
<div id="dischargeModal" class="modal" style="display:none; z-index:2000">
  <div class="modal-content">
    <span class="close" onclick="closeDischargeModal()">&times;</span>
    <h2>Patient entlassen</h2>
    <form id="dischargeForm">
      <label><input type="radio" name="dischargeType" value="in veranstaltung entlassen" checked> in Veranstaltung entlassen</label><br>
      <label><input type="radio" name="dischargeType" value="begibt sich eigenständig nach hause"> begibt sich eigenständig nach Hause</label><br>
      <label><input type="radio" name="dischargeType" value="begibt sich eigenständig in krankenhaus"> begibt sich eigenständig ins Krankenhaus</label><br>
      <label><input type="radio" name="dischargeType" value="in obhut der eltern entlassen"> in Obhut der Eltern entlassen</label><br>
      <label><input type="radio" name="dischargeType" value="in obhut von lebenspartner*in entlassen"> in Obhut von Lebenspartner*in entlassen</label><br>
      <label><input type="radio" name="dischargeType" value="sonstige"> sonstige:</label>
      <input type="text" id="dischargeOther" placeholder="Bitte Text eingeben…" style="width:100%; margin-top:4px;">
      <div style="text-align:right; margin-top:12px">
        <button type="button" onclick="closeDischargeModal()">Abbrechen</button>
        <button type="button" onclick="confirmDischarge()">OK</button>
      </div>
    </form>
  </div>
</div>`;
document.body.insertAdjacentHTML("beforeend", dischargeModalHTML);

// 2) Transport-Modal definieren
const transportModalHTML = `
<div id="transportModal" class="modal" style="display:none; z-index:2000">
  <div class="modal-content">
    <span class="close" onclick="closeTransportModal()">&times;</span>
    <h2>Patient transportieren</h2>
    <form id="transportForm">
      <label><input type="radio" name="transportType" value="an rtw übergeben" checked> an RTW übergeben</label><br>
      <label><input type="radio" name="transportType" value="an nef übergeben"> an NEF übergeben</label><br>
      <label><input type="radio" name="transportType" value="an ktw übergeben"> an KTW übergeben</label><br>
      <label><input type="radio" name="transportType" value="sonstige"> sonstige:</label>
      <input type="text" id="transportOther" placeholder="Bitte Text eingeben…" style="width:100%; margin-top:4px;">
      <div style="text-align:right; margin-top:12px">
        <button type="button" onclick="closeTransportModal()">Abbrechen</button>
        <button type="button" onclick="confirmTransport()">OK</button>
      </div>
    </form>
  </div>
</div>`;
document.body.insertAdjacentHTML("beforeend", transportModalHTML);

// 3) State-Variablen für aktuell zu bearbeitenden Patienten
let _pendingDischargeId = null;
let _pendingTransportId = null;

// 4) Öffnen-Funktionen
function dischargePatient(id) {
  _pendingDischargeId = id;
  document.getElementById("dischargeOther").value = "";
  // standardmäßig erster Radiosatz checked
  document.querySelector('input[name="dischargeType"]:checked').checked = true;
  document.getElementById("dischargeModal").style.display = "flex";
}

function transportPatient(id) {
  _pendingTransportId = id;
  document.getElementById("transportOther").value = "";
  document.querySelector('input[name="transportType"]:checked').checked = true;
  document.getElementById("transportModal").style.display = "flex";
}

// 5) Schließen-Funktionen
function closeDischargeModal() {
  document.getElementById("dischargeModal").style.display = "none";
  _pendingDischargeId = null;
}
function closeTransportModal() {
  document.getElementById("transportModal").style.display = "none";
  _pendingTransportId = null;
}

// 6) Confirm-Handler
function confirmDischarge() {
  const form = document.getElementById("dischargeForm");
  const type = form.dischargeType.value;
  let text = type;
  if (type === "sonstige") {
    const other = document.getElementById("dischargeOther").value.trim();
    if (!other) return alert("Bitte einen Text eingeben");
    text = other;
  }
  // 1) Discharge-Feld setzen
  updatePatientData(_pendingDischargeId, "discharge", text);
  // 2) Status auf Entlassen
  updatePatientData(_pendingDischargeId, "status", "Entlassen");
  // 3) Trupps beenden
  clearAssignments(_pendingDischargeId, "Entlassen");
  closeDischargeModal();
}

function confirmTransport() {
  const form = document.getElementById("transportForm");
  const type = form.transportType.value;
  let text = type;
  if (type === "sonstige") {
    const other = document.getElementById("transportOther").value.trim();
    if (!other) return alert("Bitte einen Text eingeben");
    text = other;
  }
  // 1) Transport-Feld setzen
  updatePatientData(_pendingTransportId, "transport", text);
  // 2) Status auf Transport in KH
  updatePatientData(_pendingTransportId, "status", "Transport in KH");
  // 3) Trupps beenden
  clearAssignments(_pendingTransportId, "Transport in KH");
  closeTransportModal();
}

// ==== Patient-Zuordnungs-Modal hinzufügen ====
const patientAssignmentModalTemplate = `
<div id="patientAssignmentModal" class="modal" style="display:none; z-index:2100">
  <div class="modal-content">
    <span class="close" onclick="closePatientAssignmentModal()">&times;</span>
    <h2>Patient-Zuordnung</h2>
    <p>Soll ein neuer Patient erstellt oder der Trupp einem bestehenden Patienten zugeordnet werden?</p>
    
    <div style="margin: 20px 0;">
      <label style="display: block; margin-bottom: 10px;">
        <input type="radio" name="assignmentType" value="new" checked> Neuen Patienten erstellen
      </label>
      <label style="display: block;">
        <input type="radio" name="assignmentType" value="existing"> Bestehendem Patienten zuordnen
      </label>
    </div>

    <div id="existingPatientSelection" style="display: none; margin: 20px 0;">
      <label for="existingPatientSelect">Patient auswählen:</label>
      <select id="existingPatientSelect" style="width: 100%; margin-top: 5px; padding: 8px;">
        <option value="">Bitte Patient wählen...</option>
      </select>
    </div>

    <div style="text-align: right; margin-top: 20px;">
      <button onclick="closePatientAssignmentModal()">Abbrechen</button>
      <button class="confirm-btn" onclick="confirmPatientAssignment()">Bestätigen</button>
    </div>
  </div>
</div>
`;

document.body.insertAdjacentHTML("beforeend", patientAssignmentModalTemplate);

// Globale Variablen für Patient-Zuordnung
let _pendingTruppIndexForPatient = null;

// Event-Listener für Radio-Button-Änderungen
document.addEventListener('change', function(e) {
  if (e.target.name === 'assignmentType') {
    const showExisting = e.target.value === 'existing';
    document.getElementById('existingPatientSelection').style.display = showExisting ? 'block' : 'none';
    
    if (showExisting) {
      populateExistingPatients();
    }
  }
});

// Modal öffnen
function openPatientAssignmentModal(truppIndex) {
  _pendingTruppIndexForPatient = truppIndex;
  
  // Radio-Buttons zurücksetzen
  document.querySelector('input[name="assignmentType"][value="new"]').checked = true;
  document.getElementById('existingPatientSelection').style.display = 'none';
  document.getElementById('existingPatientSelect').innerHTML = '<option value="">Bitte Patient wählen...</option>';
  
  document.getElementById('patientAssignmentModal').style.display = 'flex';
}

// Modal schließen
function closePatientAssignmentModal() {
  document.getElementById('patientAssignmentModal').style.display = 'none';
  _pendingTruppIndexForPatient = null;
}

// Bestehende Patienten in Dropdown laden
function populateExistingPatients() {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const select = document.getElementById('existingPatientSelect');
  
  // Nur aktive Patienten (nicht entlassen oder transportiert)
  const activePatients = patients.filter(p => 
    p.status !== "Entlassen" && p.status !== "Transport in KH"
  );
  
  select.innerHTML = '<option value="">Bitte Patient wählen...</option>';
  
  activePatients.forEach(patient => {
    const assignedTrupps = Array.isArray(patient.team) ? patient.team.join(", ") : "–";
    const assignedRTMs = Array.isArray(patient.rtm) ? patient.rtm.join(", ") : "–";
    const diagnosis = patient.diagnosis || "–";
    const location = patient.location || "–";
    
    // Kombinierte Anzeige: Trupps und RTMs
    let resourcesText = "";
    if (assignedTrupps !== "–" && assignedRTMs !== "–") {
      resourcesText = `${assignedTrupps} | ${assignedRTMs}`;
    } else if (assignedTrupps !== "–") {
      resourcesText = assignedTrupps;
    } else if (assignedRTMs !== "–") {
      resourcesText = assignedRTMs;
    } else {
      resourcesText = "–";
    }
    
    const option = document.createElement('option');
    option.value = patient.id;
    option.textContent = `Patient ${patient.id} - ${resourcesText} - ${diagnosis} - ${location}`;
    select.appendChild(option);
  });
}

// Zuordnung bestätigen
function confirmPatientAssignment() {
  const assignmentType = document.querySelector('input[name="assignmentType"]:checked').value;
  
  // Prüfen ob wir mit Trupps oder RTMs arbeiten
  const isRTMMode = typeof rtms !== 'undefined' && Array.isArray(rtms);
  const isTruppMode = typeof trupps !== 'undefined' && Array.isArray(trupps);
  
  if (assignmentType === 'new') {
    // Neuen Patienten erstellen (bisherige Logik)
    if (isRTMMode) {
      createNewPatientForRTM(_pendingTruppIndexForPatient);
    } else if (isTruppMode) {
      createNewPatientForTrupp(_pendingTruppIndexForPatient);
    }
  } else {
    // Bestehendem Patienten zuordnen
    const selectedPatientId = parseInt(document.getElementById('existingPatientSelect').value);
    if (!selectedPatientId) {
      alert('Bitte einen Patienten auswählen.');
      return;
    }
    
    if (isRTMMode) {
      assignRTMToExistingPatient(_pendingTruppIndexForPatient, selectedPatientId);
    } else if (isTruppMode) {
      assignTruppToExistingPatient(_pendingTruppIndexForPatient, selectedPatientId);
    }
  }
  
  closePatientAssignmentModal();
}

// Neue Funktion: RTM einem bestehenden Patienten zuordnen
function assignRTMToExistingPatient(rtmIndex, patientId) {
  const rtm = rtms[rtmIndex];
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1) RTM-Status und -Daten setzen
  rtm.status = 3;
  rtm.patientInput = patientId;
  rtm.patientStart = now;
  rtm.currentEinsatzStart = now;
  rtm.currentPauseStart = null;
  rtm.lastStatusChange = now;

  // 2) RTM-Historie ergänzen
  if (!rtm.history) rtm.history = [];
  rtm.history.push(`${timeStr} Status: 3`);

  // 3) Patient-Daten aktualisieren
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  
  if (patient) {
    // RTM nur zum RTM-Array hinzufügen, NICHT zum Team-Array
    if (!Array.isArray(patient.rtm)) patient.rtm = [];
    patient.rtm.push(rtm.name);   // Nur RTM-spezifische Zuordnung
    
    // Patient-Historie ergänzen
    if (!patient.history) patient.history = [];
    patient.history.push(`${timeStr} RTM ${rtm.name} zugeordnet`);
    
    // Status auf "disponiert" setzen, falls noch "gemeldet"
    if (patient.status === "gemeldet") {
      patient.status = "disponiert";
      patient.history.push(`${timeStr} Status: disponiert`);
    }
    
    localStorage.setItem("patients", JSON.stringify(patients));
    
    // Storage-Event für Patient-UI
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(patients),
      })
    );
  }

  // 4) RTM-Daten speichern und UI aktualisieren
  saveRTMs();
  renderRTMs();
}

// Neue Funktion: Neuen Patienten für RTM erstellen
function createNewPatientForRTM(rtmIndex) {
  const rtm = rtms[rtmIndex];
  const letzteOrt = rtm.currentOrt || rtm.einsatzHistorie.at(-1)?.ort || "";
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Erst den Patienten erstellen mit "disponiert" Status - OHNE Disposition-Timer
  const pid = newPatient({
    location: letzteOrt,
    initialStatus: "disponiert",
    skipDispositionTimer: true  // Neuer Parameter um Disposition-Timer zu überspringen
  });

  // Patient-Daten laden für weitere Bearbeitung
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === pid);
  
  if (patient) {
    // RTM zum RTM-Array hinzufügen
    if (!Array.isArray(patient.rtm)) patient.rtm = [];
    patient.rtm.push(rtm.name);
    
    // Patient-Historie ergänzen
    if (!patient.history) patient.history = [];
    patient.history.push(`${timeStr} RTM ${rtm.name} disponiert`);
    
    // WICHTIG: Kein recordStatusChange aufrufen, da Patient direkt disponiert erstellt wurde
    // Nur sicherstellen, dass die Timestamps korrekt sind
    patient.statusTimestamps = patient.statusTimestamps || {};
    patient.statusTimestamps.disponiert = now;
    
    // Patientendaten speichern
    localStorage.setItem("patients", JSON.stringify(patients));
    
    // Storage-Event für Patient-UI
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(patients),
      })
    );
  }

  // Dann RTM-Daten setzen
  rtm.status = 3;
  rtm.patientInput = pid;
  rtm.patientStart = now;
  rtm.currentEinsatzStart = now;
  rtm.currentPauseStart = null;
  rtm.lastStatusChange = now;

  // RTM-Historie ergänzen
  if (!rtm.history) rtm.history = [];
  rtm.history.push(`${timeStr} Status: 3`);

  // RTM-Daten speichern
  saveRTMs();
  renderRTMs();

  // Edit-Modal für neuen Patienten öffnen
  openEditModal(pid);
}

function assignTruppToExistingPatient(truppIndex, patientId) {
  const trupp = trupps[truppIndex];
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1) Trupp-Status und -Daten setzen
  trupp.status = 3;
  trupp.patientInput = patientId;
  trupp.patientStart = now;
  trupp.currentEinsatzStart = now;
  trupp.currentPauseStart = null;
  trupp.lastStatusChange = now;

  // 2) Trupp-Historie ergänzen
  if (!trupp.history) trupp.history = [];
  trupp.history.push(`${timeStr} Status: 3`);

  // 3) Patient-Daten aktualisieren
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  
  if (patient) {
    // Trupp zum Team-Array hinzufügen
    if (!Array.isArray(patient.team)) patient.team = [];
    patient.team.push(trupp.name);
    
    // Patient-Historie ergänzen
    if (!patient.history) patient.history = [];
    patient.history.push(`${timeStr} Trupp ${trupp.name} zugeordnet`);
    
    // Status auf "disponiert" setzen, falls noch "gemeldet"
    if (patient.status === "gemeldet") {
      patient.status = "disponiert";
      patient.history.push(`${timeStr} Status: disponiert`);
    }
    
    localStorage.setItem("patients", JSON.stringify(patients));
    
    // Storage-Event für Patient-UI
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(patients),
      })
    );
  }

  // 4) Trupp-Daten speichern und UI aktualisieren
  saveTrupps();
  renderTrupps();
}

function createNewPatientForTrupp(truppIndex) {
  const trupp = trupps[truppIndex];
  const letzteOrt = trupp.currentOrt || (trupp.einsatzHistorie && trupp.einsatzHistorie.length > 0 ? trupp.einsatzHistorie.at(-1).ort : "") || "";
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Erst den Patienten erstellen mit "disponiert" Status - OHNE Disposition-Timer
  const pid = newPatient({
    location: letzteOrt,
    initialStatus: "disponiert",
  });

  // Patient-Daten laden für weitere Bearbeitung
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === pid);

  if (patient) {
    // Trupp zum Team hinzufügen
    if (!Array.isArray(patient.team)) patient.team = [];
    patient.team.push(trupp.name);

    // Patient-Historie ergänzen
    if (!patient.history) patient.history = [];
    patient.history.push(`${timeStr} Trupp ${trupp.name} disponiert`);

    // WICHTIG: Kein recordStatusChange aufrufen, da Patient direkt disponiert erstellt wurde
    // Nur sicherstellen, dass die Timestamps korrekt sind
    patient.statusTimestamps = patient.statusTimestamps || {};
    patient.statusTimestamps.disponiert = now;

    // Patientendaten speichern
    localStorage.setItem("patients", JSON.stringify(patients));

    // Storage-Event für Patient-UI
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(patients),
      })
    );
  }

  // Dann Trupp-Daten setzen
  trupp.status = 3;
  trupp.patientInput = pid;
  trupp.patientStart = now;
  trupp.currentEinsatzStart = now;
  trupp.currentPauseStart = null;
  trupp.lastStatusChange = now;

  // Trupp-Historie ergänzen
  if (!trupp.history) trupp.history = [];
  trupp.history.push(`${timeStr} Status: 3`);

  // Trupp-Daten speichern
  saveTrupps();
  renderTrupps();

  // Edit-Modal für neuen Patienten öffnen
  openEditModal(pid);
}

// ==== RTM-Modal hinzufügen ====
const rtmModalTemplate = `
<div id="rtmModal" class="modal" style="display:none; z-index:2100">
  <div class="modal-content">
    <span class="close" onclick="closeRtmModal()">&times;</span>
    <h2>RTM disponieren</h2>
    
    <div style="margin: 20px 0;">
      <label style="display: block; margin-bottom: 10px;">
        <input type="radio" name="rtmType" value="internal" checked> Sanitätsdienst-RTM
      </label>
      <label style="display: block;">
        <input type="radio" name="rtmType" value="external"> Externes RTM
      </label>
    </div>

    <!-- Sanitätsdienst-RTM Auswahl -->
    <div id="internalRtmSelection" style="margin: 20px 0;">
      <label>Verfügbare RTMs auswählen:</label>
      <div id="internalRtmList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-top: 5px;">
        <!-- Wird dynamisch befüllt -->
      </div>
    </div>

    <!-- Externes RTM Auswahl -->
    <div id="externalRtmSelection" style="display: none; margin: 20px 0;">
      <label>Externe RTMs auswählen:</label>
      <div style="margin-top: 10px;">
        <label style="display: block; margin-bottom: 5px;">
          <input type="checkbox" name="externalRtm" value="RTW|83"> RTW
        </label>
        <label style="display: block; margin-bottom: 5px;">
          <input type="checkbox" name="externalRtm" value="KTW|85"> KTW
        </label>
        <label style="display: block; margin-bottom: 5px;">
          <input type="checkbox" name="externalRtm" value="NEF|82"> NEF
        </label>
        <label style="display: block; margin-bottom: 5px;">
          <input type="checkbox" name="externalRtm" value="NAW|81"> NAW
        </label>
        <label style="display: block; margin-bottom: 5px;">
          <input type="checkbox" name="externalRtm" value="ITW|80"> ITW
        </label>
        <label style="display: block; margin-bottom: 5px;">
          <input type="checkbox" name="externalRtm" value="RTH|RTH"> RTH
        </label>
      </div>
    </div>

    <div style="text-align: right; margin-top: 20px;">
      <button onclick="closeRtmModal()">Abbrechen</button>
      <button class="confirm-btn" onclick="confirmRtmAssignment()">Bestätigen</button>
    </div>
  </div>
</div>
`;

document.body.insertAdjacentHTML("beforeend", rtmModalTemplate);

// Globale Variablen für RTM-Modal
let _pendingRtmPatientId = null;

// Event-Listener für Radio-Button-Änderungen
document.addEventListener('change', function(e) {
  if (e.target.name === 'rtmType') {
    const showInternal = e.target.value === 'internal';
    document.getElementById('internalRtmSelection').style.display = showInternal ? 'block' : 'none';
    document.getElementById('externalRtmSelection').style.display = showInternal ? 'none' : 'block';
    
    if (showInternal) {
      populateInternalRtms();
    }
  }
});

// RTM-Modal öffnen
function openRtmModal(patientId) {
  _pendingRtmPatientId = patientId;
  
  // Radio-Buttons zurücksetzen
  document.querySelector('input[name="rtmType"][value="internal"]').checked = true;
  document.getElementById('internalRtmSelection').style.display = 'block';
  document.getElementById('externalRtmSelection').style.display = 'none';
  
  // Checkboxen zurücksetzen
  document.querySelectorAll('input[name="externalRtm"]').forEach(cb => cb.checked = false);
  
  populateInternalRtms();
  document.getElementById('rtmModal').style.display = 'flex';
}

// RTM-Modal schließen
function closeRtmModal() {
  document.getElementById('rtmModal').style.display = 'none';
  _pendingRtmPatientId = null;
}

// Interne RTMs laden
function populateInternalRtms() {
  // Sicherstellen, dass RTMs verfügbar sind
  let rtms = [];
  try {
    rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  } catch (e) {
    rtms = [];
  }
  
  const container = document.getElementById('internalRtmList');
  
  // Nur verfügbare RTMs (nicht im Einsatz)
  const availableRtms = rtms.filter(rtm => ![3, 4, 7, 8].includes(rtm.status));
  
  container.innerHTML = '';
  
  if (availableRtms.length === 0) {
    container.innerHTML = '<div style="color: #666; font-style: italic;">Keine verfügbaren RTMs</div>';
    return;
  }
  
  availableRtms.forEach(rtm => {
    // Sicherstellen, dass statusOptions verfügbar sind
    let statusDef = { text: 'Unbekannt' };
    if (window.statusOptions) {
      statusDef = window.statusOptions.find(o => o.status === rtm.status) || { text: 'Unbekannt' };
    }
    
    const checkbox = document.createElement('label');
    checkbox.style.display = 'block';
    checkbox.style.marginBottom = '5px';
    checkbox.innerHTML = `
      <input type="checkbox" name="internalRtm" value="${rtm.name}|${rtm.rtmType || ''}">
      ${rtm.name}
    `;
    
    container.appendChild(checkbox);
  });
}

// RTM-Zuweisung bestätigen
function confirmRtmAssignment() {
  const rtmType = document.querySelector('input[name="rtmType"]:checked').value;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === _pendingRtmPatientId);
  
  if (!patient) {
    alert('Patient nicht gefunden!');
    return;
  }
  
  if (!Array.isArray(patient.rtm)) {
    patient.rtm = [];
  }
  
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  let addedRtms = [];
  
  if (rtmType === 'internal') {
    // Interne RTMs
    const selectedInternal = document.querySelectorAll('input[name="internalRtm"]:checked');
    
    if (selectedInternal.length === 0) {
      alert('Bitte mindestens ein RTM auswählen.');
      return;
    }
    
    selectedInternal.forEach(checkbox => {
      const [rtmName, rtmTypeValue] = checkbox.value.split('|');
      patient.rtm.push(rtmName);
      addedRtms.push(rtmName);
      
      // RTM-Status aktualisieren (nur wenn RTMs verfügbar)
      try {
        const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
        const rtm = rtms.find(r => r.name === rtmName);
        if (rtm) {
          rtm.status = 3;
          rtm.patientInput = patient.id;
          rtm.patientStart = Date.now();
          rtm.currentEinsatzStart = Date.now();
          rtm.currentPauseStart = null;
          
          if (!rtm.history) rtm.history = [];
          rtm.history.push(`${timeStr} Status: 3`);
          
          localStorage.setItem("rtms", JSON.stringify(rtms));
          
          // Storage-Event für RTM-Updates auslösen
          window.dispatchEvent(new StorageEvent("storage", {
            key: "rtms",
            newValue: JSON.stringify(rtms),
          }));
        }
      } catch (e) {
      }
    });
    
  } else {
    // Externes RTM
    const selectedExternal = document.querySelectorAll('input[name="externalRtm"]:checked');
    
    if (selectedExternal.length === 0) {
      alert('Bitte mindestens ein externes RTM auswählen.');
      return;
    }
    
    selectedExternal.forEach(checkbox => {
      const [rtmName, rtmTypeValue] = checkbox.value.split('|');
      const externalName = `${rtmName} Extern`;
      patient.rtm.push(externalName);
      addedRtms.push(externalName);
      
      // Externes RTM in die RTM-Liste hinzufügen (nur wenn RTM-System verfügbar)
      try {
        const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
        const newRtm = {
          id: "rtm_" + Math.random().toString(36).substring(2, 10),
          name: externalName,
          rtmType: parseInt(rtmTypeValue),
          status: 3,
          patientInput: patient.id,
          patientStart: Date.now(),
          currentEinsatzStart: Date.now(),
          currentPauseStart: null,
          einsatzzeit: 0,
          pausenzeit: 0,
          totalPauseTime: 0,
          einsatzHistorie: [],
          patientHistorie: [],
          history: [`${timeStr} Status: 3`]
        };
        
        rtms.push(newRtm);
        localStorage.setItem("rtms", JSON.stringify(rtms));
        
        // Storage-Event für RTM-Updates auslösen
        window.dispatchEvent(new StorageEvent("storage", {
          key: "rtms",
          newValue: JSON.stringify(rtms),
        }));
      } catch (e) {
      }
    });
  }
  
  // Patient-Historie aktualisieren
  if (!patient.history) patient.history = [];
  patient.history.push(`${timeStr} RTM ${addedRtms.join(', ')} zugeordnet`);
  
  // Status auf "disponiert" setzen, falls noch "gemeldet"
  if (patient.status === "gemeldet") {
    patient.status = "disponiert";
    patient.history.push(`${timeStr} Status: disponiert`);
  }
  
  // DIREKT: Disposition-Status für RTMs aktualisieren
  if (!patient.dispositionStatus) patient.dispositionStatus = {};
  
  console.log('Updating RTM disposition for patient', patient.id, 'with RTMs:', addedRtms);
  
  addedRtms.forEach(rtmName => {
    const rtmLower = rtmName.toLowerCase();
    
    console.log(`Processing RTM: ${rtmName} (${rtmLower})`);
    
    // Prüfe ob RTM zu bekannten Ressourcen passt
    if (rtmLower.includes('rtw')) {
      patient.dispositionStatus['RTW'] = 'dispatched';
      console.log('Set RTW to dispatched');
    }
    if (rtmLower.includes('nef')) {
      patient.dispositionStatus['NEF'] = 'dispatched';
      if (!patient.dispositionStatus['NEF']) {
      patient.dispositionStatus['UHS-Notarzt oder NEF'] = 'dispatched';
      console.log('Set UHS-Notarzt oder NEF to dispatched');
      }
      console.log('Set NEF to dispatched');
    }
    if (rtmLower.includes('rettungsdienst') || rtmLower.includes('rd')) {
      patient.dispositionStatus['RTW'] = 'dispatched';
    }
    if (rtmLower.includes('notarzt') || rtmLower.includes('na')) {
      patient.dispositionStatus['UHS-Notarzt oder NEF'] = 'dispatched';
    }
  });
  
  console.log('Final dispositionStatus:', patient.dispositionStatus);
  
  // Patientendaten speichern
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Events auslösen
  window.dispatchEvent(new StorageEvent("storage", {
    key: "patients",
    newValue: JSON.stringify(patients),
  }));
  
  closeRtmModal();
  
  // loadPatients nur aufrufen, wenn die Funktion verfügbar ist
  if (typeof loadPatients === 'function') {
    loadPatients(_pendingRtmPatientId);
  }
}

// Trupp Assignment Modal (für Kontextmenü)
function showTruppAssignmentModal(patientId) {
  // Entferne existierende Modal falls vorhanden
  const existingModal = document.getElementById('truppAssignmentModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Verfügbare Trupps laden (nicht im Einsatz)
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const availableTrupps = trupps.filter(t => ![3, 4, 6, 7, 8, 12].includes(t.status));

  // Modal HTML erstellen
  const modalHTML = `
    <div id="truppAssignmentModal" class="modal" style="display: flex; z-index: 2000;">
      <div class="modal-content">
        <span class="close" onclick="closeTruppAssignmentModal()">&times;</span>
        <h2>Trupp disponieren</h2>
        
        <div style="margin: 20px 0;">
          <label for="truppSelect">Verfügbare Trupps:</label><br>
          <select id="truppSelect" style="width: 100%; margin-top: 5px; padding: 8px;">
            <option value="">Bitte Trupp auswählen...</option>
            ${availableTrupps.map(trupp => {
              const statusDef = window.statusOptions?.find(o => o.status === trupp.status) || { text: 'Unbekannt' };
              return `<option value="${trupp.name}">${trupp.name}</option>`;
            }).join('')}
          </select>
        </div>

        <div style="text-align: right; margin-top: 20px;">
          <button onclick="closeTruppAssignmentModal()">Abbrechen</button>
          <button class="confirm-btn" onclick="confirmTruppAssignment(${patientId})">Bestätigen</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeTruppAssignmentModal() {
  const modal = document.getElementById('truppAssignmentModal');
  if (modal) {
    modal.remove();
  }
}

function confirmTruppAssignment(patientId) {
  const select = document.getElementById('truppSelect');
  const selectedTrupp = select.value;
  
  if (!selectedTrupp) {
    alert('Bitte einen Trupp auswählen.');
    return;
  }

  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  
  if (!patient) {
    alert('Patient nicht gefunden!');
    return;
  }

  // Trupp zum Team hinzufügen
  if (!Array.isArray(patient.team)) {
    patient.team = [];
  }
  patient.team.push(selectedTrupp);

  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  // Patient-Historie aktualisieren
  if (!patient.history) patient.history = [];
  patient.history.push(`${timeStr} Trupp ${selectedTrupp} disponiert`);
  
  // Status auf "disponiert" setzen, falls noch "gemeldet"
  if (patient.status === "gemeldet") {
    patient.status = "disponiert";
    patient.history.push(`${timeStr} Status: disponiert`);
  }
  
  // Patientendaten speichern
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Trupp-Status aktualisieren
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const trupp = trupps.find(t => t.name === selectedTrupp);
  if (trupp) {
    const now = Date.now();
    
    // Aktuellen Einsatz beenden falls vorhanden
    if (trupp.currentOrt && trupp.einsatzStartOrt) {
      trupp.einsatzHistorie = trupp.einsatzHistorie || [];
      trupp.einsatzHistorie.push({
        ort: trupp.currentOrt,
        von: trupp.einsatzStartOrt,
        bis: now,
      });
      trupp.currentOrt = null;
      trupp.einsatzStartOrt = null;
    }
    
    // Trupp-Status auf Patient setzen
    trupp.status = 3;
    trupp.patientInput = patientId;
    trupp.patientStart = now;
    trupp.currentEinsatzStart = now;
    trupp.currentPauseStart = null;
    trupp.lastStatusChange = now;
    
    // Trupp-Historie aktualisieren
    if (!trupp.history) trupp.history = [];
    trupp.history.push(`${timeStr} Status: 3`);
    
    localStorage.setItem("trupps", JSON.stringify(trupps));
    
    // Storage-Events auslösen
    window.dispatchEvent(new StorageEvent("storage", {
      key: "trupps",
      newValue: JSON.stringify(trupps),
    }));
  }
  
  // Storage-Event für Patienten auslösen
  window.dispatchEvent(new StorageEvent("storage", {
    key: "patients",
    newValue: JSON.stringify(patients),
  }));
  
  closeTruppAssignmentModal();
  
  // Patient-Liste neu laden falls verfügbar
  if (typeof loadPatients === 'function') {
    loadPatients(patientId);
  }
}

// Globale Funktion für Trupp-Assignment (für Patient-Karten)
function openTruppDispositionModal(patientId) {
  showTruppAssignmentModal(patientId);
}