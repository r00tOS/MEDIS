function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTrupps() {
  // Sicherheitsprüfung: trupps muss verfügbar sein
  if (typeof trupps === 'undefined' || !Array.isArray(trupps)) {
    return;
  }
  
  const scrollY = window.scrollY;
  const now = Date.now();
  const openId = localStorage.getItem("openTruppId");

  let u18List = JSON.parse(localStorage.getItem('u18Trupps') || '[]');
window.addEventListener('storage', e => {
  if (e.key === 'u18Trupps') {
    u18List = JSON.parse(e.newValue || '[]');
    renderTrupps();
  }
});

  const prevRects = new Map();
  document.querySelectorAll(".trupp").forEach((el) => {
    if (el.dataset.key)
      prevRects.set(el.dataset.key, el.getBoundingClientRect());
  });

  einsatzContainer.innerHTML =
    pauseContainer.innerHTML =
    nichtContainer.innerHTML =
      "";
  const einsatz = [],
    pause = [],
    nicht = [];

  trupps.forEach((trupp, i) => {
    if (!trupp.id)
      trupp.id = "trupp_" + Math.random().toString(36).substring(2, 10);
    const div = document.createElement("div");
    const statusDefs = window.statusOptions;
    const currentDef = statusDefs.find(o => o.status === trupp.status) || statusDefs[0];
    const opt = window.statusOptions.find(o => o.status === trupp.status);
    const statusLabel = opt
    ? `${trupp.status} – ${opt.text}`
    : String(trupp.status);
    
    div.className = "trupp";
    div.dataset.key = trupp.name;
    div.dataset.truppId = trupp.id;
    div.dataset.truppIndex = i; // Für Kontextmenü
    
    // wenn diese ID die gespeicherte offene ist, öffnen wir sie gleich
    const isOpen = trupp.id === openId;
    if (isOpen) div.classList.add('show-status-buttons');

    const einsatzzeit = trupp.einsatzzeit || 0;
    let pausenzeit = trupp.pausenzeit || 0;
    let totalPause = trupp.totalPauseTime || 0;

    if (trupp.currentEinsatzStart && einsatzzeit > nextMaxEinsatzTime * 60000)
      div.classList.add("ueberzogen");
    if (trupp.status === 61)
      div.classList.add("rueckhaltung");
    if (trupp.status === 12) div.classList.add("spielfeldrand");
    if ([3, 4, 7, 8].includes(trupp.status))
      div.classList.add("patient");
    // 1)gemeinsame Einsatz-Gruppe
    if (
      [11, 12, 0].includes(
        trupp.status
      )
    ) {
      div.classList.add("einsatz");
      // und wenn es genau 0 ist, den lila Style
      if (trupp.status === 0) {
        div.classList.add("einsatz-beendet");
      }
    }
    // 2) Pause-Status
    else if (
      [1, 2, 61].includes(trupp.status)
    ) {
      div.classList.add("pause");
    }
    // 3) alle anderen → nicht einsatzbereit
    else {
      div.classList.add("nicht-einsatzbereit");
    }

    const min = (ms) => Math.floor(ms / 60000);
    const timeDisplay =
      trupp.currentEinsatzStart &&
      trupp.status !== 61
        ? `Aktuelle Einsatzzeit: ${min(einsatzzeit)} Min`
        : `Aktuelle Pausenzeit: ${min(pausenzeit)} Min${
            trupp.status === 61
              ? " (Rückhaltung zählt als Pause)"
              : ""
          }`;

    const gesamtPause = `Gesamte Pausenzeit: ${min(totalPause)} Min`;

    const progress =
      trupp.currentEinsatzStart &&
      trupp.status !== 61
        ? Math.min(einsatzzeit / (nextMaxEinsatzTime * 60000), 1)
        : 0;
    const progressBar =
      trupp.currentEinsatzStart &&
      trupp.status !== 61
        ? `<div style='background:#ccc;height:8px;border-radius:4px;margin-top:4px;'>
     <div style='height:8px;width:${Math.floor(
       progress * 100
     )}%;background:#28a745;border-radius:4px;'></div>
   </div>`
        : "";

        const isU18 = u18List.includes(trupp.name);
div.innerHTML = `
<div class="trupp-header${isU18 ? ' u18' : ''}">
    <h3>
      ${trupp.name}
      ${isU18 ? '<span class="badge-u18">U18</span>' : ''}
    </h3>
    ${trupp.status === 6
      ? `<button class="delete-btn" onclick="deleteTrupp(${i})">×</button>`
      : ''}
  </div>

 <div class="status-dropdown">
    <button
      class="status-toggle"
      onclick="toggleStatusDropdown('${trupp.id}')"
    >
      <span
        class="status-code"
        style="
          background: ${currentDef.color};
          border: 1px solid ${currentDef.color};
        "
      >
        ${currentDef.status}
      </span>
      ${currentDef.text} ▾
    </button>

    <ul class="status-menu${trupp.id === openId ? ' open' : ''}">
      ${statusDefs.map(o => `
        <li
          class="${o.status === currentDef.status ? 'active' : ''}"
          onclick="onStatusSelected(${i}, ${o.status}, '${trupp.id}')"
        >
          <span
            class="status-code"
            style="
              background: ${o.color};
              border: 1px solid ${o.color};
            "
          >
            ${o.status}
          </span>
          ${o.text}
        </li>
      `).join('')}
    </ul>
  </div>
  
  ${![61, 1].includes(trupp.status)
    ? `
      <button class="meldung-btn" onclick="copyToClipboard('${trupp.name}')">
        Meldung
      </button>
      ${[3,4,7,8].includes(trupp.status)
        ? `
        `
        : ``
      }
    `
    : ``
  }
</div>


		  ${
        trupp.status === 11
          ? `<p><strong>${
              trupp.currentOrt || "kein Einsatzort"
            }</strong> <button onclick="editOrt(${i})">✎</button></p>`
          : ""
      }
${(() => {
  // nur für Patient-Status 3, 4, 7, 8
  if (![3, 4, 7, 8].includes(trupp.status)) return "";

  // passenden Patient holen
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient  = patients.find(p => p.id === trupp.patientInput);
  if (!patient) return "";

  // Disposition-Status aktualisieren (zentrale Funktion aus render_patients.js)
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  if (typeof updatePatientDispositionStatus === 'function') {
    updatePatientDispositionStatus(patient, trupps, rtms);
  }

  // Hilfsfunktion für Ressourcen-Kürzel
  const getResourceAbbreviation = (resource) => {
    const abbreviations = {
      'Trupp': 'T',
      'RTW': 'RTW',
      'UHS-Notarzt oder NEF': 'NA',
      'NEF': 'NEF',
      'First Responder': 'FR',
      'Info an ASL': 'ASL',
      'Ordnungsdienst hinzuziehen': 'OD',
      'Polizei hinzuziehen': 'POL',
      'Ggf. Ordnungsdienst hinzuziehen': 'OD?',
      'Ggf. Polizei hinzuziehen': 'POL?'
    };
    
    // Für alle anderen "Ggf. ..." Ressourcen automatisch behandeln
    if (resource.startsWith('Ggf. ') && !abbreviations[resource]) {
      const baseResource = resource.replace('Ggf. ', '');
      const baseAbbrev = abbreviations[baseResource];
      if (baseAbbrev) {
        return baseAbbrev + '?';
      }
      // Fallback: erste 3 Zeichen + ?
      return baseResource.substring(0, 3).toUpperCase() + '?';
    }
    
    return abbreviations[resource] || resource.substring(0, 3).toUpperCase();
  };

  // Dispositionssymbole generieren - Status wird jetzt durch zentrale Funktion gesetzt
  let dispositionSymbols = '';
  
  if (patient.suggestedResources && Array.isArray(patient.suggestedResources) && patient.suggestedResources.length > 0) {
    dispositionSymbols = '<div class="disposition-symbols" style="display: flex; flex-direction: column; gap: 4px; margin: 8px 0;">' +
      '<span style="font-weight: bold; margin-bottom: 4px;">Dispositionsvorschlag:</span>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
    
    patient.suggestedResources.forEach(resource => {
      const abbrev = getResourceAbbreviation(resource);
      
      // Status nur aus den Patientendaten abrufen (wurde durch zentrale Funktion gesetzt)
      if (!patient.dispositionStatus) {
        patient.dispositionStatus = {};
      }
      
      const isDispatched = patient.dispositionStatus[resource] === 'dispatched';
      const isIgnored = patient.dispositionStatus[resource + '_ignored'] === true;
      
      dispositionSymbols += '<span class="disposition-symbol ' + (isDispatched ? 'dispatched' : 'required') + 
             (isIgnored ? ' ignored' : '') +
             '" style="display: inline-block; padding: 2px 6px; margin: 0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; white-space: nowrap;' +
             (isDispatched || isIgnored ? '' : ' animation: blink 1.5s infinite;') + '"' +
             ' onclick="toggleDispositionStatus(' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')"' +
             ' oncontextmenu="toggleDispositionIgnore(event, ' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')"' +
             ' title="' + resource + '">' +
             abbrev + '</span>';
    });
    
    dispositionSymbols += '</div></div>';
  } else {
    dispositionSymbols = '<div style="margin: 8px 0; color: #666; font-style: italic;">Keine Dispositionsvorschläge verfügbar</div>';
  }

  // jetzt das Markup mit <table> und <caption>
  return `
<div class="patient-summary">
  <table class="patient-summary-table">
    <caption>Patient ${trupp.patientInput}</caption>
    <thead>
      <tr>
        <th>Diagnose</th>
        <th>Alter</th>
        <th>Geschl.</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${patient.diagnosis || "–"}</td>
        <td>${patient.age       || "–"}</td>
        <td>${patient.gender    || "–"}</td>
      </tr>
      <tr>
        <th>Standort</th>
        <td colspan="2">${patient.location || "–"}</td>
      </tr>
    </tbody>
  </table>
  ${dispositionSymbols}
</div>
  `;
})()}



          <p>${timeDisplay}</p>
          ${progressBar}
          <p>${gesamtPause}</p>

          <p><strong>Einsatzorte:</strong><br>
            ${
              trupp.einsatzHistorie && trupp.einsatzHistorie.length
                ? trupp.einsatzHistorie
                    .map(
                      (h) =>
                        `${h.ort} (${formatTime(h.von)} - ${formatTime(h.bis)})`
                    )
                    .join("<br>")
                : "–"
            }
          </p>
          <p><strong>Patientennummern:</strong><br>
            ${
              trupp.patientHistorie && trupp.patientHistorie.length
                ? trupp.patientHistorie
                    .map(
                      (h) =>
                        `${h.nummer} (${formatTime(h.von)} - ${formatTime(
                          h.bis
                        )})`
                    )
                    .join("<br>")
                : "–"
            }
          </p>
        `;

    // Kontextmenü für alle Trupps NACH dem innerHTML hinzufügen
    setTimeout(() => {
      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTruppContextMenu(e, i, trupp.patientInput);
      });
    }, 10);

    const einsatzSort = 
  trupp.status === 12
    ? 99
    : [3, 4, 7, 8].includes(trupp.status)
      ? 2
      : trupp.status === 0
        ? 1
        : 0;
    if (
      [11, 3, 12, 0, 4, 7, 8].includes(
        trupp.status
      )
    )
      einsatz.push({ el: div, sort: einsatzSort });
    else if (
      [2, 1].includes(trupp.status)
    )
      pause.push({ el: div, sort: pausenzeit });
    else if (trupp.status === 61)
      pause.push({ el: div, sort: -1 });
    else nicht.push({ el: div, sort: pausenzeit });
  });

  // 1) Im Einsatz: sortiere absteigend nach aktueller Einsatzzeit
  // --- am Ende von renderTrupps(), statt deiner jetzigen drei .sort-Blöcke ---

  // 1) IM EINSATZ: erst nach Status-Priorität (sort), dann nach Einsatzzeit absteigend
  einsatz
    .sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      const tA =
        trupps.find((t) => t.name === a.el.dataset.key).einsatzzeit || 0;
      const tB =
        trupps.find((t) => t.name === b.el.dataset.key).einsatzzeit || 0;
      return tB - tA; // längste Einsatzzeit zuerst
    })
    .forEach((t) => einsatzContainer.appendChild(t.el));

  // 2) IN PAUSE: erst nach Pausen-Priorität (hier pausenstatus, wir haben kein sort dafür,
  //    also überspringen wir stattdessen direkt die Zeit-Sortierung)
  pause
    .sort((a, b) => {
      const statusOrder = [
        2,
        1,
        61,
      ];
      const trA = trupps.find((t) => t.name === a.el.dataset.key);
      const trB = trupps.find((t) => t.name === b.el.dataset.key);
      const ordA = statusOrder.indexOf(trA.status);
      const ordB = statusOrder.indexOf(trB.status);
      if (ordA !== ordB) return ordA - ordB;
      // gleiche Gruppe → längste Pausenzeit zuerst
      return (trB.pausenzeit || 0) - (trA.pausenzeit || 0);
    })
    .forEach((t) => pauseContainer.appendChild(t.el));

  // 3) NICHT EINSATZBEREIT: weiter unverändert, nach Pausenzeit
  nicht
    .sort((a, b) => {
      const pA =
        trupps.find((t) => t.name === a.el.dataset.key).pausenzeit || 0;
      const pB =
        trupps.find((t) => t.name === b.el.dataset.key).pausenzeit || 0;
      return pB - pA;
    })
    .forEach((t) => nichtContainer.appendChild(t.el));

