/**
 * Hilfsfunktion für Ressourcen-Kürzel
 */
function getResourceAbbreviation(resource) {
  const abbreviations = {
    Trupp: "T",
    RTW: "RTW",
    RTM: "RTM",
    "UHS-Notarzt oder NEF": "NA",
    NEF: "NEF",
    "First Responder": "FR",
    "Info an ASL": "ASL",
    "Ordnungsdienst hinzuziehen": "OD",
    "Polizei hinzuziehen": "POL",
    "Ggf. Ordnungsdienst hinzuziehen": "OD?",
    "Ggf. Polizei hinzuziehen": "POL?",
  };

  // Für alle anderen "Ggf. ..." Ressourcen automatisch behandeln
  if (resource.startsWith("Ggf. ") && !abbreviations[resource]) {
    const baseResource = resource.replace("Ggf. ", "");
    const baseAbbrev = abbreviations[baseResource];
    if (baseAbbrev) {
      return baseAbbrev + "?";
    }
    // Fallback: erste 3 Zeichen + ?
    return baseResource.substring(0, 3).toUpperCase() + "?";
  }

  return abbreviations[resource] || resource.substring(0, 3).toUpperCase();
}

/**
 * Zentrale Funktion zur Aktualisierung der Disposition-Status für einen Patienten
 * @param {Object} patient - Der Patientenobject
 * @param {Array} trupps - Array aller Trupps
 * @param {Array} rtms - Array aller RTMs
 */
function updatePatientDispositionStatus(patient, trupps, rtms) {
  if (!patient.suggestedResources || !Array.isArray(patient.suggestedResources)) return;
  
  if (!patient.dispositionStatus) {
    patient.dispositionStatus = {};
  }

  console.log('=== UPDATE DISPOSITION STATUS ===');
  console.log('Patient ID:', patient.id);
  console.log('Before reset:', patient.dispositionStatus);

  // WICHTIG: Manuelle Status-Setzungen beibehalten!
  const manualStatus = {};
  patient.suggestedResources.forEach(resource => {
    if (patient.dispositionStatus[resource] === 'dispatched') {
      manualStatus[resource] = 'dispatched';
    }
    if (patient.dispositionStatus[resource + '_ignored'] === true) {
      manualStatus[resource + '_ignored'] = true;
    }
  });

  // Reset all disposition status first
  patient.suggestedResources.forEach(resource => {
    patient.dispositionStatus[resource] = undefined;
  });

  console.log('After reset:', patient.dispositionStatus);

  // Finde alle Trupps die diesem Patienten zugewiesen sind (wie im Trupp-Tracker)
  const assignedTrupps = trupps.filter(t => t.patientInput === patient.id && [3, 4, 7, 8].includes(t.status));
  
  console.log('Assigned trupps:', assignedTrupps.map(t => t.name));

  // Finde alle RTMs die diesem Patienten zugewiesen sind
  const assignedRTMs = rtms.filter(r => (r.patientInput === patient.id || r.patientInput === String(patient.id)) && [3, 4, 7, 8].includes(r.status));

  // ZUSÄTZLICH: RTMs auch aus patient.rtm Array berücksichtigen
  const patientRTMNames = Array.isArray(patient.rtm) ? patient.rtm : [];
  const additionalRTMs = rtms.filter(r => patientRTMNames.includes(r.name) && [3, 4, 7, 8].includes(r.status));
  
  // Kombiniere beide RTM-Listen
  const allAssignedRTMs = [...assignedRTMs];
  additionalRTMs.forEach(rtm => {
    if (!allAssignedRTMs.find(r => r.name === rtm.name)) {
      allAssignedRTMs.push(rtm);
    }
  });

  // Für jede Ressource prüfen
  patient.suggestedResources.forEach(resource => {
    let shouldDispatch = false;

    // 1. Trupp-Logik - bereits zugewiesen = dispatched (wie im Trupp-Tracker)
    if (resource === 'Trupp' && assignedTrupps.length > 0) {
      shouldDispatch = true;
    }

    // 2. RTM-Logik - bereits zugewiesen = dispatched
    if (resource === 'RTM' && allAssignedRTMs.length > 0) {
      shouldDispatch = true;
    }

    // 3. RTM-Type-spezifische Disposition-Status-Setzung
    allAssignedRTMs.forEach(assignedRTM => {
      if (assignedRTM.rtmType) {
        const rtmType = assignedRTM.rtmType;
        
        // Prüfe NA/NEF-Konstellation
        const hasNA = patient.suggestedResources.includes('UHS-Notarzt oder NEF');
        const hasNEF = patient.suggestedResources.includes('NEF');
        
        // RTW und NEF für Typ 80 und 81
        if ((rtmType === 80 || rtmType === 81) && (resource === 'RTW' || resource === 'NEF' || resource === 'UHS-Notarzt oder NEF')) {
          shouldDispatch = true;
        }
        // Nur NEF für Typ 82 - ABER spezielle NA/NEF-Behandlung
        if (rtmType === 82) {
          if (hasNA && hasNEF) {
            // Beide vorhanden: nur NEF dispatched, NA nicht
            if (resource === 'NEF') {
              shouldDispatch = true;
            }
          } else if (hasNA && !hasNEF) {
            // Nur NA vorhanden: NA dispatched
            if (resource === 'UHS-Notarzt oder NEF') {
              shouldDispatch = true;
            }
          } else if (!hasNA && hasNEF) {
            // Nur NEF vorhanden: NEF dispatched
            if (resource === 'NEF') {
              shouldDispatch = true;
            }
          }
        }
        // Nur RTW für Typ 83 und 89
        if ((rtmType === 83 || rtmType === 89) && resource === 'RTW') {
          shouldDispatch = true;
        }
        // NEF für RTH - ABER spezielle NA/NEF-Behandlung
        if (rtmType === 'RTH') {
          if (hasNA && hasNEF) {
            // Beide vorhanden: nur NEF dispatched, NA nicht
            if (resource === 'NEF') {
              shouldDispatch = true;
            }
          } else if (hasNA && !hasNEF) {
            // Nur NA vorhanden: NA dispatched
            if (resource === 'UHS-Notarzt oder NEF') {
              shouldDispatch = true;
            }
          } else if (!hasNA && hasNEF) {
            // Nur NEF vorhanden: NEF dispatched
            if (resource === 'NEF') {
              shouldDispatch = true;
            }
          }
        }
      }
    });

    // Status setzen: Automatisch ODER manuell
    if (shouldDispatch || manualStatus[resource] === 'dispatched') {
      patient.dispositionStatus[resource] = 'dispatched';
    }
    
    // Ignored Status wiederherstellen
    if (manualStatus[resource + '_ignored'] === true) {
      patient.dispositionStatus[resource + '_ignored'] = true;
    }
    
    console.log(`Resource ${resource}: shouldDispatch=${shouldDispatch}, final status=${patient.dispositionStatus[resource]}`);
  });
  
  console.log('Final disposition status:', patient.dispositionStatus);
}

