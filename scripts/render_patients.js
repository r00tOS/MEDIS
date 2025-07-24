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

  // Einmal alle relevanten Daten sammeln
  const assignedTrupps = trupps.filter(t => t.patientInput === patient.id && [3, 4, 7, 8].includes(t.status));
  const assignedRTMs = rtms.filter(r => (r.patientInput === patient.id || r.patientInput === String(patient.id)) && [3, 4, 7, 8].includes(r.status));

  // Prüfe NA/NEF-Konstellation vorab
  const hasNA = patient.suggestedResources.includes('UHS-Notarzt oder NEF');
  const hasNEF = patient.suggestedResources.includes('NEF');
  const nefRTMs = assignedRTMs.filter(rtm => rtm.rtmType === 82 || rtm.rtmType === 'RTH');

  // Für jede Ressource prüfen
  patient.suggestedResources.forEach(resource => {
    let shouldDispatch = false;

    // 1. Trupp-Logik
    if (resource === 'Trupp' && assignedTrupps.length > 0) {
      shouldDispatch = true;
    }

    // 2. RTM-Logik
    if (resource === 'RTM' && assignedRTMs.length > 0) {
      shouldDispatch = true;
    }

    // 3. RTM-Type-spezifische Disposition-Status-Setzung
    // ALLE RTMs durchgehen, nicht nur das erste
    assignedRTMs.forEach(assignedRTM => {
      if (assignedRTM.rtmType) {
        const rtmType = assignedRTM.rtmType;
        
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
            // NA explizit NICHT dispatched setzen
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

    // 4. "Ggf."-Ressourcen-Logik
    // Wenn die Ressource mit "Ggf. " beginnt, prüfe ob die entsprechende Basisressource erfüllt ist
    if (resource.startsWith('Ggf. ')) {
      const baseResource = resource.replace('Ggf. ', '');
      
      // Prüfe ob die Basisressource durch RTM-Typen erfüllt wird
      assignedRTMs.forEach(assignedRTM => {
        if (assignedRTM.rtmType) {
          const rtmType = assignedRTM.rtmType;
          
          // RTW durch Typ 80, 81, 83, 89
          if (baseResource === 'RTW' && [80, 81, 83, 89].includes(rtmType)) {
            shouldDispatch = true;
          }
          // NEF durch Typ 80, 81, 82, RTH
          if (baseResource === 'NEF' && [80, 81, 82, 'RTH'].includes(rtmType)) {
            shouldDispatch = true;
          }
          // UHS-Notarzt oder NEF durch Typ 80, 81, 82, RTH
          if (baseResource === 'UHS-Notarzt oder NEF' && [80, 81, 82, 'RTH'].includes(rtmType)) {
            shouldDispatch = true;
          }
        }
      });
      
      // Auch Trupp für "Ggf. Trupp" prüfen
      if (baseResource === 'Trupp' && assignedTrupps.length > 0) {
        shouldDispatch = true;
      }
    }

    // Status setzen
    if (shouldDispatch) {
      patient.dispositionStatus[resource] = 'dispatched';
    }
  });
}

/**
 * Renders and updates the patient cards UI based on the current patient and team data
 * stored in localStorage. Patients are sorted and displayed in different sections
 * according to their status. The function also ensures data consistency, initializes
 * missing fields, and attaches event handlers for patient actions.
 *
 * @param {number} [highlightId] - Optional patient ID to highlight after rendering.
 */
function loadPatients(highlightId) {
  if (!document.getElementById("activePatients")) return;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const rtms = JSON.parse(localStorage.getItem("rtms")) || [];
  const scrollY = window.scrollY;

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
    // 3) durations-Objekt sicherstellen
    p.durations = {
      einsatzdauer: p.durations?.einsatzdauer ?? "",
      dispositionsdauer: p.durations?.dispositionsdauer ?? "",
      ausrueckdauer: p.durations?.ausrueckdauer ?? "",
      behandlungsdauer: p.durations?.behandlungsdauer ?? "",
      verlegedauerUHS: p.durations?.verlegedauerUHS ?? "",
    };
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

<div style="margin-top:8px;">
<div class="zeitdaten">
<strong>Zeitdaten (mm:ss):</strong>
<table>
<thead>
<tr>
</tr>
</thead>
<tbody>
<tr>
  <td>Einsatzdauer</td>
  <td>
    <span class="timer einsatzdauer" data-id="${patient.id}">
      ${
        patient.durations.einsatzdauer ||
        formatMS(Date.now() - patient.createdAt)
      }
    </span>
  </td>
</tr>
<tr>
  <td>Dispositionsdauer</td>
  <td>
    <span class="timer dispositionsdauer" data-id="${patient.id}">
      ${patient.durations.dispositionsdauer || "–"}
    </span>
  </td>
</tr>
<tr>
  <td>Ausrückdauer</td>
  <td>
    <span class="timer ausrueckdauer" data-id="${patient.id}">
      ${patient.durations.ausrueckdauer || "–"}
    </span>
  </td>
</tr>
<tr>
<td>Behandlungsdauer</td>
<td>
<span class="timer behandlungsdauer" data-id="${patient.id}">
${patient.durations.behandlungsdauer || "–"}
</span>
</td>
</tr>
<tr>
  <td>Verlegedauer (in UHS)</td>
  <td>
    <span class="timer verlegedauerUHS" data-id="${patient.id}">
      ${patient.durations.verlegedauerUHS || "–"}
    </span>
  </td>
</tr>
</tbody>
</table>
</div>



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
  <!-- ➊ Tabelle für Verdachtsdiagnose & Dispositionsvorschlag -->
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
        (t, i) =>
          `<span>${t}${
            !isFinal
              ? ` <button class="reset-btn" onclick="removeTrupp(${patient.id},${i})">X</button>`
              : ``
          }</span>`
      )
      .join("<br>") || "–"
  }<br>
  ${truppSelect}
</div>

<div style="min-width:200px;">
  <strong>RTM:</strong><br>
  ${
    (patient.rtm || [])
      .map(
        (r, i) =>
          `<span>${r}${
            !isFinal
              ? ` <button class="reset-btn" onclick="removeRtm(${patient.id},${i})">X</button>`
              : ``
          }</span>`
      )
      .join("<br>") || "–"
  }<br>
  <button class="meldung-btn" onclick="assignResource(${patient.id}, 'rtm')" ${
      isFinal ? "disabled" : ""
    }>
    RTM disponieren
  </button>
</div>

<div style="min-width:240px;">
<strong>Nachforderung:</strong>
<div style="display:flex; gap:8px; align-items:flex-start; margin-top:4px;">
${!["Entlassen", "Transport in KH"].includes(patient.status) ? `
  <div style="flex:1;">
    ${requestBox}
  </div>
` : ''}
<div>
${dispoButtons}
</div>
</div>
</div>

<!-- Dispositionssymbole generieren - vereinfacht für Debugging -->
<div class="disposition-symbols" style="display: flex; flex-direction: column; gap: 4px; margin: 8px 0;">
  <span style="font-weight: bold; margin-bottom: 4px;">Dispositionsvorschlag:</span>
  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
    ${
      patient.suggestedResources && Array.isArray(patient.suggestedResources) && patient.suggestedResources.length > 0
        ? patient.suggestedResources
            .map((resource) => {
              const abbrev = getResourceAbbreviation(resource);
              const isDispatched = patient.dispositionStatus[resource] === 'dispatched';
              const isIgnored = patient.dispositionStatus[resource + '_ignored'] === true;
              
              return `<span class="disposition-symbol ${isDispatched ? 'dispatched' : 'required'} ${isIgnored ? 'ignored' : ''}"
                       style="display: inline-block; padding: 2px 6px; margin: 0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; white-space: nowrap;
                       ${isDispatched || isIgnored ? '' : ' animation: blink 1.5s infinite;'}"
                       onclick="toggleDispositionStatus(${patient.id}, '${resource.replace(/'/g, "\\'")}')"
                       oncontextmenu="toggleDispositionIgnore(event, ${patient.id}, '${resource.replace(/'/g, "\\'")}')"
                       title="${resource}">
                       ${abbrev}</span>`;
            })
            .join("")
        : '<div style="margin: 8px 0; color: #666; font-style: italic;">Keine Dispositionsvorschläge verfügbar</div>'
    }
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
  window.scrollTo(0, scrollY); 
}