// am Ende von renderTrupps(), kurz vor dem schließenden '}':

// 1) Scroll zurücksetzen
window.scrollTo(0, scrollY);

// 2) FLIP: First
const cards = Array.from(document.querySelectorAll(".trupp"));
const newRects = new Map();
cards.forEach(el => {
  newRects.set(el.dataset.key, el.getBoundingClientRect());
});

// 3) Invert + Play
cards.forEach(el => {
  const key = el.dataset.key;
  const oldRect = prevRects.get(key);
  const newRect = newRects.get(key);
  if (!oldRect || !newRect) return;

  const dx = oldRect.left - newRect.left;
  const dy = oldRect.top  - newRect.top;
  if (dx === 0 && dy === 0) return;

  // a) Übergang abschalten und sofort in alte Position versetzen
  el.style.transition = "none";
  el.style.transform  = `translate(${dx}px, ${dy}px)`;
  el.style.willChange = "transform";

  // b) Im nächsten Frame Übergang aktivieren und Transform zurücksetzen
  requestAnimationFrame(() => {
    el.style.transition = "transform 0.4s ease";
    el.style.transform  = "";
    // c) Cleanup nach Ende der Transition
    el.addEventListener("transitionend", function cleanup() {
      el.style.transition = el.style.transform = el.style.willChange = "";
      el.removeEventListener("transitionend", cleanup);
    });
  });
});
}

