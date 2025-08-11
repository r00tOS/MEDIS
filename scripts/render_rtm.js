function renderRTMs() {
  // Sicherheitsprüfung: rtms muss verfügbar sein
  if (typeof rtms === 'undefined' || !Array.isArray(rtms)) {
    return;
  }
  
  const scrollY = window.scrollY;
  const now = Date.now();
  const openId = localStorage.getItem("openRTMId");

  const prevRects = new Map();
  document.querySelectorAll(".rtm-row").forEach((el) => {
    if (el.dataset.key)
      prevRects.set(el.dataset.key, el.getBoundingClientRect());
  });

  // Clear containers and prepare data
  einsatzContainer.innerHTML = pauseContainer.innerHTML = nichtContainer.innerHTML = "";
  const einsatz = [], pause = [], nicht = [];

  rtms.forEach((rtm, i) => {
    if (!rtm.id)
      rtm.id = "rtm_" + Math.random().toString(36).substring(2, 10);
    
    const statusDefs = window.statusOptions;
    const currentDef = statusDefs.find(o => o.status === rtm.status) || statusDefs[0];
    const opt = window.statusOptions.find(o => o.status === rtm.status);
    
    const einsatzzeit = rtm.einsatzzeit || 0;
    let pausenzeit = rtm.pausenzeit || 0;
    let totalPause = rtm.totalPauseTime || 0;

    const min = (ms) => Math.floor(ms / 60000);
    const timeDisplay = rtm.currentEinsatzStart && rtm.status !== 61
        ? `${min(einsatzzeit)} Min`
        : `${min(pausenzeit)} Min`;

    const progress = rtm.currentEinsatzStart && rtm.status !== 61
        ? Math.min(einsatzzeit / (nextMaxEinsatzTime * 60000), 1)
        : 0;

    const isOpen = rtm.id === openId;

    // Create table row
    const row = document.createElement("tr");
    row.className = "rtm-row";
    row.dataset.key = rtm.name;
    row.dataset.rtmId = rtm.id;
    row.dataset.rtmIndex = i;

    // Add status classes for styling
    if (rtm.currentEinsatzStart && einsatzzeit > nextMaxEinsatzTime * 60000) row.classList.add("ueberzogen");
    if (rtm.status === 61) row.classList.add("rueckhaltung");
    if (rtm.status === 12) row.classList.add("spielfeldrand");
    if ([3, 4, 7, 8].includes(rtm.status)) row.classList.add("patient");
    
    if ([11, 12, 0].includes(rtm.status)) {
      row.classList.add("einsatz");
      if (rtm.status === 0) row.classList.add("einsatz-beendet");
    } else if ([1, 2, 61].includes(rtm.status)) {
      row.classList.add("pause");
    } else {
      row.classList.add("nicht-einsatzbereit");
    }

    // Patient information
    let patientInfo = '';
    if ([3, 4, 7, 8].includes(rtm.status) && rtm.patientInput) {
      const patients = JSON.parse(localStorage.getItem("patients")) || [];
      const patient = patients.find(p => p.id === rtm.patientInput || p.id === String(rtm.patientInput));
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
      } else {
        patientInfo = `<div style="color: #f00; font-style: italic;">Patient nicht gefunden (ID: ${rtm.patientInput})</div>`;
      }
    }

    // Build row HTML
    row.innerHTML = `
      <td class="rtm-name">
        <strong>${rtm.name}</strong>
        ${rtm.status === 6 ? `<button class="delete-btn" onclick="deleteRTM(${i})">×</button>` : ''}
      </td>
      <td class="status-cell">
        <div class="status-dropdown">
          <button class="status-toggle" onclick="toggleRTMStatusDropdown('${rtm.id}')">
            <span class="status-code" style="background: ${currentDef.color}; border: 1px solid ${currentDef.color};">
              ${currentDef.status}
            </span>
            ${currentDef.text} ▾
          </button>
          <ul class="status-menu${rtm.id === openId ? ' open' : ''}">
            ${statusDefs.map(o => `
              <li class="${o.status === currentDef.status ? 'active' : ''}" onclick="onRTMStatusSelected(${i}, ${o.status}, '${rtm.id}')">
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
        ${rtm.status === 11 ? 
          `<div style="display: flex; align-items: center; gap: 8px;">
             <strong>${rtm.currentOrt || "kein Einsatzort"}</strong> 
             <button onclick="editOrt(${i})" class="edit-btn">✎</button>
           </div>` : 
          [3, 4, 7, 8].includes(rtm.status) && patientInfo ? 
            patientInfo : '–'}
      </td>
      <td class="time-cell">
        <div class="time-display">${timeDisplay}</div>
        ${rtm.currentEinsatzStart && rtm.status !== 61 ? 
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
        showRTMContextMenu(e, i, rtm.patientInput);
      });
    }, 10);

    // Sorting logic
    const einsatzSort = 
      rtm.status === 12 ? 99 : 
      [3, 4, 7, 8].includes(rtm.status) ? 2 : 
      rtm.status === 0 ? 1 : 0;

    if ([11, 3, 12, 0, 4, 7, 8].includes(rtm.status)) {
      einsatz.push({ el: row, sort: einsatzSort });
    } else if ([2, 1].includes(rtm.status)) {
      pause.push({ el: row, sort: pausenzeit });
    } else if (rtm.status === 61) {
      pause.push({ el: row, sort: -1 });
    } else {
      nicht.push({ el: row, sort: pausenzeit });
    }
  });

  // Create tables for each section
  function createTable(container, title) {
    container.innerHTML = `
      <table class="rtms-table">
        <thead>
          <tr>
            <th>RTM</th>
            <th>Status</th>
            <th>Einsatzort/Patient</th>
            <th>Zeit</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    return container.querySelector('tbody');
  }

  const einsatzTable = createTable(einsatzContainer, 'Im Einsatz');
  const pauseTable = createTable(pauseContainer, 'In Pause');
  const nichtTable = createTable(nichtContainer, 'Nicht Einsatzbereit');

  // Sort and append rows
  einsatz.sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    const tA = rtms.find((t) => t.name === a.el.dataset.key).einsatzzeit || 0;
    const tB = rtms.find((t) => t.name === b.el.dataset.key).einsatzzeit || 0;
    return tB - tA;
  }).forEach((t) => einsatzTable.appendChild(t.el));

  pause.sort((a, b) => {
    const statusOrder = [2, 1, 61];
    const trA = rtms.find((t) => t.name === a.el.dataset.key);
    const trB = rtms.find((t) => t.name === b.el.dataset.key);
    const ordA = statusOrder.indexOf(trA.status);
    const ordB = statusOrder.indexOf(trB.status);
    if (ordA !== ordB) return ordA - ordB;
    return (trB.pausenzeit || 0) - (trA.pausenzeit || 0);
  }).forEach((t) => pauseTable.appendChild(t.el));

  nicht.sort((a, b) => {
    const pA = rtms.find((t) => t.name === a.el.dataset.key).pausenzeit || 0;
    const pB = rtms.find((t) => t.name === b.el.dataset.key).pausenzeit || 0;
    return pB - pA;
  }).forEach((t) => nichtTable.appendChild(t.el));

  // Restore scroll and FLIP animation
  window.scrollTo(0, scrollY);

  const rows = Array.from(document.querySelectorAll(".rtm-row"));
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
function showRTMContextMenu(event, rtmIndex, patientId) {
  const existingMenu = document.getElementById('rtmContextMenu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const menu = document.createElement('ul');
  menu.id = 'rtmContextMenu';
  menu.className = 'context-menu';
  
  // Patientenspezifische Optionen nur anzeigen wenn Patient zugewiesen
  const hasPatient = patientId && [3, 4, 7, 8].includes(rtms[rtmIndex].status);
  
  let menuHTML = '';
  
  if (hasPatient) {
    menuHTML += `
      <div class="menu-group">
        <div class="menu-group-title">Patientenmanagement</div>
        <li>
          <button class="primary" onclick="transportPatient(${patientId}); hideRTMContextMenu()">
            <span class="icon">🚑</span>Transport in KH
          </button>
        </li>
        <li>
          <button class="success" onclick="dischargePatient(${patientId}); hideRTMContextMenu()">
            <span class="icon">✅</span>Entlassen
          </button>
        </li>
      </div>
      
      <div class="menu-group">
        <div class="menu-group-title">Dokumentation</div>
        <li>
          <button onclick="promptAddEntry(${patientId}); hideRTMContextMenu()">
            <span class="icon">📝</span>Eintrag hinzufügen
          </button>
        </li>
        <li>
          <button onclick="openEditModal(${patientId}); hideRTMContextMenu()">
            <span class="icon">✏️</span>Patientendaten bearbeiten
          </button>
        </li>
        ${![61, 1].includes(rtms[rtmIndex].status) ? 
          `<li>
            <button onclick="copyToClipboard('${rtms[rtmIndex].name}', 'rtm'); hideRTMContextMenu()">
              <span class="icon">📋</span>Meldung kopieren
            </button>
          </li>` : ''}
        <li>
          <button onclick="showRTMHistorie(${rtmIndex}); hideRTMContextMenu()">
            <span class="icon">📊</span>Historie anzeigen
          </button>
        </li>
      </div>
      
      <div class="menu-group">
        <div class="menu-group-title">Ressourcen</div>
        <li>
          <button onclick="openTruppAssignmentModalForRTM(${patientId}); hideRTMContextMenu()">
            <span class="icon">👥</span>Trupp disponieren
          </button>
        </li>
        <li>
          <button onclick="openRtmModal(${patientId}); hideRTMContextMenu()">
            <span class="icon">🚗</span>RTM disponieren
          </button>
        </li>
        <li>
          <button class="warning" onclick="releaseRtmFromAssignment('${rtms[rtmIndex].name}', ${patientId}); hideRTMContextMenu()">
            <span class="icon">⚠️</span>Einheit aus Einsatz entlassen
          </button>
        </li>
      </div>`;
  } else {
    // Wenn kein Patient zugewiesen, nur Dokumentation mit Meldung kopieren
    if (![61, 1].includes(rtms[rtmIndex].status)) {
      menuHTML += `
        <div class="menu-group">
          <div class="menu-group-title">Dokumentation</div>
          <li>
            <button onclick="copyToClipboard('${rtms[rtmIndex].name}', 'rtm'); hideRTMContextMenu()">
              <span class="icon">📋</span>Meldung kopieren
            </button>
          </li>
          <li>
            <button onclick="showRTMHistorie(${rtmIndex}); hideRTMContextMenu()">
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
            <button onclick="showRTMHistorie(${rtmIndex}); hideRTMContextMenu()">
              <span class="icon">📊</span>Historie anzeigen
            </button>
          </li>
        </div>`;
    }
  }
  
  // Name ändern immer verfügbar
  menuHTML += `
    <div class="menu-group">
      <div class="menu-group-title">Einstellungen</div>
      <li>
        <button onclick="openRTMNameChangeModal(${rtmIndex}); hideRTMContextMenu()">
          <span class="icon">🔄</span>Name ändern
        </button>
      </li>
    </div>`;
  
  menu.innerHTML = menuHTML;

  // Position berechnen
  const x = event.clientX;
  const y = event.clientY;
  
  document.body.appendChild(menu);
  
  // Menü positionieren
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.display = 'block';

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

  // Animation hinzufügen
  menu.style.opacity = '0';
  menu.style.transform = 'scale(0.95)';
  menu.style.transition = 'opacity 0.1s ease, transform 0.1s ease';
  
  requestAnimationFrame(() => {
    menu.style.opacity = '1';
    menu.style.transform = 'scale(1)';
  });

  // Klick außerhalb schließt das Menü
  setTimeout(() => {
    document.addEventListener('click', hideRTMContextMenu, { once: true });
  }, 10);
}

// Verbesserte Version der hideContextMenu Funktion
function hideRTMContextMenu() {
  const menu = document.getElementById('rtmContextMenu');
  if (menu) {
    // Animation beim schließen
    menu.style.opacity = '0';
    menu.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      menu.remove();
    }, 100);
  }
}

function openTruppAssignmentModalForRTM(patientId) {
  // Hier könntest du eine spezielle Modal für Trupp-Zuordnung öffnen
  // Für jetzt verwenden wir die Patient-Seiten-Funktionalität
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return;
  
  const truppName = prompt("Trupp disponieren:");
  if (!truppName || !truppName.trim()) return;
  
  // Trupp hinzufügen
  if (!Array.isArray(patient.team)) patient.team = [];
  patient.team.push(truppName.trim());
  
  // Patient-Historie aktualisieren
  if (!patient.history) patient.history = [];
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  patient.history.push(`${timeStr} Trupp ${truppName.trim()} disponiert`);
  
  // Status auf disponiert setzen falls noch gemeldet
  if (patient.status === "gemeldet") {
    patient.status = "disponiert";
    patient.history.push(`${timeStr} Status: disponiert`);
  }
  
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Storage-Event auslösen
  window.dispatchEvent(new StorageEvent("storage", {
    key: "patients",
    newValue: JSON.stringify(patients),
  }));
  
  // RTM-Tracker aktualisieren - aber sicherstellen dass RTMs existieren
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  const rtm = rtms.find(r => r.name === truppName.trim());
  if (rtm) {
    const now = Date.now();
    rtm.status = 3;
    rtm.patientInput = patientId;
    rtm.patientStart = now;
    rtm.currentEinsatzStart = now;
    rtm.currentPauseStart = null;
    
    if (!rtm.history) rtm.history = [];
    rtm.history.push(`${timeStr} Status: 3`);
    
    localStorage.setItem("rtms", JSON.stringify(rtms));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "rtms",
      newValue: JSON.stringify(rtms),
    }));
  }
}

// Add after openTruppAssignmentModalForRTM function
function openRTMNameChangeModal(rtmIndex) {
  const rtm = rtms[rtmIndex];
  if (!rtm) return;
  
  // Store the RTM index for editing
  window.editingRTMIndex = rtmIndex;
  window.editingRTMMode = true;
  
  // Parse current name to populate the modal
  const currentName = rtm.name;
  
  // Try to parse the current name to extract components
  const match = currentName.match(/^(.*?)\s+(\d{2})-(\d{2})-(\d{2})$/) || 
                currentName.match(/^(.*?)\s+(.+)$/);
  
  if (match && match.length >= 4) {
    // Standard format with three numbers
    const prefix = match[1].trim();
    const part1 = match[2];
    const part2 = match[3];
    const part3 = match[4];
    
    // Set prefix
    const prefixSelect = document.getElementById('rtmPrefix');
    const prefixMap = {
      'Florian Kiel': 'florian',
      'Sama Kiel': 'sama',
      'Johannes Kiel': 'johannes',
      'Akkon Kiel': 'akkon',
      'Rotkreuz Kiel': 'rotkreuz',
      'Pelikan Kiel': 'pelikan',
      'Christoph': 'christoph',
      'SAR': 'sar'
    };
    
    const prefixValue = prefixMap[prefix] || 'florian';
    prefixSelect.value = prefixValue;
    
    // Handle prefix change to show correct input fields
    handlePrefixChange();
    
    // Set the number parts
    document.getElementById('rtmPart1').value = part1;
    document.getElementById('rtmPart2').value = part2;
    document.getElementById('rtmPart3').value = part3;
  } else if (match && match.length >= 2) {
    // Special format (Christoph/SAR)
    const prefix = match[1].trim();
    const specialPart = match[2];
    
    const prefixMap = {
      'Christoph': 'christoph',
      'SAR': 'sar'
    };
    
    const prefixValue = prefixMap[prefix] || 'christoph';
    document.getElementById('rtmPrefix').value = prefixValue;
    
    handlePrefixChange();
    
    document.getElementById('rtmSpecialPart').value = specialPart;
  }
  
  updateRTMPreview();
  document.getElementById('rtmCreationModal').style.display = 'flex';
}

// Neue Funktion für RTM-Historie-Modal
function showRTMHistorie(rtmIndex) {
  const rtm = rtms[rtmIndex];
  if (!rtm) return;
  
  // Modal HTML erstellen
  const modalHTML = `
    <div id="rtmHistorieModal" class="modal" style="display: flex; z-index: 2000;">
      <div class="modal-content" style="max-width: 700px; max-height: 85vh; overflow-y: auto;">
        <span class="close" onclick="closeRTMHistorieModal()">&times;</span>
        <h2>Historie: ${rtm.name}</h2>
        
        <div style="margin: 20px 0;">
          <h3>Einsatzorte:</h3>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px; background: #f9f9f9;">
            ${rtm.einsatzHistorie && rtm.einsatzHistorie.length ?
              rtm.einsatzHistorie.map(h => 
                `<div style="margin-bottom: 8px; padding: 6px; border-left: 3px solid #007bff; background: white; border-radius: 3px;">
                  <strong style="font-size: 1em;">${h.ort}</strong><br>
                  <small style="font-size: 0.9em;">${formatTime(h.von)} - ${formatTime(h.bis)}</small>
                </div>`
              ).join("") : "<em>Keine Einsatzorte erfasst</em>"}
          </div>
          
          <h3 style="margin-top: 20px;">Patientennummern:</h3>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px; background: #f9f9f9;">
            ${rtm.patientHistorie && rtm.patientHistorie.length ?
              rtm.patientHistorie.map(h => 
                `<div style="margin-bottom: 8px; padding: 6px; border-left: 3px solid #28a745; background: white; border-radius: 3px;">
                  <strong style="font-size: 1em;">Patient ${h.nummer}</strong><br>
                  <small style="font-size: 0.9em;">${formatTime(h.von)} - ${formatTime(h.bis)}</small>
                </div>`
              ).join("") : "<em>Keine Patienten erfasst</em>"}
          </div>
          
          <h3 style="margin-top: 20px;">Status-Historie:</h3>
          <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 4px; background: #f9f9f9;">
            ${rtm.history && rtm.history.length ?
              rtm.history.map(entry => 
                `<div style="margin-bottom: 6px; padding: 4px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 0.95em; line-height: 1.3; background: white; border-radius: 3px; border-left: 2px solid #6c757d;">
                  ${entry}
                </div>`
              ).join("") : "<em>Keine Status-Änderungen erfasst</em>"}
          </div>
        </div>

        <div style="text-align: right; margin-top: 20px;">
          <button onclick="closeRTMHistorieModal()">Schließen</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeRTMHistorieModal() {
  const modal = document.getElementById('rtmHistorieModal');
  if (modal) {
    modal.remove();
  }
}