/**
 * Event zur automatischen Aktualisierung der Dispositionssymbole
 */
function triggerDispositionUpdate() {
  // Custom Event dispatchen
  window.dispatchEvent(new CustomEvent('dispositionUpdate'));
}

/**
 * Toggle disposition status (dispatched/required)
 */
function toggleDispositionStatus(patientId, resource) {
  console.log('=== TOGGLE DISPOSITION STATUS ===');
  console.log('Patient ID:', patientId);
  console.log('Resource:', resource);
  
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  
  if (!patient || !patient.dispositionStatus) {
    if (!patient.dispositionStatus) patient.dispositionStatus = {};
  }
  
  console.log('Before toggle:', patient.dispositionStatus[resource]);
  
  // Toggle zwischen dispatched und undefined
  if (patient.dispositionStatus[resource] === 'dispatched') {
    patient.dispositionStatus[resource] = undefined;
  } else {
    patient.dispositionStatus[resource] = 'dispatched';
  }
  
  console.log('After toggle:', patient.dispositionStatus[resource]);
  
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Finde das geklickte Element und schaue dir seine aktuellen Styles an
  const clickedElements = document.querySelectorAll(`[onclick*="${patientId}"][onclick*="${resource}"]`);
  console.log('Found elements:', clickedElements.length);
  
  clickedElements.forEach((element, index) => {
    console.log(`Element ${index}:`, element);
    console.log('Tag name:', element.tagName);
    console.log('Classes:', element.className);
    console.log('Computed styles:', window.getComputedStyle(element));
    console.log('Background color:', window.getComputedStyle(element).backgroundColor);
    console.log('Color:', window.getComputedStyle(element).color);
  });
  
  // Patient-Cards neu laden
  if (typeof loadPatients === 'function') {
    loadPatients(patientId);
  }
  
  // Event für Updates auslösen
  triggerDispositionUpdate();
}

/**
 * Erzwingt sofortige CSS-Klasssen-Updates für Disposition-Symbole
 */