// Kontextmenü anzeigen - verbesserte Version
function showTruppContextMenu(event, truppIndex, patientId) {
  
  // Entferne existierendes Menü
  hideTruppContextMenu();

  const menu = document.createElement('ul');
  menu.id = 'truppContextMenu';
  menu.className = 'context-menu';
  
  // Patientenspezifische Optionen nur anzeigen wenn Patient zugewiesen
  const hasPatient = patientId && [3, 4, 7, 8].includes(trupps[truppIndex].status);
  
  let menuHTML = '';
  
  if (hasPatient) {
    menuHTML += `
      <li><button onclick="transportPatient(${patientId}); hideTruppContextMenu()">Transport in KH</button></li>
      <li><button onclick="dischargePatient(${patientId}); hideTruppContextMenu()">Entlassen</button></li>
      <li class="context-menu-separator"></li>
      <li><button onclick="promptAddEntry(${patientId}); hideTruppContextMenu()">Eintrag hinzufügen</button></li>
      <li><button onclick="openEditModal(${patientId}); hideTruppContextMenu()">Patientendaten bearbeiten</button></li>
      <li class="context-menu-separator"></li>
      <li><button onclick="openTruppAssignmentModal(${patientId}); hideTruppContextMenu()">Trupp disponieren</button></li>
      <li><button onclick="openRtmModal(${patientId}); hideTruppContextMenu()">RTM disponieren</button></li>
      <li class="context-menu-separator"></li>`;
  }
  
  // Name ändern immer verfügbar
  menuHTML += `<li><button onclick="openTruppNameChangeModal(${truppIndex}); hideTruppContextMenu()">Name ändern</button></li>`;
  
  menu.innerHTML = menuHTML;

  // Position berechnen
  const x = event.clientX;
  const y = event.clientY;
  
  document.body.appendChild(menu);
  
  // Menü sichtbar machen
  menu.style.display = 'block';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  // Sicherstellen, dass das Menü im Viewport bleibt
  const rect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (rect.right > viewportWidth) {
    menu.style.left = (x - rect.width) + 'px';
  }
  if (rect.bottom > viewportHeight) {
    menu.style.top = (y - rect.height) + 'px';
  }

  // Klick außerhalb schließt das Menü
  setTimeout(() => {
    document.addEventListener('click', hideTruppContextMenu, { once: true });
    document.addEventListener('contextmenu', hideTruppContextMenu, { once: true });
  }, 100);
}

