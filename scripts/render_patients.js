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

  // Remove any existing global click handlers to prevent duplicates
  if (window.dropdownClickHandler) {
    document.removeEventListener('click', window.dropdownClickHandler);
  }

  // Disposition-Status für alle Patienten aktualisieren
  patients.forEach(patient => {
    updatePatientDispositionStatus(patient, trupps, rtms);
  });

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

  document.getElementById("activePatients").innerHTML = "";
  document.getElementById("inUhsPatients").innerHTML = "";
  document.getElementById("dismissedPatients").innerHTML = "";

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

  sorted.forEach((patient) => {
    const isFinal =
      patient.status === "Transport in KH" || patient.status === "Entlassen";

    // --- Trupp-Dropdown ---
    const excluded = [6, 3, 4, 7, 8, 12];
    const options = trupps
      .filter((t) => !excluded.includes(t.status))
      .map((t) => `<option value="${t.name}">${t.name}</option>`)
      .join("");
    const truppSelect = `
<select id="teamSelect-${patient.id}" ${isFinal ? "disabled" : ""}>
  <option value="">Wählen…</option>
  ${options}
</select>
<button class="meldung-btn" onclick="assignSelectedTrupp(${patient.id})" ${
      isFinal ? "disabled" : ""
    }>
  Trupp disponieren
</button>`;

    // --- Nachforderungen ---
    let requestBox = "";
    if (patient.disposed) {
      requestBox = Object.entries(patient.disposed)
        .map(([req, details]) => {
          // Details kann true (alt) oder Objekt (neu, mit trupp/rtm) sein
          let done = false;
          let extra = "";
          if (details && typeof details === "object") {
            done = details.trupp || details.rtm;
            if (details.trupp)
              extra = ` <span style="color:gray;font-size:0.95em;">[Trupp: ${details.trupp}]</span>`;
            if (details.rtm)
              extra = ` <span style="color:gray;font-size:0.95em;">[RTM: ${details.rtm}]</span>`;
          } else if (details === true) {
            done = true;
          }
          const style = done ? "background:#ccffcc" : "background:#ffcccc";
          const btn = done
            ? ""
            : `<button onclick="openNachforderungModal(${patient.id}, '${req}')">Disponiert</button>`;
          return `<div style="${style};padding:4px;margin-bottom:4px;">${req}${extra} ${btn}</div>`;
        })
        .join("");
    }

    const dispoButtons = isFinal
      ? ""
      : `<div class="buttons" style="display:flex; flex-direction:column; gap:5px; margin-top:8px;">
<button class="meldung-btn" onclick="disposeRequest(${patient.id}, 'Tragetrupp nachgefordert')">
Tragetrupp
</button>
<button class="meldung-btn" onclick="disposeRequest(${patient.id}, 'RTW nachgefordert')">
RTW
<button class="meldung-btn" onclick="disposeRequest(${patient.id}, 'NEF nachgefordert')">
NEF
</button>
</div>
`;

    // --- Historie ---
    const histItems = (patient.history || [])
      .map((h) => `<li>${h}</li>`)
      .join("");
    const addEntry = `<button class="meldung-btn" style="width:100%;margin-top:6px;"
           onclick="promptAddEntry(${patient.id})">Eintrag hinzufügen</button>`;
    const historyHTML = `
    <div style="min-width:300px;max-width:300px;">
<strong>Historie:</strong>
<div class="history-container" style="max-height:200px; overflow-y:auto;">
  <ul>
    ${histItems}
  </ul>
</div>
${addEntry}
</div>`;

    // --- Karte ---
    const card = document.createElement("div");
    const statusClass = (patient.status || "undefined").replace(/\s/g, "-");
    card.className = "patient-card " + statusClass;
    card.dataset.id = patient.id;
    card.innerHTML = `
<!-- ① Titel als Überschrift oberhalb aller Spalten -->
<h2 style="width:100%; margin:0 0 10px; font-size:1.5em; color:#333;">
Patient ${patient.id}
</h2>

<!-- ② Jetzt alle Spalten ohne den alten Titel-Span -->
<div style="display:flex; flex-wrap:wrap; gap:10px;">
  <div class="button-group">
<button class="meldung-btn" onclick="copyPatientData(${
      patient.id
    })">Meldung</button>
<button class="reset-btn"   onclick="deletePatient(${
      patient.id
    })">Löschen</button>

</div>

</div>

<div style="min-width:200px;">
  <strong>Status:</strong> ${patient.status}<br>

  ${!["Entlassen","Transport in KH"].includes(patient.status) ? `
    <button class="status-Transport-in-KH"
            onclick="transportPatient(${patient.id})">
      Transport in KH
    </button>
    <button class="status-Entlassen"
            onclick="dischargePatient(${patient.id})">
      Entlassen
    </button>
  ` : ``}
</div>


${historyHTML}

<div class="patient-info-block" style="min-width:400px;">
  <div class="patient-info-text">
  <!-- ➊ Tabelle für Verdachtsdiagnose  -->
<table class="patient-details-table">
<thead>
<tr>
<th>Verdachtsdiagnose</th>
</tr>
</thead>
<tbody>
<tr>
<td>
${patient.diagnosis || "–"}
</td>
</tr>
</tbody>
</table>

<!-- ➋ Tabelle für die restlichen Felder -->
<table class="patient-info-table">
<tbody>
${(() => {
  // Dispositionssymbole generieren
  let dispositionSymbols = '';
  
  if (patient.suggestedResources && Array.isArray(patient.suggestedResources) && patient.suggestedResources.length > 0) {
    dispositionSymbols = '<div class="disposition-symbols" style="margin-top: 10px;">' +
      '<div style="font-weight: bold; margin-bottom: 4px;">Dispositionsvorschlag:</div>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
    
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
    
    dispositionSymbols += '</div></div>';
  }
  
  return dispositionSymbols;
})()}
<tr>
<th>Alter</th>
<td>
${patient.age || "–"}
</td>
</tr>
<tr>
  <th>Geschlecht</th>
  <td>
    ${["M", "W", "D"]
      .map(
        (g) => `
        <label style="margin-right:8px;">
          <input
            type="checkbox"
            name="gender-${patient.id}"
            value="${g}"
            ${patient.gender === g ? "checked" : ""}
            disabled
          >
          ${g}
        </label>
      `
      )
      .join("")}
  </td>
</tr>

<tr>
<th>Standort</th>
<td>
${patient.location || "–"}
</td>
</tr>
<tr>
<th>Bemerkung</th>
<td>
${patient.remarks || "–"}
</td>
</tr>
</tbody>
</table>

  </div>
  ${
    !isFinal
      ? `<button class="meldung-btn edit-info-btn" onclick="openEditModal(${patient.id})">
         ✏️ Patientendaten bearbeiten
       </button>`
      : ``
  }
</div>

<div class="patient-trupp-column" style="min-width:200px;">
  <strong>Trupp:</strong><br>
  ${
    (patient.team || [])
      .map(
        (t, i) => {
          // Find the corresponding trupp to get its status
          const trupp = trupps.find(tr => tr.name === t);
          const statusDef = trupp ? window.statusOptions?.find(o => o.status === trupp.status) : null;
          const statusIndicator = statusDef ? 
            `<span class="status-code" style="background: ${statusDef.color}; border: 1px solid ${statusDef.color}; color: black; padding: 1px 4px; border-radius: 2px; font-size: 0.8em; margin-left: 4px; cursor: pointer;" 
             oncontextmenu="openTruppStatusDropdown(event, '${t}'); return false;" 
             title="Rechtsklick zum Ändern des Status">${statusDef.status}</span>` : '';
          
          return `<span>${t}${statusIndicator}${
            !isFinal
              ? ` <button class="reset-btn" onclick="removeTrupp(${patient.id},${i})">X</button>`
              : ``
          }</span>`
        }
      )
      .join("<br>") || "–"
  }
  <br>
  <button class="meldung-btn" onclick="openTruppDispositionModal(${patient.id})" ${isFinal ? "disabled" : ""}>
    Trupp disponieren
  </button>
</div>

<div style="min-width:300px;">
  <strong>RTM:</strong><br>
  ${
    (patient.rtm || [])
      .map(
        (r, i) => {
          // Find the corresponding RTM to get its status
          const rtm = rtms.find(rt => rt.name === r);
          const statusDef = rtm ? window.statusOptions?.find(o => o.status === rtm.status) : null;
          const statusIndicator = statusDef ? 
            `<span class="status-code" style="background: ${statusDef.color}; border: 1px solid ${statusDef.color}; color: black; padding: 1px 4px; border-radius: 2px; font-size: 0.8em; margin-left: 4px; cursor: pointer;" 
             oncontextmenu="openRtmStatusDropdown(event, '${r}'); return false;" 
             title="Rechtsklick zum Ändern des Status">${statusDef.status}</span>` : '';
          
          return `<span>${r}${statusIndicator}${
            !isFinal
              ? ` <button class="reset-btn" onclick="removeRtm(${patient.id},${i})">X</button>`
              : ``
          }</span>`
        }
      )
      .join("<br>") || "–"
  }<br>
  <button class="meldung-btn" onclick="openRtmModal(${patient.id})" ${
      isFinal ? "disabled" : ""
    }>
    RTM disponieren
  </button>
</div>


</div>
</div>

`;

    const container = ["gemeldet", "disponiert", "in Behandlung"].includes(
      patient.status
    )
      ? "activePatients"
      : ["verlegt in UHS", "Behandlung in UHS"].includes(patient.status)
      ? "inUhsPatients"
      : "dismissedPatients";
    document.getElementById(container).appendChild(card);

    // <–– HIER scrollen wir den History-Container ans Ende:
    const histContainer = card.querySelector(".history-container");
    if (histContainer) {
      // sofort ans Ende scrollen
      histContainer.scrollTop = histContainer.scrollHeight;
    }

    if (patient.id === highlightId) {
      card.classList.add("slide-in");
      card.addEventListener(
        "animationend",
        () => card.classList.remove("slide-in"),
        { once: true }
      );
    }
  });

  document.querySelectorAll(".history-container").forEach((hc) => {
    hc.scrollTop = hc.scrollHeight;
  });
  
  // Set up persistent global click handler to close dropdowns
  window.dropdownClickHandler = function(e) {
    if (!e.target.closest('.status-dropdown-overlay') && !e.target.closest('.status-code')) {
      const dropdowns = document.querySelectorAll('.status-dropdown-overlay');
      dropdowns.forEach(dropdown => dropdown.remove());
    }
  };
  
  document.addEventListener('click', window.dropdownClickHandler);
  
  window.scrollTo(0, scrollY); 
  
  // Event Listener für automatische Disposition-Updates
  // Entferne vorherige Listener um Duplikate zu vermeiden
  if (window.dispositionUpdateListener) {
    window.removeEventListener('dispositionUpdate', window.dispositionUpdateListener);
  }
  
  window.dispositionUpdateListener = function() {
    // Nur die Disposition-Status aktualisieren ohne komplettes Neurendern
    const patients = JSON.parse(localStorage.getItem("patients")) || [];
    const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
    const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
    
    patients.forEach(patient => {
      updatePatientDispositionStatus(patient, trupps, rtms);
      
      // Nur die Dispositionssymbole in der bestehenden Karte aktualisieren
      const patientCard = document.querySelector(`[data-id="${patient.id}"]`);
      if (patientCard) {
        const dispositionContainer = patientCard.querySelector('.disposition-symbols');
        if (dispositionContainer && patient.suggestedResources && Array.isArray(patient.suggestedResources)) {
          const symbolsDiv = dispositionContainer.querySelector('div:last-child');
          if (symbolsDiv) {
            // Symbole neu generieren - OHNE inline-Styles!
            let newSymbols = '';
            patient.suggestedResources.forEach(resource => {
              const abbrev = getResourceAbbreviation(resource);
              const isDispatched = patient.dispositionStatus[resource] === 'dispatched';
              const isIgnored = patient.dispositionStatus[resource + '_ignored'] === true;
              
              newSymbols += '<span class="disposition-symbol ' + (isDispatched ? 'dispatched' : 'required') + 
                     (isIgnored ? ' ignored' : '') + '"' +
                     ' onclick="toggleDispositionStatus(' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')"' +
                     ' oncontextmenu="toggleDispositionIgnore(event, ' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')"' +
                     ' title="' + resource + '">' +
                     abbrev + '</span>';
            });
            symbolsDiv.innerHTML = newSymbols;
          }
        }
      }
    });
    
    // Aktualisierte Patientendaten speichern
    localStorage.setItem("patients", JSON.stringify(patients));
  };
  
  window.addEventListener('dispositionUpdate', window.dispositionUpdateListener);
  
  window.scrollTo(0, scrollY); 
}