function forceDispositionStyleUpdate(patientId, resource, dispositionStatus) {
  // Alle Symbole für diese Kombination finden
  const symbolElements = document.querySelectorAll(`[onclick*="${patientId}"][onclick*="${resource}"]`);
  
  symbolElements.forEach(element => {
    // Alle Status-Klassen entfernen
    element.classList.remove('dispatched', 'required', 'ignored');
    
    // Korrekte Klasse basierend auf Status setzen
    const isDispatched = dispositionStatus[resource] === 'dispatched';
    const isIgnored = dispositionStatus[resource + '_ignored'] === true;
    
    if (isDispatched) {
      element.classList.add('dispatched');
      // Zusätzlich CSS direkt setzen als Fallback
      element.style.backgroundColor = '#d4edda';
      element.style.color = '#155724';
      element.style.borderColor = '#c3e6cb';
      element.style.animation = 'none';
    } else if (isIgnored) {
      element.classList.add('ignored');
      element.style.backgroundColor = '#fff3cd';
      element.style.color = '#856404';
      element.style.borderColor = '#ffeaa7';
      element.style.animation = 'none';
    } else {
      element.classList.add('required');
      element.style.backgroundColor = '#f8d7da';
      element.style.color = '#721c24';
      element.style.borderColor = '#f5c6cb';
      element.style.animation = 'blink 1.5s infinite';
    }
  });
}

/**
 * Toggle disposition ignore status
 */
function toggleDispositionIgnore(event, patientId, resource) {
  event.preventDefault();
  event.stopPropagation();
  
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === patientId);
  
  if (!patient || !patient.dispositionStatus) return;
  
  // Toggle ignored status
  const ignoredKey = resource + '_ignored';
  patient.dispositionStatus[ignoredKey] = !patient.dispositionStatus[ignoredKey];
  
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Event für Updates auslösen
  triggerDispositionUpdate();
  
  // Auch Patient-Cards neu laden
  if (typeof loadPatients === 'function') {
    loadPatients(patientId);
  }
}