function hideTruppContextMenu() {
  const menu = document.getElementById('truppContextMenu');
  if (menu) {
    menu.remove();
  }
}

function openTruppAssignmentModal(patientId) {
  // Verwende die neue Trupp-Assignment-Modal statt RTM-Modal
  showTruppAssignmentModal(patientId);
}

// Neue Funktion für Trupp-Assignment Modal
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
              return `<option value="${trupp.name}">${trupp.name} (${statusDef.text})</option>`;
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

function openTruppNameChangeModal(truppIndex) {
  const trupp = trupps[truppIndex];
  if (!trupp) return;
  
  const newName = prompt("Neuen Trupp-Namen eingeben:", trupp.name);
  if (newName && newName.trim() && newName.trim() !== trupp.name) {
    const oldName = trupp.name;
    trupp.name = newName.trim();
    
    // Update patients that reference this trupp
    const patients = JSON.parse(localStorage.getItem("patients") || "[]");
    let patientsUpdated = false;
    
    patients.forEach(patient => {
      if (Array.isArray(patient.team)) {
        const index = patient.team.indexOf(oldName);
        if (index !== -1) {
          patient.team[index] = trupp.name;
          if (!patient.history) patient.history = [];
          const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          patient.history.push(`${timeStr} Trupp umbenannt: ${oldName} → ${trupp.name}`);
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
    
    saveTrupps();
    renderTrupps();
  }
}