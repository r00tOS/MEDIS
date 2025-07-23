function renderTrupps() {
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
          <div class="end-buttons" style="display:inline-flex; gap:8px; margin-left:8px;">
            <button
              class="status-transport-in-kh"
              onclick="transportPatient(${trupp.patientInput})"
            >
              Transport in KH
            </button>
            <button
              class="status-entlassen"
              onclick="dischargePatient(${trupp.patientInput})"
            >
              Entlassen
            </button>
          </div>
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

  // DEBUG: Patientendaten loggen
  console.log("Patient gefunden:", patient);
  console.log("suggestedResources:", patient.suggestedResources);

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

  // Dispositionssymbole generieren - vereinfacht für Debugging
  let dispositionSymbols = '';
  
  if (patient.suggestedResources && Array.isArray(patient.suggestedResources) && patient.suggestedResources.length > 0) {
    console.log("Generiere Dispositionssymbole für:", patient.suggestedResources);
    
    dispositionSymbols = '<div class="disposition-symbols" style="display: flex; flex-direction: column; gap: 4px; margin: 8px 0;">' +
      '<span style="font-weight: bold; margin-bottom: 4px;">Dispositionsvorschlag:</span>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
    
    patient.suggestedResources.forEach(resource => {
      const abbrev = getResourceAbbreviation(resource);
      
      // Status aus den Patientendaten abrufen (standardmäßig unavailable)
      if (!patient.dispositionStatus) {
        patient.dispositionStatus = {};
        // Patientendaten zurück speichern, da wir das Objekt modifiziert haben
        const allPatients = JSON.parse(localStorage.getItem("patients")) || [];
        const patientIndex = allPatients.findIndex(p => p.id === patient.id);
        if (patientIndex >= 0) {
          allPatients[patientIndex] = patient;
          localStorage.setItem("patients", JSON.stringify(allPatients));
        }
      }
      
      // Automatische Disposition-Status-Setzung
      // 1. Prüfen ob ein Trupp diesem Patienten zugeordnet ist
      const assignedTrupp = trupps.find(t => t.patientInput === patient.id && [3, 4, 7, 8].includes(t.status));
      
      // 2. Wenn ein Trupp zugeordnet ist und es sich um "Trupp" handelt, automatisch auf dispatched setzen
      if (assignedTrupp && resource === 'Trupp') {
        patient.dispositionStatus[resource] = 'dispatched';
      }
      
      // 3. Prüfen ob mehrere Trupps zugeordnet sind → First Responder aktivieren
      if (resource === 'First Responder') {
        const assignedTrupps = trupps.filter(t => t.patientInput === patient.id && [3, 4, 7, 8].includes(t.status));
        
        // Wenn mehr als ein Trupp zugeordnet ist, First Responder automatisch auf dispatched setzen
        if (assignedTrupps.length > 1) {
          patient.dispositionStatus[resource] = 'dispatched';
        }
      }
      
      const isDispatched = patient.dispositionStatus[resource] === 'dispatched';
      console.log(`Resource ${resource}: ${isDispatched ? 'dispatched' : 'required'}`);
      
      dispositionSymbols += '<span class="disposition-symbol ' + (isDispatched ? 'dispatched' : 'required') +
             '" style="display: inline-block; padding: 2px 6px; margin: 0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; white-space: nowrap;' +
             (isDispatched ? '' : ' animation: blink 1.5s infinite;') + '"' +
             ' onclick="toggleDispositionStatus(' + patient.id + ', \'' + resource.replace(/'/g, "\\'") + '\')" title="' + resource + '">' +
             abbrev + '</span>';
    });
    
    dispositionSymbols += '</div></div>';
  } else {
    console.log("Keine suggestedResources gefunden oder Array ist leer");
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

  <button
    class="meldung-btn edit-info-btn"
    onclick="openEditModal(${patient.id})"
  >
    ✏️ Patientendaten bearbeiten
  </button>
</div>
  `;
})()}



          <p>${timeDisplay}</p>
          ${progressBar}
          <p>${gesamtPause}</p>

          <p><strong>Einsatzorte:</strong><br>
            ${
              trupp.einsatzHistorie.length
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
              trupp.patientHistorie.length
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

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Schaltet den Status einer Disposition (dispatched/required) um
 * @param {number} patientId - ID des Patienten
 * @param {string} resource - Name der Ressource
 */
function toggleDispositionStatus(patientId, resource) {
  // Alle Patienten aus localStorage abrufen
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  
  // Den entsprechenden Patienten finden
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return;
  
  // Disposition Status initialisieren falls nicht vorhanden
  if (!patient.dispositionStatus) {
    patient.dispositionStatus = {};
  }
  
  // Status umschalten
  const isCurrentlyDispatched = patient.dispositionStatus[resource] === 'dispatched';
  if (isCurrentlyDispatched) {
    delete patient.dispositionStatus[resource]; // 'required' ist der Standard
  } else {
    patient.dispositionStatus[resource] = 'dispatched';
  }
  
  // Patienten-Daten zurück in localStorage speichern
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Event für Aktualisierung auslösen
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "patients",
      newValue: JSON.stringify(patients),
    })
  );
  
  // Trupp-Karten neu rendern
  renderTrupps();
}