function renderRTMs() {
  const scrollY = window.scrollY;
  const now = Date.now();
  const openId = localStorage.getItem("openRTMId");

  const prevRects = new Map();
  document.querySelectorAll(".rtm").forEach((el) => {
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

  rtms.forEach((rtm, i) => {
    if (!rtm.id)
      rtm.id = "rtm_" + Math.random().toString(36).substring(2, 10);
    const div = document.createElement("div");
    const statusDefs = window.statusOptions;
    const currentDef = statusDefs.find(o => o.status === rtm.status) || statusDefs[0];
    const opt = window.statusOptions.find(o => o.status === rtm.status);
    const statusLabel = opt
    ? `${rtm.status} – ${opt.text}`
    : String(rtm.status);

    div.className = "rtm";
    div.dataset.key = rtm.name;
    div.dataset.rtmId = rtm.id;
    div.dataset.rtmIndex = i; // Für Kontextmenü
    
    // Rechtsklick-Event für Kontextmenü hinzufügen
    div.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      // Kontextmenü immer anzeigen, nicht nur bei Patient-Status
      showRTMContextMenu(event, i, rtm.patientInput);
    });
    
    // wenn diese ID die gespeicherte offene ist, öffnen wir sie gleich
    const isOpen = rtm.id === openId;
    if (isOpen) div.classList.add('show-status-buttons');

    const einsatzzeit = rtm.einsatzzeit || 0;
    let pausenzeit = rtm.pausenzeit || 0;
    let totalPause = rtm.totalPauseTime || 0;

    if (rtm.currentEinsatzStart && einsatzzeit > nextMaxEinsatzTime * 60000)
      div.classList.add("ueberzogen");
    if (rtm.status === 61)
      div.classList.add("rueckhaltung");
    if (rtm.status === 12) div.classList.add("spielfeldrand");
    if ([3, 4, 7, 8].includes(rtm.status))
      div.classList.add("patient");
    // 1)gemeinsame Einsatz-Gruppe
    if (
      [11, 12, 0].includes(
        rtm.status
      )
    ) {
      div.classList.add("einsatz");
      // und wenn es genau 0 ist, den lila Style
      if (rtm.status === 0) {
        div.classList.add("einsatz-beendet");
      }
    }
    // 2) Pause-Status
    else if (
      [1, 2, 61].includes(rtm.status)
    ) {
      div.classList.add("pause");
    }
    // 3) alle anderen → nicht einsatzbereit
    else {
      div.classList.add("nicht-einsatzbereit");
    }

    const min = (ms) => Math.floor(ms / 60000);
    const timeDisplay =
      rtm.currentEinsatzStart &&
      rtm.status !== 61
        ? `Aktuelle Einsatzzeit: ${min(einsatzzeit)} Min`
        : `Aktuelle Pausenzeit: ${min(pausenzeit)} Min${
            rtm.status === 61
              ? " (Rückhaltung zählt als Pause)"
              : ""
          }`;

    const gesamtPause = `Gesamte Pausenzeit: ${min(totalPause)} Min`;

    const progress =
      rtm.currentEinsatzStart &&
      rtm.status !== 61
        ? Math.min(einsatzzeit / (nextMaxEinsatzTime * 60000), 1)
        : 0;
    const progressBar =
      rtm.currentEinsatzStart &&
      rtm.status !== 61
        ? `<div style='background:#ccc;height:8px;border-radius:4px;margin-top:4px;'>
     <div style='height:8px;width:${Math.floor(
       progress * 100
     )}%;background:#28a745;border-radius:4px;'></div>
   </div>`
        : "";
div.innerHTML = `
<div class="rtm-header">
  <h3>
    ${rtm.name}
  </h3>
  ${rtm.status === 6
    ? `<button class="delete-btn" onclick="deleteRTM(${i})">×</button>`
    : ''}
  </div>

 <div class="status-dropdown">
  <button
    class="status-toggle"
    onclick="toggleRTMStatusDropdown('${rtm.id}')"
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

  <ul class="status-menu${rtm.id === openId ? ' open' : ''}">
    ${statusDefs.map(o => `
    <li
      class="${o.status === currentDef.status ? 'active' : ''}"
      onclick="onRTMStatusSelected(${i}, ${o.status}, '${rtm.id}')"
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

  ${![61, 1].includes(rtm.status)
  ? `
    <button class="meldung-btn" onclick="copyToClipboard('${rtm.name}')">
    Meldung
    </button>
    ${[3,4,7,8].includes(rtm.status)
    ? `
    `
    : ``
    }
  `
  : ``
  }
</div>


      ${
    rtm.status === 11
      ? `<p><strong>${
        rtm.currentOrt || "kein Einsatzort"
      }</strong> <button onclick="editOrt(${i})">✎</button></p>`
      : ""
    }
${(() => {
  // nur für Patient-Status 3, 4, 7, 8
  if (![3, 4, 7, 8].includes(rtm.status)) {
    return "";
  }

  // Check if rtm.patientInput exists
  if (!rtm.patientInput) {
    return "";
  }

  // passenden Patient holen
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find(p => p.id === rtm.patientInput || p.id === String(rtm.patientInput));
  if (!patient) {
    return '<div style="margin: 8px 0; color: #f00; font-style: italic;">Patient nicht gefunden (ID: ' + rtm.patientInput + ')</div>';
  }


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
      'RTM': 'RTM',
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

  // Dispositionssymbole generieren - DEBUG VERSION (wie in render_trupps.js)
  let dispositionSymbols = '';
  
  if (patient.suggestedResources && Array.isArray(patient.suggestedResources) && patient.suggestedResources.length > 0) {
    // Debug-Ausgabe
    console.log('Rendering disposition symbols for patient:', patient.id);
    console.log('Patient disposition status:', patient.dispositionStatus);
    
    dispositionSymbols = '<div class="disposition-symbols" style="display: flex; flex-direction: column; gap: 4px; margin: 8px 0;">' +
      '<span style="font-weight: bold; margin-bottom: 4px;">Dispositionsvorschlag:</span>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
    
    patient.suggestedResources.forEach(resource => {
      const abbrev = getResourceAbbreviation(resource);
      
      if (!patient.dispositionStatus) {
        patient.dispositionStatus = {};
      }
      
      const isDispatched = patient.dispositionStatus[resource] === 'dispatched';
      const isIgnored = patient.dispositionStatus[resource + '_ignored'] === true;
      
      console.log(`Resource: ${resource}, isDispatched: ${isDispatched}, isIgnored: ${isIgnored}`);
      
      // CSS-Klassen mit klarer Priorität: dispatched > ignored > required
      let cssClass = 'disposition-symbol ';
      if (isDispatched) {
        // Dispatched überschreibt alle anderen Status
        cssClass += 'dispatched';
        console.log(`Applied CSS class: ${cssClass}`);
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
  } else {
    dispositionSymbols = '<div style="margin: 8px 0; color: #666; font-style: italic;">Keine Dispositionsvorschläge verfügbar</div>';
  }

  // jetzt das Markup mit <table> und <caption>
  return `
<div class="patient-summary">
  <table class="patient-summary-table">
    <caption>Patient ${rtm.patientInput}</caption>
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
        rtm.einsatzHistorie.length
        ? rtm.einsatzHistorie
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
        rtm.patientHistorie.length
        ? rtm.patientHistorie
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
  rtm.status === 12
    ? 99
    : [3, 4, 7, 8].includes(rtm.status)
      ? 2
      : rtm.status === 0
        ? 1
        : 0;
    if (
      [11, 3, 12, 0, 4, 7, 8].includes(
        rtm.status
      )
    )
      einsatz.push({ el: div, sort: einsatzSort });
    else if (
      [2, 1].includes(rtm.status)
    )
      pause.push({ el: div, sort: pausenzeit });
    else if (rtm.status === 61)
      pause.push({ el: div, sort: -1 });
    else nicht.push({ el: div, sort: pausenzeit });
  });

  // 1) Im Einsatz: sortiere absteigend nach aktueller Einsatzzeit
  // --- am Ende von renderRTM(), statt deiner jetzigen drei .sort-Blöcke ---

  // 1) IM EINSATZ: erst nach Status-Priorität (sort), dann nach Einsatzzeit absteigend
  einsatz
    .sort((a, b) => {
      if (a.sort !== b.sort) return a.sort - b.sort;
      const tA =
        rtms.find((t) => t.name === a.el.dataset.key).einsatzzeit || 0;
      const tB =
        rtms.find((t) => t.name === b.el.dataset.key).einsatzzeit || 0;
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
      const trA = rtms.find((t) => t.name === a.el.dataset.key);
      const trB = rtms.find((t) => t.name === b.el.dataset.key);
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
        rtms.find((t) => t.name === a.el.dataset.key).pausenzeit || 0;
      const pB =
        rtms.find((t) => t.name === b.el.dataset.key).pausenzeit || 0;
      return pB - pA;
    })
    .forEach((t) => nichtContainer.appendChild(t.el));

// am Ende von renderRTM(), kurz vor dem schließenden '}':

// 1) Scroll zurücksetzen
window.scrollTo(0, scrollY);

// 2) FLIP: First
const cards = Array.from(document.querySelectorAll(".rtm"));
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
    // Animation beim Schließen
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