function loadPatients(highlightId) {
  if (!document.getElementById("activePatients")) return;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  const scrollY = window.scrollY;

  // Remove any existing status dropdowns before rendering
  const existingDropdowns = document.querySelectorAll('.status-dropdown-overlay');
  existingDropdowns.forEach(dropdown => dropdown.remove());
  
  // Remove any existing context menus
  const existingContextMenus = document.querySelectorAll('#patientContextMenu');
  existingContextMenus.forEach(menu => menu.remove());

  // Remove any existing global click handlers to prevent duplicates
  if (window.dropdownClickHandler) {
    document.removeEventListener('click', window.dropdownClickHandler);
  }

  patients.forEach((p) => {
    // 1) createdAt sicher als Zahl
    if (typeof p.createdAt !== "number") {
      p.createdAt = Number(p.createdAt) || Date.now();
    }
    // 2) statusTimestamps-Objekt sicherstellen und alle Einträge als Zahl
    p.statusTimestamps = p.statusTimestamps || {};
    for (const key in p.statusTimestamps) {
      p.statusTimestamps[key] =
        Number(p.statusTimestamps[key]) || p.statusTimestamps[key];
    }
  });

  // Create single table structure
  const activeContainer = document.getElementById("activePatients");
  const uhsContainer = document.getElementById("inUhsPatients");
  const dismissedContainer = document.getElementById("dismissedPatients");

  // Create single table in active container, hide others
  activeContainer.innerHTML = `
    <table class="patients-table">
      <thead>
        <tr>
          <th></th>
          <th>ID</th>
          <th>Status</th>
          <th>Verdachtsdiagnose</th>
          <th>Alter/Geschlecht</th>
          <th>Standort</th>
          <th>Disposition</th>
          <th>Ressourcen</th>
        </tr>
      </thead>
      <tbody id="patients-table-body"></tbody>
    </table>
  `;
  
  uhsContainer.style.display = 'none';
  dismissedContainer.style.display = 'none';
  
  const tableBody = document.getElementById('patients-table-body');

  // Add section header function
  function addSectionHeader(title, count) {
    const headerRow = document.createElement('tr');
    headerRow.className = 'section-header-row';
    headerRow.innerHTML = `
      <td colspan="8" class="section-header">
        <h3>${title} (${count})</h3>
      </td>
    `;
    return headerRow;
  }

  const order = [
    "gemeldet",
    "disponiert", 
    "in Behandlung",
    "verlegt in UHS",
    "Behandlung in UHS",
  ];
  const sorted = patients
    .slice()
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  // Group patients by category
  const activePatients = sorted.filter(p => ["gemeldet", "disponiert", "in Behandlung"].includes(p.status));
  const uhsPatients = sorted.filter(p => ["verlegt in UHS", "Behandlung in UHS"].includes(p.status));
  const dismissedPatients = sorted.filter(p => ["Transport in KH", "Entlassen"].includes(p.status));

  // Check if dismissed patients should be shown
  const showDismissedCheckbox = document.getElementById("showDismissedCheckbox");
  const showDismissed = showDismissedCheckbox ? showDismissedCheckbox.checked : true;

  // Add sections with headers
  if (activePatients.length > 0) {
    tableBody.appendChild(addSectionHeader('Aktive Patienten', activePatients.length));
    activePatients.forEach(patient => {
      // ...existing code for creating patient rows...
      const { mainRow, detailsRow } = createPatientRows(patient, trupps, rtms, highlightId);
      tableBody.appendChild(mainRow);
      tableBody.appendChild(detailsRow);
    });
  }

  if (uhsPatients.length > 0) {
    tableBody.appendChild(addSectionHeader('In UHS', uhsPatients.length));
    uhsPatients.forEach(patient => {
      const { mainRow, detailsRow } = createPatientRows(patient, trupps, rtms, highlightId);
      tableBody.appendChild(mainRow);
      tableBody.appendChild(detailsRow);
    });
  }

  if (showDismissed && dismissedPatients.length > 0) {
    tableBody.appendChild(addSectionHeader('Entlassen/Transport', dismissedPatients.length));
    dismissedPatients.forEach(patient => {
      const { mainRow, detailsRow } = createPatientRows(patient, trupps, rtms, highlightId);
      tableBody.appendChild(mainRow);
      tableBody.appendChild(detailsRow);
    });
  }

  // Helper function to create patient rows
  function createPatientRows(patient, trupps, rtms, highlightId) {
    const isFinal = patient.status === "Transport in KH" || patient.status === "Entlassen";
    const statusClass = (patient.status || "undefined").replace(/\s/g, "-");
    
    // Erstelle die Hauptzeile des Patienten
    const mainRow = document.createElement("tr");
    mainRow.className = `patient-row status-${statusClass}`;
    mainRow.dataset.id = patient.id;
    mainRow.dataset.status = patient.status;
    
    if (patient.id === highlightId) {
      mainRow.classList.add("slide-in");
      setTimeout(() => mainRow.classList.remove("slide-in"), 2000);
    }
    
    // Expandieren/Kollabieren per Klick auf die ganze Zeile
    mainRow.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('button') && 
          e.target.tagName !== 'A' && !e.target.closest('a') &&
          e.target.tagName !== 'SELECT' && !e.target.closest('select')) {
        toggleExpandRow(patient.id);
      }
    });
    
    // Rechtsklick-Event für Kontextmenü
    mainRow.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPatientContextMenu(e, patient.id, isFinal);
    });
    
    // Inhalt der Hauptzeile
    const expandBtnCell = `<td><span class="expand-btn" onclick="toggleExpandRow('${patient.id}')">▼</span></td>`;
    
    const idCell = `<td><strong>P${patient.id}</strong></td>`;
    
    const statusCell = `
      <td>
        <span class="status-indicator"></span>
        ${patient.status || "–"}
      </td>
    `;
    
    const diagnosisCell = `
      <td>
        ${patient.diagnosis || "–"}
      </td>
    `;
    
    const ageGenderCell = `
      <td>${patient.age || "–"} / ${patient.gender || "–"}</td>
    `;
    
    const locationCell = `
      <td>
        <div class="tooltip">
          ${(patient.location || "–").length > 20 ? 
            (patient.location || "–").substring(0, 20) + "..." : 
            (patient.location || "–")}
          <span class="tooltip-text">${patient.location || "–"}</span>
        </div>
      </td>
    `;
    
    // Disposition Symbole
    let dispositionCell = `<td>`;
    if (patient.suggestedResources && Array.isArray(patient.suggestedResources) && patient.suggestedResources.length > 0) {
      dispositionCell += `<div style="display: flex; flex-wrap: wrap; gap: 3px;">`;
      patient.suggestedResources.forEach(resource => {
        const abbrev = getResourceAbbreviation(resource);
        if (!patient.dispositionStatus) patient.dispositionStatus = {};
        
        const isDispatched = patient.dispositionStatus[resource] === 'dispatched';
        const isIgnored = patient.dispositionStatus[resource + '_ignored'] === true;
        
        let cssClass = 'disposition-symbol ';
        if (isDispatched) {
          cssClass += 'dispatched';
        } else if (isIgnored) {
          cssClass += 'ignored';
        } else {
          cssClass += 'required';
        }
        
        dispositionCell += `
          <span class="${cssClass}"
                onclick="toggleDispositionStatus(${patient.id}, '${resource.replace(/'/g, "\\'")}')"
                oncontextmenu="toggleDispositionIgnore(event, ${patient.id}, '${resource.replace(/'/g, "\\'")}')"
                title="${resource}">
            ${abbrev}
          </span>
        `;
      });
      dispositionCell += `</div>`;
    } else {
      dispositionCell += `–`;
    }
    dispositionCell += `</td>`;
    
    // Trupp/RTM-Zelle
    let resourcesCell = `<td>`;
    
    // Trupps
    if (Array.isArray(patient.team) && patient.team.length > 0) {
      resourcesCell += `<div class="resources-list">`;
      patient.team.forEach((t, i) => {
        const trupp = trupps.find(tr => tr.name === t);
        const statusDef = trupp ? window.statusOptions?.find(o => o.status === trupp.status) : null;
        const statusIndicator = statusDef ? 
          `<span class="status-code" style="background: ${statusDef.color}; color: black; padding: 0 3px; border-radius: 2px; font-size: 0.8em; margin-left: 2px; cursor: pointer;" 
           onclick="openTruppStatusDropdown(event, '${t}')" 
           title="Klick zum Ändern des Status">${statusDef.status}</span>` : '';
        
        resourcesCell += `
          <span class="resource-tag trupp-tag">
            T: ${t.length > 10 ? t.substring(0, 10) + "..." : t}${statusIndicator}
          </span>
        `;
      });
      resourcesCell += `</div>`;
    }
    
    // RTMs
    if (Array.isArray(patient.rtm) && patient.rtm.length > 0) {
      resourcesCell += `<div class="resources-list">`;
      patient.rtm.forEach((r, i) => {
        const rtm = rtms.find(rt => rt.name === r);
        const statusDef = rtm ? window.statusOptions?.find(o => o.status === rtm.status) : null;
        const statusIndicator = statusDef ? 
          `<span class="status-code" style="background: ${statusDef.color}; color: black; padding: 0 3px; border-radius: 2px; font-size: 0.8em; margin-left: 2px; cursor: pointer;" 
           onclick="openRtmStatusDropdown(event, '${r}')" 
           title="Klick zum Ändern des Status">${statusDef.status}</span>` : '';
        
        resourcesCell += `
          <span class="resource-tag rtm-tag">
            R: ${r}${statusIndicator}
          </span>
        `;
      });
      resourcesCell += `</div>`;
    }
    
    if (!Array.isArray(patient.team) || patient.team.length === 0) {
      if (!Array.isArray(patient.rtm) || patient.rtm.length === 0) {
        resourcesCell += `–`;
      }
    }
    
    resourcesCell += `</td>`;
    
    // Füge alle Zellen zur Hauptzeile hinzu (Aktionsbuttons entfernt)
    mainRow.innerHTML = expandBtnCell + idCell + statusCell + diagnosisCell + 
                       ageGenderCell + locationCell + dispositionCell + 
                       resourcesCell;
    
    // Erstelle die erweiterbaren Details-Zeilen
    const detailsRow = document.createElement("tr");
    detailsRow.className = "expandable-row";
    detailsRow.id = `details-${patient.id}`;
    
    // Details-Inhalt mit 3 Spalten
    const detailsContent = document.createElement("td");
    detailsContent.colSpan = 9; // Über alle Spalten erstrecken
    detailsContent.className = "expandable-content";
    
    // Inhalt der Details
    detailsContent.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 20px;">
        <!-- Linke Spalte: Trupps, RTMs zuweisen -->
        <div style="flex: 1; min-width: 300px;">
          <h4>Ressourcen zuweisen</h4>
          
          <div class="assignment-section">
            <h5>Trupp</h5>
            <select id="teamSelect-${patient.id}" ${isFinal ? "disabled" : ""}>
              <option value="">Wählen…</option>
              ${trupps
                .filter(t => ![6, 3, 4, 7, 8, 12].includes(t.status))
                .map(t => `<option value="${t.name}">${t.name}</option>`)
                .join("")}
            </select>
            <button class="meldung-btn" onclick="assignSelectedTrupp(${patient.id})" ${isFinal ? "disabled" : ""}>
              Trupp disponieren
            </button>
            
            <h5>RTM</h5>
            <button class="meldung-btn" onclick="openRtmModal(${patient.id})" ${isFinal ? "disabled" : ""}>
              RTM disponieren
            </button>
          </div>
          
          <!-- Zugewiesene Ressourcen anzeigen und entfernen können -->
          <div style="margin-top: 15px;">
            <h5>Zugewiesene Trupps</h5>
            ${Array.isArray(patient.team) && patient.team.length > 0 ?
              patient.team.map((t, i) => `
                <div style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                  <span>${t}</span>
                  ${!isFinal ? `<button class="reset-btn" onclick="removeTrupp(${patient.id},${i})">Entfernen</button>` : ''}
                </div>
              `).join("") :
              "<p>Keine Trupps zugewiesen</p>"
            }
            
            <h5>Zugewiesene RTMs</h5>
            ${Array.isArray(patient.rtm) && patient.rtm.length > 0 ?
              patient.rtm.map((r, i) => `
                <div style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                  <span>${r}</span>
                  ${!isFinal ? `<button class="reset-btn" onclick="removeRtm(${patient.id},${i})">Entfernen</button>` : ''}
                </div>
              `).join("") :
              "<p>Keine RTMs zugewiesen</p>"
            }
          </div>
        </div>
        
        <!-- Mittlere Spalte: Patienteninfo -->
        <div style="flex: 1; min-width: 300px;">
          <h4>Patientendaten</h4>
          
          <!-- Patientendaten als Tabelle -->
          <table class="patient-info-table" style="width:100%">
            <tr>
              <th>Verdachtsdiagnose</th>
              <td>${patient.diagnosis || "–"}</td>
            </tr>
            <tr>
              <th>Alter</th>
              <td>${patient.age || "–"}</td>
            </tr>
            <tr>
              <th>Geschlecht</th>
              <td>${patient.gender || "–"}</td>
            </tr>
            <tr>
              <th>Standort</th>
              <td>${patient.location || "–"}</td>
            </tr>
            <tr>
              <th>Bemerkungen</th>
              <td>${patient.remarks || "–"}</td>
            </tr>
          </table>
          
          <button class="meldung-btn edit-info-btn" style="margin-top: 10px;" onclick="openEditModal(${patient.id})">
            Patientendaten bearbeiten
          </button>
        </div>
        
        <!-- Rechte Spalte: Historie -->
        <div style="flex: 1; min-width: 300px;">
          <h4>Patientenhistorie</h4>
          
          <div class="history-container" style="max-height: 300px; overflow-y: auto;">
            <ul>
              ${(patient.history || []).map(h => `<li>${h}</li>`).join("")}
            </ul>
          </div>
          
          <button class="meldung-btn" style="width:100%; margin-top:10px;"
                 onclick="promptAddEntry(${patient.id})">
            Eintrag hinzufügen
          </button>
        </div>
      </div>
    `;
    
    detailsRow.appendChild(detailsContent);
    
    return { mainRow, detailsRow };
  }

  // Scroll zu Highlight-ID, falls vorhanden
  if (highlightId) {
    const highlightRow = document.querySelector(`tr[data-id="${highlightId}"]`);
    if (highlightRow) {
      highlightRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Setze den globalen Click-Handler für Dropdowns
  window.dropdownClickHandler = function(e) {
    if (!e.target.closest('.status-dropdown-overlay') && !e.target.closest('.status-code')) {
      const dropdowns = document.querySelectorAll('.status-dropdown-overlay');
      dropdowns.forEach(dropdown => dropdown.remove());
    }
  };
  
  document.addEventListener('click', window.dropdownClickHandler);
  
  // Event-Listener für Disposition-Updates
  if (window.dispositionUpdateListener) {
    window.removeEventListener('dispositionUpdate', window.dispositionUpdateListener);
  }
  
  window.dispositionUpdateListener = function() {
    console.log('Disposition update received - updating relevant patients only');
    
    const currentPatients = JSON.parse(localStorage.getItem("patients")) || [];
    const currentTrupps = JSON.parse(localStorage.getItem("trupps")) || [];
    const currentRtms = JSON.parse(localStorage.getItem("rtms")) || [];
    
    currentPatients.forEach(patient => {
      updatePatientDispositionStatus(patient, currentTrupps, currentRtms);
      
      const patientRow = document.querySelector(`tr[data-id="${patient.id}"]`);
      if (patientRow && patient.suggestedResources && Array.isArray(patient.suggestedResources)) {
        const dispositionCell = patientRow.querySelector('td:nth-child(7)');
        if (dispositionCell) {
          // Nur die Dispositionssymbole neu rendern
          let symbolsHTML = '<div style="display: flex; flex-wrap: wrap; gap: 3px;">';
          
          patient.suggestedResources.forEach(resource => {
            const abbrev = getResourceAbbreviation(resource);
            const isDispatched = patient.dispositionStatus && patient.dispositionStatus[resource] === 'dispatched';
            const isIgnored = patient.dispositionStatus && patient.dispositionStatus[resource + '_ignored'] === true;
            
            let cssClass = 'disposition-symbol ';
            if (isDispatched) {
              cssClass += 'dispatched';
            } else if (isIgnored) {
              cssClass += 'ignored';
            } else {
              cssClass += 'required';
            }
            
            symbolsHTML += `
              <span class="${cssClass}"
                    onclick="toggleDispositionStatus(${patient.id}, '${resource.replace(/'/g, "\\'")}')"
                    oncontextmenu="toggleDispositionIgnore(event, ${patient.id}, '${resource.replace(/'/g, "\\'")}')"
                    title="${resource}">
                ${abbrev}
              </span>
            `;
          });
          
          symbolsHTML += '</div>';
          dispositionCell.innerHTML = symbolsHTML;
        }
      }
    });
    
    localStorage.setItem("patients", JSON.stringify(currentPatients));
  };
  
  window.addEventListener('dispositionUpdate', window.dispositionUpdateListener);
  
  // Füge die Toggle-Funktion zum Window-Objekt hinzu
  window.toggleExpandRow = function(patientId) {
    const mainRow = document.querySelector(`tr[data-id="${patientId}"]`);
    const detailsRow = document.getElementById(`details-${patientId}`);
    
    if (mainRow && detailsRow) {
      const isExpanded = mainRow.classList.contains('expanded');
      
      if (isExpanded) {
        mainRow.classList.remove('expanded');
        detailsRow.style.display = 'none';
        // Aus der Set entfernen
        window.expandedPatients.delete(patientId);
      } else {
        mainRow.classList.add('expanded');
        detailsRow.style.display = 'table-row';
        // Zur Set hinzufügen
        window.expandedPatients.add(patientId);
        
        // Scroll zum Container der Historie
        const historyContainer = detailsRow.querySelector('.history-container');
        if (historyContainer) {
          historyContainer.scrollTop = historyContainer.scrollHeight;
        }
      }
    }
  };

  // NEUE FUNKTION: Erweiterte Zustände nach dem Rendern wiederherstellen
  setTimeout(() => {
    restoreExpandedStates();
  }, 50); // Kurze Verzögerung damit das DOM vollständig gerendert ist
}

/**
 * Stellt die aufgeklappten Zustände der Patienten wieder her
 */
function restoreExpandedStates() {
  window.expandedPatients.forEach(patientId => {
    const mainRow = document.querySelector(`tr[data-id="${patientId}"]`);
    const detailsRow = document.getElementById(`details-${patientId}`);
    
    if (mainRow && detailsRow) {
      // Prüfe ob der Patient noch in der aktuellen Ansicht existiert
      const patients = JSON.parse(localStorage.getItem("patients")) || [];
      const patient = patients.find(p => p.id === patientId);
      
      if (patient) {
        // Patient existiert noch - aufgeklappten Zustand wiederherstellen
        mainRow.classList.add('expanded');
        detailsRow.style.display = 'table-row';
        
        // Scroll zum Container der Historie (falls erweitert)
        const historyContainer = detailsRow.querySelector('.history-container');
        if (historyContainer) {
          historyContainer.scrollTop = historyContainer.scrollHeight;
        }
      } else {
        // Patient existiert nicht mehr - aus der Set entfernen
        window.expandedPatients.delete(patientId);
      }
    } else {
      // Elemente nicht gefunden - möglicherweise Patient nicht mehr sichtbar
      // Behalte in der Set für den Fall dass der Patient später wieder erscheint
    }
  });
}

/**
 * Zeigt das Kontextmenü für einen Patienten an
 * @param {Event} event - Das auslösende Event (Rechtsklick)
 * @param {number|string} patientId - Die ID des Patienten
 * @param {boolean} isFinal - Ob der Patient im finalen Status ist
 */
function showPatientContextMenu(event, patientId, isFinal) {
  event.preventDefault();
  event.stopPropagation();

  // Erstelle das Kontextmenü direkt im iframe, unabhängig von parent
  hidePatientContextMenu();

  const menu = document.createElement('div');
  menu.id = 'patientContextMenu';
  menu.className = 'context-menu';
  
  let menuHTML = `
    <div class="menu-group">
      <div class="menu-group-title">Patient P${patientId}</div>
      ${!isFinal ? `
        <div class="menu-item" onclick="transportPatient(${patientId}); hidePatientContextMenu()">
          <span class="icon">🚑</span>Transport in KH
        </div>
        <div class="menu-item" onclick="dischargePatient(${patientId}); hidePatientContextMenu()">
          <span class="icon">✅</span>Entlassen
        </div>
      ` : ''}
      <div class="menu-item" onclick="copyPatientData(${patientId}); hidePatientContextMenu()">
        <span class="icon">📋</span>Meldung kopieren
      </div>
      <div class="menu-item warning" onclick="deletePatient(${patientId}); hidePatientContextMenu()">
        <span class="icon">🗑️</span>Löschen
      </div>
    </div>
    
    <div class="menu-group">
      <div class="menu-group-title">Dokumentation</div>
      <div class="menu-item" onclick="openEditModal(${patientId}); hidePatientContextMenu()">
        <span class="icon">✏️</span>Patientendaten bearbeiten
      </div>
      <div class="menu-item" onclick="promptAddEntry(${patientId}); hidePatientContextMenu()">
        <span class="icon">📝</span>Eintrag hinzufügen
      </div>
    </div>
  `;

  if (!isFinal) {
    menuHTML += `
      <div class="menu-group">
        <div class="menu-group-title">Ressourcen</div>
        <div class="menu-item" onclick="openTruppDispositionModal(${patientId}); hidePatientContextMenu()">
          <span class="icon">👥</span>Trupp disponieren
        </div>
        <div class="menu-item" onclick="openRtmModal(${patientId}); hidePatientContextMenu()">
          <span class="icon">🚗</span>RTM disponieren
        </div>
      </div>
    `;
  }
  
  menu.innerHTML = menuHTML;

  // Menu erstmal unsichtbar hinzufügen um Größe zu messen
  menu.style.position = 'fixed';
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';
  menu.style.zIndex = '10000';
  menu.style.opacity = '0';
  menu.style.pointerEvents = 'none';
  
  document.body.appendChild(menu);
  
  // Größe messen
  const rect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Position berechnen - Standard rechts unten von der Maus
  let finalX = event.clientX + 5;
  let finalY = event.clientY + 5;

  // Prüfe ob das Menü rechts rausragen würde
  if (finalX + rect.width > viewportWidth) {
    finalX = event.clientX - rect.width - 5; // Links von der Maus
  }
  
  // Prüfe ob das Menü unten rausragen würde
  if (finalY + rect.height > viewportHeight) {
    finalY = event.clientY - rect.height - 5; // Oberhalb der Maus
  }
  
  // Noch ein Check falls es sowohl rechts als auch unten rausragen würde
  if (finalX + rect.width > viewportWidth && finalY + rect.height > viewportHeight) {
    finalX = event.clientX - rect.width - 5;
    finalY = event.clientY - rect.height - 5;
  }
  
  // Mindestabstand zum Rand sicherstellen
  finalX = Math.max(5, Math.min(finalX, viewportWidth - rect.width - 5));
  finalY = Math.max(5, Math.min(finalY, viewportHeight - rect.height - 5));

  // Finale Position setzen
  menu.style.left = finalX + 'px';
  menu.style.top = finalY + 'px';
  menu.style.opacity = '1';
  menu.style.pointerEvents = 'auto';

  // Animation
  menu.style.transform = 'scale(0.95)';
  menu.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
  
  requestAnimationFrame(() => {
    menu.style.transform = 'scale(1)';
  });

  // Event Handler für das Schließen
  const closeHandler = function(e) {
    if (!e.target.closest('#patientContextMenu')) {
      hidePatientContextMenu();
      document.removeEventListener('click', closeHandler);
      document.removeEventListener('contextmenu', closeHandler);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
    document.addEventListener('contextmenu', closeHandler);
  }, 10);

  // ESC-Taste schließt das Menü
  const escHandler = function(e) {
    if (e.key === 'Escape') {
      hidePatientContextMenu();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Blendet das Patienten-Kontextmenü aus
 */
function hidePatientContextMenu() {
  const menu = document.getElementById('patientContextMenu');
  if (menu) {
    menu.style.opacity = '0';
    menu.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      menu.remove();
    }, 150);
  }
}

// Message-Listener für Actions vom parent window
window.addEventListener('message', function(event) {
  if (event.data.type === 'executePatientAction') {
    const { action, patientId } = event.data;
    
    switch(action) {
      case 'transport':
        if (typeof transportPatient === 'function') {
          transportPatient(patientId);
        }
        break;
      case 'discharge':
        if (typeof dischargePatient === 'function') {
          dischargePatient(patientId);
        }
        break;
      case 'copy':
        if (typeof copyPatientData === 'function') {
          copyPatientData(patientId);
        }
        break;
      case 'delete':
        if (typeof deletePatient === 'function') {
          deletePatient(patientId);
        }
        break;
      case 'edit':
        if (typeof openEditModal === 'function') {
          openEditModal(patientId);
        }
        break;
      case 'addEntry':
        if (typeof promptAddEntry === 'function') {
          promptAddEntry(patientId);
        }
        break;
      case 'assignTrupp':
        if (typeof openTruppDispositionModal === 'function') {
          openTruppDispositionModal(patientId);
        }
        break;
      case 'assignRtm':
        if (typeof openRtmModal === 'function') {
          openRtmModal(patientId);
        }
        break;
    }
  }
});