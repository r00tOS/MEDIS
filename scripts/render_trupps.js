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
  document.querySelectorAll(".trupp-row").forEach((el) => {
    if (el.dataset.key)
      prevRects.set(el.dataset.key, el.getBoundingClientRect());
  });

  // Clear containers and prepare data
  einsatzContainer.innerHTML = pauseContainer.innerHTML = nichtContainer.innerHTML = "";
  const einsatz = [], pause = [], nicht = [];

  trupps.forEach((trupp, i) => {
    if (!trupp.id)
      trupp.id = "trupp_" + Math.random().toString(36).substring(2, 10);
    
    const statusDefs = window.statusOptions;
    const currentDef = statusDefs.find(o => o.status === trupp.status) || statusDefs[0];
    const opt = window.statusOptions.find(o => o.status === trupp.status);
    
    const einsatzzeit = trupp.einsatzzeit || 0;
    let pausenzeit = trupp.pausenzeit || 0;
    let totalPause = trupp.totalPauseTime || 0;

    const min = (ms) => Math.floor(ms / 60000);
    const timeDisplay = trupp.currentEinsatzStart && trupp.status !== 61
        ? `${min(einsatzzeit)} Min`
        : `${min(pausenzeit)} Min`;

    const progress = trupp.currentEinsatzStart && trupp.status !== 61
        ? Math.min(einsatzzeit / (nextMaxEinsatzTime * 60000), 1)
        : 0;

    const isU18 = u18List.includes(trupp.name);
    const isOpen = trupp.id === openId;

    // Create table row
    const row = document.createElement("tr");
    row.className = "trupp-row";
    row.dataset.key = trupp.name;
    row.dataset.truppId = trupp.id;
    row.dataset.truppIndex = i;

    // Add status classes for styling
    if (trupp.currentEinsatzStart && einsatzzeit > nextMaxEinsatzTime * 60000) row.classList.add("ueberzogen");
    if (trupp.status === 61) row.classList.add("rueckhaltung");
    if (trupp.status === 12) row.classList.add("spielfeldrand");
    if ([3, 4, 7, 8].includes(trupp.status)) row.classList.add("patient");
    
    if ([11, 12, 0].includes(trupp.status)) {
      row.classList.add("einsatz");
      if (trupp.status === 0) row.classList.add("einsatz-beendet");
    } else if ([1, 2, 61].includes(trupp.status)) {
      row.classList.add("pause");
    } else {
      row.classList.add("nicht-einsatzbereit");
    }

    // Patient information
    let patientInfo = '';
    if ([3, 4, 7, 8].includes(trupp.status) && trupp.patientInput) {
      const patients = JSON.parse(localStorage.getItem("patients")) || [];
      const patient = patients.find(p => p.id === trupp.patientInput);
      if (patient) {
        // Update disposition status
        const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
        const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
        if (typeof updatePatientDispositionStatus === 'function') {
          updatePatientDispositionStatus(patient, trupps, rtms);
        }

        // Generate disposition symbols - Simplified version without frame and title
        let dispositionSymbols = '';
        if (patient.suggestedResources && Array.isArray(patient.suggestedResources) && patient.suggestedResources.length > 0) {
          dispositionSymbols = '<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">';
          
          patient.suggestedResources.forEach(resource => {
            const abbrev = getResourceAbbreviation(resource);
            
            if (!patient.dispositionStatus) {
              patient.dispositionStatus = {};
            }
            
            const isDispatched = patient.dispositionStatus[resource] === 'dispatched';
            const isIgnored = patient.dispositionStatus[resource + '_ignored'] === true;
            
            // CSS-Klassen mit Priorität: dispatched überschreibt alles
            let cssClass = 'disposition-symbol ';
            if (isDispatched) {
              // Dispatched hat höchste Priorität - alle anderen Klassen werden überschrieben
              cssClass += 'dispatched';
            } else if (isIgnored) {
              cssClass += 'ignored';
            } else {
              cssClass += 'required';
            }
            
            dispositionSymbols += '<span class="' + cssClass + '"' +
                   ' onclick="toggleDispositionStatus(' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')"' +
                   ' oncontextmenu="toggleDispositionIgnore(event, ' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')"' +
                   ' title="' + resource + '">' +
                   abbrev + '</span>';
          });
          
          dispositionSymbols += '</div>';
        }

        patientInfo = `
          <div class="patient-info">
            <strong>Patient ${patient.id}</strong>
            <small>${patient.age || "–"} | ${patient.gender || "–"} | ${patient.diagnosis || "–"} | ${patient.location || "–"}</small>
            ${dispositionSymbols}
          </div>
        `;
      }
    }

    // Build row HTML
    row.innerHTML = `
      <td class="trupp-name ${isU18 ? 'u18' : ''}">
        <strong>${trupp.name}</strong>
        ${isU18 ? '<span class="badge-u18">U18</span>' : ''}
      </td>
      <td class="status-cell">
        <div class="status-dropdown">
          <button class="status-toggle" onclick="toggleStatusDropdown('${trupp.id}', event)">
            <span class="status-code" style="background: ${currentDef.color}; border: 1px solid ${currentDef.color};">
              ${currentDef.status}
            </span>
            ${currentDef.text} ▾
          </button>
          <ul class="status-menu" id="status-menu-${trupp.id}">
            ${window.getAvailableStatusTransitions(trupp.status).map(o => `
              <li class="${o.status === currentDef.status ? 'active' : ''}" onclick="onStatusSelected(${i}, ${o.status}, '${trupp.id}')">
                <span class="status-code" style="background: ${o.color}; border: 1px solid ${o.color};">
                  ${o.status}
                </span>
                ${o.text}
              </li>
            `).join('')}
          </ul>
        </div>
      </td>
      <td class="location-patient-cell">
        ${trupp.status === 11 ? 
          `<div style="display: flex; align-items: center; gap: 8px;">
             <strong>${trupp.currentOrt || "kein Einsatzort"}</strong> 
             <button onclick="editOrt(${i})" class="edit-btn">✎</button>
           </div>` : 
          [3, 4, 7, 8].includes(trupp.status) && patientInfo ? 
            patientInfo : '–'}
      </td>
      <td class="time-cell">
        <div class="time-display">${timeDisplay}</div>
        ${trupp.currentEinsatzStart && trupp.status !== 61 ? 
          `<div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.floor(progress * 100)}%" data-progress="${Math.floor(progress * 10)}"></div>
           </div>` : ''}
        <small>Gesamt Pause: ${min(totalPause)} Min</small>
      </td>
    `;

    // Add context menu
    setTimeout(() => {
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTruppContextMenu(e, i, trupp.patientInput);
      });
    }, 10);

    // Sorting logic
    const einsatzSort = 
      trupp.status === 12 ? 99 : 
      [3, 4, 7, 8].includes(trupp.status) ? 2 : 
      trupp.status === 0 ? 1 : 0;

    if ([11, 3, 12, 0, 4, 7, 8].includes(trupp.status)) {
      einsatz.push({ el: row, sort: einsatzSort });
    } else if ([2, 1].includes(trupp.status)) {
      pause.push({ el: row, sort: pausenzeit });
    } else if (trupp.status === 61) {
      pause.push({ el: row, sort: -1 });
    } else {
      nicht.push({ el: row, sort: pausenzeit });
    }
  });

  // Create single table with sections
  function createSingleTable() {
    return `
      <table class="trupps-table">
        <thead>
          <tr>
            <th>Trupp</th>
            <th>Status</th>
            <th>Einsatzort/Patient</th>
            <th>Zeit</th>
          </tr>
        </thead>
        <tbody id="trupps-table-body"></tbody>
      </table>
    `;
  }

  // Only create table in the first container, hide others
  einsatzContainer.innerHTML = createSingleTable();
  pauseContainer.style.display = 'none';
  nichtContainer.style.display = 'none';
  
  const tableBody = document.getElementById('trupps-table-body');

  // Add section header function
  function addSectionHeader(title, count) {
    const headerRow = document.createElement('tr');
    headerRow.className = 'section-header-row';
    headerRow.innerHTML = `
      <td colspan="4" class="section-header">
        <h3>${title} (${count})</h3>
      </td>
    `;
    return headerRow;
  }

  // Sort and append rows with section headers
  if (einsatz.length > 0) {
    tableBody.appendChild(addSectionHeader('Im Einsatz', einsatz.length));
    einsatz.sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      const tA = trupps.find((t) => t.name === a.el.dataset.key).einsatzzeit || 0;
      const tB = trupps.find((t) => t.name === b.el.dataset.key).einsatzzeit || 0;
      return tB - tA;
    }).forEach((t) => tableBody.appendChild(t.el));
  }

  if (pause.length > 0) {
    tableBody.appendChild(addSectionHeader('In Pause', pause.length));
    pause.sort((a, b) => {
      const statusOrder = [2, 1, 61];
      const trA = trupps.find((t) => t.name === a.el.dataset.key);
      const trB = trupps.find((t) => t.name === b.el.dataset.key);
      const ordA = statusOrder.indexOf(trA.status);
      const ordB = statusOrder.indexOf(trB.status);
      if (ordA !== ordB) return ordA - ordB;
      return (trB.pausenzeit || 0) - (trA.pausenzeit || 0);
    }).forEach((t) => tableBody.appendChild(t.el));
  }

  if (nicht.length > 0) {
    tableBody.appendChild(addSectionHeader('Nicht Einsatzbereit', nicht.length));
    nicht.sort((a, b) => {
      const pA = trupps.find((t) => t.name === a.el.dataset.key).pausenzeit || 0;
      const pB = trupps.find((t) => t.name === b.el.dataset.key).pausenzeit || 0;
      return pB - pA;
    }).forEach((t) => tableBody.appendChild(t.el));
  }

  // Reopen status menu if it was open before page reload
  if (openId) {
    setTimeout(() => {
      const truppRow = document.querySelector(`.trupp-row[data-trupp-id="${openId}"]`);
      const menu = document.getElementById(`status-menu-${openId}`);
      const button = truppRow?.querySelector('.status-toggle');
      
      if (menu && button) {
        // Position the menu relative to the button
        const buttonRect = button.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Show menu temporarily to measure its dimensions
        menu.style.visibility = 'hidden';
        menu.classList.add('open');
        const menuRect = menu.getBoundingClientRect();
        menu.classList.remove('open');
        menu.style.visibility = 'visible';
        
        // Calculate position
        let top = buttonRect.bottom + 2;
        let left = buttonRect.left;
        
        // Adjust position if menu would go off-screen vertically
        if (top + menuRect.height > viewportHeight - 10) {
          // Show above button instead
          top = buttonRect.top - menuRect.height - 2;
          
          // If still not enough space above, keep it below but move it up
          if (top < 10) {
            top = Math.max(10, viewportHeight - menuRect.height - 10);
          }
        }
        
        // Adjust horizontal position if needed
        if (left + menuRect.width > viewportWidth - 10) {
          left = viewportWidth - menuRect.width - 10;
        }
        
        // Ensure minimum margins
        left = Math.max(10, left);
        top = Math.max(10, top);
        
        // Apply positioning and open the menu
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
        menu.style.minWidth = buttonRect.width + 'px';
        menu.classList.add('open');
      }
    }, 50);
  }

  // Restore scroll and FLIP animation
  window.scrollTo(0, scrollY);

  const rows = Array.from(document.querySelectorAll(".trupp-row"));
  const newRects = new Map();
  rows.forEach(el => {
    newRects.set(el.dataset.key, el.getBoundingClientRect());
  });

  rows.forEach(el => {
    const key = el.dataset.key;
    const oldRect = prevRects.get(key);
    const newRect = newRects.get(key);
    if (!oldRect || !newRect) return;

    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;
    if (dx === 0 && dy === 0) return;

    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.willChange = "transform";

    requestAnimationFrame(() => {
      el.style.transition = "transform 0.4s ease";
      el.style.transform = "";
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
      <div class="menu-group">
        <div class="menu-group-title">Patientenmanagement</div>
        <li>
          <button class="primary" onclick="transportPatient(${patientId}); hideTruppContextMenu()">
            <span class="icon">🚑</span>Transport in KH
          </button>
        </li>
        <li>
          <button class="success" onclick="dischargePatient(${patientId}); hideTruppContextMenu()">
            <span class="icon">✅</span>Entlassen
          </button>
        </li>
      </div>
      
      <div class="menu-group">
        <div class="menu-group-title">Dokumentation</div>
        <li>
          <button onclick="promptAddEntry(${patientId}); hideTruppContextMenu()">
            <span class="icon">📝</span>Eintrag hinzufügen
          </button>
        </li>
        <li>
          <button onclick="openEditModal(${patientId}); hideTruppContextMenu()">
            <span class="icon">✏️</span>Patientendaten bearbeiten
          </button>
        </li>
        ${![61, 1].includes(trupps[truppIndex].status) ? 
          `<li>
            <button onclick="copyToClipboard('${trupps[truppIndex].name}'); hideTruppContextMenu()">
              <span class="icon">📋</span>Meldung kopieren
            </button>
          </li>` : ''}
        <li>
          <button onclick="showTruppHistorie(${truppIndex}); hideTruppContextMenu()">
            <span class="icon">📊</span>Historie anzeigen
          </button>
        </li>
      </div>
      
      <div class="menu-group">
        <div class="menu-group-title">Ressourcen</div>
        <li>
          <button onclick="openTruppAssignmentModal(${patientId}); hideTruppContextMenu()">
            <span class="icon">👥</span>Trupp disponieren
          </button>
        </li>
        <li>
          <button onclick="openRtmModal(${patientId}); hideTruppContextMenu()">
            <span class="icon">🚗</span>RTM disponieren
          </button>
        </li>
        <li>
          <button class="warning" onclick="releaseTruppFromAssignment('${trupps[truppIndex].name}', ${patientId}); hideTruppContextMenu()">
            <span class="icon">⚠️</span>Einheit aus Einsatz entlassen
          </button>
        </li>
      </div>`;
  } else {
    // Wenn kein Patient zugewiesen, nur Dokumentation mit Meldung kopieren
    if (![61, 1].includes(trupps[truppIndex].status)) {
      menuHTML += `
        <div class="menu-group">
          <div class="menu-group-title">Dokumentation</div>
          <li>
            <button onclick="copyToClipboard('${trupps[truppIndex].name}'); hideTruppContextMenu()">
              <span class="icon">📋</span>Meldung kopieren
            </button>
          </li>
          <li>
            <button onclick="showTruppHistorie(${truppIndex}); hideTruppContextMenu()">
              <span class="icon">📊</span>Historie anzeigen
            </button>
          </li>
        </div>`;
    } else {
      // Auch bei Status 61/1 Historie verfügbar machen
      menuHTML += `
        <div class="menu-group">
          <div class="menu-group-title">Dokumentation</div>
          <li>
            <button onclick="showTruppHistorie(${truppIndex}); hideTruppContextMenu()">
              <span class="icon">📊</span>Historie anzeigen
            </button>
          </li>
        </div>`;
    }
  }
  
  // Name ändern und Löschen immer verfügbar
  menuHTML += `
    <div class="menu-group">
      <div class="menu-group-title">Einstellungen</div>
      <li>
        <button onclick="openTruppNameChangeModal(${truppIndex}); hideTruppContextMenu()">
          <span class="icon">🔄</span>Name ändern
        </button>
      </li>
      <li>
        <button class="danger" onclick="deleteTrupp(${truppIndex}); hideTruppContextMenu()">
          <span class="icon">🗑️</span>Trupp löschen
        </button>
      </li>
    </div>`;
  
  menu.innerHTML = menuHTML;

  // Menü direkt sichtbar hinzufügen
  menu.style.position = 'fixed';
  menu.style.zIndex = '10000';
  menu.style.display = 'block';
  document.body.appendChild(menu);
  
  // Position berechnen - einfache Logik
  let x = event.clientX + 10;
  let y = event.clientY + 10;
  
  // Nach dem Hinzufügen zum DOM die Größe messen
  const menuRect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Horizontal positioning - bei Überlauf nach links verschieben
  if (x + menuRect.width > viewportWidth - 10) {
    x = event.clientX - menuRect.width - 10;
  }
  
  // Vertical positioning - bei Überlauf nach oben verschieben
  if (y + menuRect.height > viewportHeight - 10) {
    y = event.clientY - menuRect.height - 10;
  }
  
  // Mindestabstände einhalten
  x = Math.max(10, x);
  y = Math.max(10, y);
  
  // Position setzen
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  // Animation hinzufügen
  menu.style.opacity = '0';
  menu.style.transform = 'scale(0.95)';
  menu.style.transition = 'opacity 0.1s ease, transform 0.1s ease';
  
  requestAnimationFrame(() => {
    menu.style.opacity = '1';
    menu.style.transform = 'scale(1)';
  });

  // Event-Handler für Klick außerhalb des Menüs
  const outsideClickHandler = function(e) {
    if (!e.target.closest('#truppContextMenu')) {
      hideTruppContextMenu();
      document.removeEventListener('click', outsideClickHandler);
      document.removeEventListener('contextmenu', outsideClickHandler);
    }
  };

  // Event-Handler nach kurzer Verzögerung hinzufügen um zu verhindern, 
  // dass das aktuelle Klick-Event das Menü sofort wieder schließt
  setTimeout(() => {
    document.addEventListener('click', outsideClickHandler);
    document.addEventListener('contextmenu', outsideClickHandler);
  }, 100);

  // ESC-Taste schließt das Menü
  const escHandler = function(e) {
    if (e.key === 'Escape') {
      hideTruppContextMenu();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Verbesserte Version der hideContextMenu Funktion
function hideTruppContextMenu() {
  const menu = document.getElementById('truppContextMenu');
  if (menu) {
    // Animation beim schließen
    menu.style.opacity = '0';
    menu.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      menu.remove();
    }, 100);
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

  // Patient-Historie aktualisieren
  addHistoryEvent(patient, "assignedTrupp", selectedTrupp);

  // Status auf "disponiert" setzen, falls noch "gemeldet"
  if (patient.status === "gemeldet") {
    patient.status = "disponiert";
    addHistoryEvent(patient, "status", "disponiert");
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
    addHistoryEvent(trupp, "status", 3);

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
  
  // Disposition-Update auslösen
  if (typeof triggerDispositionUpdate === 'function') {
    triggerDispositionUpdate();
  }
  
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
          addHistoryEvent(patient, "rename", { oldName, newName: trupp.name });
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

function renderDispositionSymbols(patient) {
    console.log('Rendering disposition symbols for patient:', patient.id);
    console.log('Patient disposition status:', patient.dispositionStatus);
    
    if (!patient.suggestedResources || !Array.isArray(patient.suggestedResources)) {
        return '';
    }

    // ZENTRALE DISPOSITION UPDATE LOGIK - führt zur Endlosschleife, ist aber gewünscht
    const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
    const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
    updatePatientDispositionStatus(patient, trupps, rtms);

    let symbolsHtml = '';
    patient.suggestedResources.forEach(resource => {
        const abbrev = getResourceAbbreviation(resource);
        const isDispatched = patient.dispositionStatus && patient.dispositionStatus[resource] === 'dispatched';
        const isIgnored = patient.dispositionStatus && patient.dispositionStatus[resource + '_ignored'] === true;
        
        console.log(`Resource: ${resource}, isDispatched: ${isDispatched}, isIgnored: ${isIgnored}`);
        
        let cssClass = 'disposition-symbol ' + (isDispatched ? 'dispatched' : 'required');
        if (isIgnored) {
            cssClass += ' ignored';
        }
        
        console.log('Applied CSS class:', cssClass);
        
        symbolsHtml += '<span class="' + cssClass + '"' +
                      ' onclick="toggleDispositionStatus(' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')"' +
                      ' oncontextmenu="toggleDispositionIgnore(event, ' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')"' +
                      ' title="' + resource + '">' +
                      abbrev + '</span>';
    });

    return symbolsHtml;
}

// Enhanced status dropdown toggle function
function toggleStatusDropdown(truppId, event) {
  console.log('toggleStatusDropdown called:', truppId, event);
  
  // Close all other open dropdowns first
  document.querySelectorAll('.status-menu.open').forEach(menu => {
    if (menu.id !== `status-menu-${truppId}`) {
      menu.classList.remove('open');
    }
  });

  const menu = document.getElementById(`status-menu-${truppId}`);
  const button = event.target.closest('.status-toggle');
  
  console.log('Menu found:', menu);
  console.log('Button found:', button);
  console.log('Menu has open class:', menu?.classList.contains('open'));
  
  if (!menu || !button) {
    console.warn('Menu or button not found for trupp:', truppId);
    return;
  }
  
  if (menu.classList.contains('open')) {
    console.log('Closing menu');
    menu.classList.remove('open');
    localStorage.removeItem("openTruppId");
    // Clear any inline styles that might interfere
    menu.style.display = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.minWidth = '';
    menu.style.visibility = '';
  } else {
    console.log('Opening menu');
    // Position the menu relative to the button
    const buttonRect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate initial position
    let top = buttonRect.bottom + 2;
    let left = buttonRect.left;
    
    // Show menu temporarily to measure its dimensions
    menu.style.visibility = 'hidden';
    menu.classList.add('open');
    const menuRect = menu.getBoundingClientRect();
    menu.classList.remove('open');
    menu.style.visibility = 'visible';
    
    // Adjust position if menu would go off-screen vertically
    if (top + menuRect.height > viewportHeight - 10) {
      // Show above button instead
      top = buttonRect.top - menuRect.height - 2;
      
      // If still not enough space above, keep it below but move it up
      if (top < 10) {
        top = Math.max(10, viewportHeight - menuRect.height - 10);
      }
    }
    
    // Adjust horizontal position if needed
    if (left + menuRect.width > viewportWidth - 10) {
      left = viewportWidth - menuRect.width - 10;
    }
    
    // Ensure minimum margins
    left = Math.max(10, left);
    top = Math.max(10, top);
    
    // Apply positioning
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.style.minWidth = buttonRect.width + 'px';
    
    // Make the menu visible by adding the open class
    menu.classList.add('open');
    localStorage.setItem("openTruppId", truppId);
    
    console.log('Menu positioned at:', top, left);
    console.log('Menu now has open class:', menu.classList.contains('open'));
  }
}

// Update onStatusSelected to close dropdown - define immediately
function onStatusSelected(truppIndex, newStatus, truppId) {
  console.log('onStatusSelected called:', truppIndex, newStatus, truppId);
  
  // Close the dropdown
  const menu = document.getElementById(`status-menu-${truppId}`);
  if (menu) {
    menu.classList.remove('open');
  }
  localStorage.removeItem("openTruppId");
  
  // Call the original updateTrupp function from logic_trupp.js
  if (typeof updateTrupp === 'function') {
    updateTrupp(truppIndex, newStatus);
  } else {
    console.warn('updateTrupp function not found');
  }
}

// Make functions available globally immediately
window.toggleStatusDropdown = toggleStatusDropdown;
window.onStatusSelected = onStatusSelected;

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.status-dropdown')) {
    document.querySelectorAll('.status-menu.open').forEach(menu => {
      menu.classList.remove('open');
    });
    localStorage.removeItem("openTruppId");
  }
});

// Neue Funktion für Historie-Modal
function showTruppHistorie(truppIndex) {
  const trupp = trupps[truppIndex];
  if (!trupp) return;
  
  // Modal HTML erstellen
  const modalHTML = generateHistoryModalHTML(trupp, 'trupp');

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeTruppHistorieModal() {
  const modal = document.getElementById('truppHistorieModal');
  if (modal) {
    modal.remove();
  }
}