function onSearchInput() {
  const term = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const resultsDiv = document.getElementById("searchResults");

  if (term === "") {
    // Leeres Suchfeld → zurück zu normalem Modus
    resultsDiv.style.display = "none";
    document.getElementById("categoryList").style.display = "block";
    document.getElementById("keywordList").style.display = "block";
    return;
  }

  // Suche in allen Kategorien→Keywords
  const hits = [];
  alarmConfig.forEach((cat, ci) => {
    cat.keywords.forEach((kw, ki) => {
      if (kw.word.toLowerCase().includes(term)) {
        hits.push({ ci, ki, word: kw.word });
      }
    });
  });

  // Ergebnis-Liste aufbauen
  resultsDiv.innerHTML = "";
  hits.forEach((hit) => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = `${alarmConfig[hit.ci].name} ➔ ${hit.word}`;
    div.onclick = () => {
      // Treffer auswählen und Modal zurücksetzen
      selectedCategory = hit.ci;
      selectedKeyword = hit.ki;
      document.getElementById("searchInput").value = hit.word;
      document.getElementById("otherDetail").style.display = /^sonstiger/i.test(
        hit.word
      )
        ? "block"
        : "none";
    };
    resultsDiv.appendChild(div);
  });

  // UI-Umschaltung
  resultsDiv.style.display = "block";
  document.getElementById("categoryList").style.display = "none";
  document.getElementById("keywordList").style.display = "none";
}

function openKeywordModal(patientId) {
  currentPatientId = patientId;
  selectedCategory = null;
  selectedKeyword = null;
  document.getElementById("searchInput").value = "";
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("categoryList").style.display = "block";
  document.getElementById("keywordList").style.display = "block";
  renderCategoryList();
  document.getElementById("keywordList").innerHTML = "";
  document.getElementById("keywordModal").style.display = "flex";
}

// Funktion zum Rendern der Kategorienliste
function renderCategoryList() {
  const catDiv = document.getElementById("categoryList");
  catDiv.innerHTML = "";  // Leeren der Kategorie-Liste

  alarmConfig.forEach((c, i) => {
    const d = document.createElement("div");
    d.textContent = c.name;
    d.className = "item";  // Keine "selected"-Markierung hinzufügen
    if (selectedCategory === i) {
      d.classList.add("selected");  // Markiere die ausgewählte Kategorie
    }
    d.onclick = () => {
      selectedCategory = i; // Setzen der ausgewählten Kategorie
      selectedKeyword = null; // Zurücksetzen der ausgewählten Keywords
      renderCategoryList(); // Erneutes Rendern der Kategorie-Liste
      renderKeywordList();  // Erneutes Rendern der Keyword-Liste
    };
    catDiv.appendChild(d);
  });
}

function renderKeywordList() {
  const kwDiv = document.getElementById("keywordList");
  kwDiv.innerHTML = "";
  document.getElementById("otherDetail").style.display = "none"; // immer verstecken
  if (selectedCategory === null) return;

  alarmConfig[selectedCategory].keywords.forEach((kw, j) => {
    const d = document.createElement("div");
    d.textContent = kw.word;
    d.className = "item" + (selectedKeyword === j ? " selected" : "");
    d.onclick = () => {
      selectedKeyword = j;
      renderKeywordList();
      // Wenn das Wort mit "sonstiger" (case-insensitive) anfängt → Feld einblenden
      if (/^sonstiger/i.test(kw.word)) {
        document.getElementById("otherDetail").style.display = "block";
        document.getElementById("otherInput").value = "";
      } else {
        document.getElementById("otherDetail").style.display = "none";
      }
    };
    kwDiv.appendChild(d);
  });
}

function confirmKeyword() {
  if (selectedCategory === null || selectedKeyword === null) {
    return alert("Bitte Kategorie und Stichwort wählen");
  }
  let cfg = alarmConfig[selectedCategory].keywords[selectedKeyword];
  let finalWord = cfg.word;

  // Wenn Zusatz-Feld sichtbar, hänge den Input an
  if (document.getElementById("otherDetail").style.display === "block") {
    const extra = document.getElementById("otherInput").value.trim();
    if (!extra) {
      return alert("Bitte die Art des Notfalls genauer beschreiben.");
    }
    finalWord += " – " + extra;
  }

  // 1) Diagnosis-Feld setzen
  updatePatientData(currentPatientId, "diagnosis", finalWord);

  // 2) vorgeschlagene Ressourcen speichern
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const p = patients.find((x) => x.id === currentPatientId);
  if (p) {
    p.suggestedResources = cfg.resources;
    localStorage.setItem("patients", JSON.stringify(patients));
  }

  closeKeywordModal();
  loadPatients(currentPatientId);
}

function closeKeywordModal() {
  document.getElementById("keywordModal").style.display = "none";
}

// aus categories.js kommt window.alarmConfig = { categories: [ … ] }
const alarmConfig = window.alarmConfig.categories;

if (!document.getElementById("nachforderungModal")) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div id="nachforderungModal" class="modal" style="display:none; z-index:2000">
      <div class="modal-content">
        <span class="close" onclick="closeNachforderungModal()">&times;</span>
        <h2>Nachforderung disponieren</h2>
        <div style="margin-bottom:14px">
          <strong id="nachforderungRequestType"></strong>
        </div>
        <div style="margin-bottom:12px;">
          <label style="margin-right:18px;">
            <input type="radio" name="nachforderungArt" id="nachforderungTruppRadio" value="trupp" onchange="renderNachforderungModalBody()"> Trupp disponieren
          </label>
          <label>
            <input type="radio" name="nachforderungArt" id="nachforderungRtmRadio" value="rtm" onchange="renderNachforderungModalBody()"> RTM disponieren
          </label>
        </div>
        <div id="nachforderungTruppDiv" style="margin-bottom:12px; display:none;">
          <label for="nachforderungTruppSelect">Trupp auswählen:</label><br>
          <select id="nachforderungTruppSelect" style="width:100%;margin-top:3px"></select>
        </div>
        <div id="nachforderungRtmDiv" style="margin-bottom:12px; display:none;">
          <label for="nachforderungRtmInput">RTM-Kennung eintragen:</label><br>
          <input type="text" id="nachforderungRtmInput" style="width:100%;margin-top:3px">
        </div>
        <button class="confirm-btn" onclick="confirmNachforderungModal()">Bestätigen</button>
      </div>
    </div>
  `
  );
}

// ENTER-Taste im Nachforderungs-Modal bestätigt das Modal
document.addEventListener("keydown", function (e) {
  const modal = document.getElementById("nachforderungModal");
  if (modal && modal.style.display === "flex" && e.key === "Enter") {
    e.preventDefault();
    confirmNachforderungModal();
  }
});

const modalTemplate = `
<div id="keywordModal" class="modal" style="display:none">
  <div class="modal-content">
    <span class="close" onclick="closeEditModal()">&times;</span>

    <h2 id="editModalTitle" class="modal-title">Patient</h2>

    <!-- Batch-Edit Felder -->
    <div class="batch-edit-fields">
      <!-- 1. Alter -->
      <label for="editAge">
        Alter:
        <input type="number" id="editAge" tabindex="1" />
      </label>

      <!-- 2. Geschlecht -->
      <fieldset tabindex="2">
        <legend>Geschlecht:</legend>
        <label><input type="radio" name="editGender" value="M" /> M</label>
        <label><input type="radio" name="editGender" value="W" /> W</label>
        <label><input type="radio" name="editGender" value="D" /> D</label>
      </fieldset>

      <!-- 3. Standort -->
      <label for="editLocation">
        Standort:
        <input type="text" id="editLocation" tabindex="6" />
      </label>

      <!-- 4. Bemerkung -->
      <label for="editRemarks">
        Bemerkung:
        <input type="text" id="editRemarks" tabindex="7" />
      </label>
    </div>

    <!-- Keyword-Picker -->
    <input
      type="text"
      id="searchInput"
      placeholder="Stichwort suchen…"
      oninput="onSearchInput()"
      tabindex="8"
    />
    <div style="display:flex; gap:10px; height:400px;">
      <div id="categoryList" class="list" tabindex="9"></div>
      <div id="keywordList" class="list" tabindex="10"></div>
      <div id="searchResults" class="list" style="display:none" tabindex="11"></div>
    </div>

    <div id="otherDetail" style="margin-top:10px; display:none">
  <label for="otherInput"><strong>Bitte genauer beschreiben:</strong></label><br>
  <input
    type="text"
    id="otherInput"
    style="width:100%; padding:6px; box-sizing:border-box" />
</div>

    <button class="confirm-btn" onclick="confirmEdit()" tabindex="12">
      Bestätigen
    </button>
  </div>
</div>`;

let editPatientId = null;
let currentPatientId = null;
let selectedCategory = null;
let selectedKeyword = null;

// Helper: Modal injizieren und öffnen/schließen
let modalInjected = false;

document.addEventListener("DOMContentLoaded", () => {
  if (!modalInjected) {
    document.body.insertAdjacentHTML("beforeend", modalTemplate);
    modalInjected = true;
    renderCategoryList();
  }
});

// openEditModal(), confirmEdit(), closeEditModal(),
// onSearchInput(), renderCategoryList(), renderKeywordList() …
// sowie alle Variablen wie selectedCategory, selectedKeyword
// musst du dort unten ebenfalls einfügen.

// --- Nachforderung Modal globale Variablen ---
let nachforderungPatientId = null;
let nachforderungRequest = null;

// Modal in DOM injizieren, falls noch nicht geschehen
if (!document.getElementById("nachforderungModal")) {
  document.body.insertAdjacentHTML("beforeend" /* ...HTML siehe oben... */);
}

// Modal öffnen
function openNachforderungModal(patientId, request) {
  nachforderungPatientId = patientId;
  nachforderungRequest = request;
  // Modal-Felder zurücksetzen:
  document.getElementById("nachforderungTruppRadio").checked = false;
  document.getElementById("nachforderungRtmRadio").checked = false;
  document.getElementById("nachforderungTruppDiv").style.display = "none";
  document.getElementById("nachforderungRtmDiv").style.display = "none";
  document.getElementById("nachforderungRequestType").textContent = request;

  // **Dieses Feld immer leeren!**
  document.getElementById("nachforderungRtmInput").value = "";

  // Trupp-Liste vorbereiten (wie gehabt)
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const excluded = [6, 3, 12, 4, 7, 8];
  const options = trupps
    .filter((t) => !excluded.includes(t.status))
    .map((t) => `<option value="${t.name}">${t.name}</option>`)
    .join("");
  document.getElementById("nachforderungTruppSelect").innerHTML =
    `<option value="">Wählen…</option>` + options;

  document.getElementById("nachforderungModal").style.display = "flex";
}

function renderNachforderungModalBody() {
  const art = document.querySelector('input[name="nachforderungArt"]:checked');
  const showTrupp = art && art.value === "trupp";
  const showRtm = art && art.value === "rtm";
  document.getElementById("nachforderungTruppDiv").style.display = showTrupp
    ? "block"
    : "none";
  document.getElementById("nachforderungRtmDiv").style.display = showRtm
    ? "block"
    : "none";
}

// Modal schließen
function closeNachforderungModal() {
  document.getElementById("nachforderungModal").style.display = "none";
  nachforderungPatientId = null;
  nachforderungRequest = null;
}

// Bestätigen-Handler
function confirmNachforderungModal() {
  const art = document.querySelector('input[name="nachforderungArt"]:checked');
  if (!art) {
    alert("Bitte auswählen, ob Trupp oder RTM disponiert werden soll.");
    return;
  }
  const useTrupp = art.value === "trupp";
  const useRtm = art.value === "rtm";
  if (!useTrupp && !useRtm) {
    alert("Bitte auswählen, ob Trupp oder RTM disponiert werden soll.");
    return;
  }
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === nachforderungPatientId);
  if (!patient) return alert("Patient nicht gefunden!");
  if (!patient.disposed) patient.disposed = {};

  let entryText = nachforderungRequest;
  let details = {};

  if (useTrupp) {
    const sel = document.getElementById("nachforderungTruppSelect");
    const trupp = sel.value;
    if (!trupp) {
      alert("Bitte einen Trupp auswählen.");
      return;
    }
    // Eintragen (wie assignSelectedTrupp)
    if (!Array.isArray(patient.team)) patient.team = [];
    patient.team.push(trupp);

    // Status-Logik mit korrekter Timestamp-Behandlung
    const oldStatus = patient.status;
    if (patient.status === "gemeldet") {
      patient.status = "disponiert";
      patient.history = patient.history || [];
      patient.history.push(`${getCurrentTime()} Status: disponiert`);
      
      // Timestamps korrekt setzen
      const now = Date.now();
      patient.statusTimestamps = patient.statusTimestamps || {};
      if (!patient.statusTimestamps.disponiert) {
        patient.statusTimestamps.disponiert = now;
      }
      
      // Timer-Berechnung für Statuswechsel
      recordStatusChange(patient, "disponiert");
    }
    
    // History: Nachforderung + Trupp zugeordnet
    entryText += ` → Trupp ${trupp} disponiert`;
    details.trupp = trupp;

    // Trupp-Tracker updaten (wie in assignSelectedTrupp)
    const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
    const t = trupps.find((t) => t.name === trupp);
    if (t) {
      const now = Date.now();
      // a) ggf. laufenden Einsatz beenden
      if (t.currentOrt && t.einsatzStartOrt) {
        t.einsatzHistorie = t.einsatzHistorie || [];
        t.einsatzHistorie.push({
          ort: t.currentOrt,
          von: t.einsatzStartOrt,
          bis: now,
        });
      }
      t.status = 3;
      t.patientInput = patient.id;
      t.patientStart = now;
      t.currentEinsatzStart = now;
      t.currentPauseStart = null;
      localStorage.setItem("trupps", JSON.stringify(trupps));
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "trupps",
          newValue: JSON.stringify(trupps),
        })
      );
    }
  }

  if (useRtm) {
    const rtmKennung = document
      .getElementById("nachforderungRtmInput")
      .value.trim();
    if (!rtmKennung) {
      alert("Bitte RTM-Kennung eintragen.");
      return;
    }
    if (!Array.isArray(patient.rtm)) patient.rtm = [];
    patient.rtm.push(rtmKennung);
    entryText += ` → RTM ${rtmKennung} disponiert`;
    details.rtm = rtmKennung;
    
    // Status-Logik mit korrekter Timestamp-Behandlung
    const oldStatus = patient.status;
    if (patient.status === "gemeldet") {
      patient.status = "disponiert";
      patient.history = patient.history || [];
      patient.history.push(`${getCurrentTime()} Status: disponiert`);
      
      // Timestamps korrekt setzen
      const now = Date.now();
      patient.statusTimestamps = patient.statusTimestamps || {};
      if (!patient.statusTimestamps.disponiert) {
        patient.statusTimestamps.disponiert = now;
      }
      
      // Timer-Berechnung für Statuswechsel
      recordStatusChange(patient, "disponiert");
    }
  }

  // Nachforderung als "disponiert" markieren, Details speichern
  patient.disposed[nachforderungRequest] = details;
  patient.history = patient.history || [];
  patient.history.push(`${getCurrentTime()} ${entryText}`);

  // Persistieren und UI refresh
  localStorage.setItem("patients", JSON.stringify(patients));
  
  // Storage-Event auslösen
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "patients",
      newValue: JSON.stringify(patients),
    })
  );
  
  closeNachforderungModal();
  loadPatients(nachforderungPatientId);
}

function openEditModal(id) {
  editPatientId = id;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const p = patients.find((x) => x.id === id);
  if (!p) return;

  // 1) Alle Felder vorbefüllen
  document.getElementById("editAge").value = p.age || "";
  document.getElementById("editLocation").value = p.location || "";
  document.getElementById("editRemarks").value = p.remarks || "";

  // 2) Gender-Radios vorbefüllen: erst alle abwählen, dann vorhandenes setzen
  document
    .querySelectorAll('#keywordModal input[name="editGender"]')
    .forEach((radio) => {
      radio.checked = false;
    });
  if (p.gender) {
    const sel = document.querySelector(
      `#keywordModal input[name="editGender"][value="${p.gender}"]`
    );
    if (sel) sel.checked = true;
  }

  // 3) Keyword-Modal zurücksetzen
  selectedCategory = null;  // Kategorie zurücksetzen
  selectedKeyword = null;   // Keyword zurücksetzen

  // 4) UI zurücksetzen
  document.getElementById("searchInput").value = "";  // Suchfeld zurücksetzen
  document.getElementById("otherDetail").style.display = "none";  // Immer ausblenden, wenn keine Kategorie ausgewählt
  document.getElementById("categoryList").style.display = "block";  // Kategorien-Liste einblenden
  document.getElementById("keywordList").style.display = "block";   // Keyword-Liste einblenden
  document.getElementById("searchResults").style.display = "none";  // Suchergebnisse ausblenden

  // Leeren der Keyword-Liste
  document.getElementById("keywordList").innerHTML = "";

  // 5) Alle Kategorie-Auswahlmarkierungen entfernen
  resetCategorySelection();  // Die Kategorien-Darstellung zurücksetzen

  // 6) Rendern der Kategorienliste (nichts ausgewählt)
  renderCategoryList();

  // 7) Modal anzeigen
  const modal = document.getElementById("keywordModal");
  modal.style.display = "flex";

  // 8) Alter-Feld fokussieren
  const ageInput = document.getElementById("editAge");
  if (ageInput) {
    ageInput.focus();
    ageInput.select();
  }

  // 9) Gender-Shortcut: nur aktiv, wenn Gender-Feld fokussiert ist
  const genderFieldset = document.querySelector("#keywordModal fieldset");
  function onGenderKey(e) {
    const k = e.key.toLowerCase();
    if (["m", "w", "d"].includes(k)) {
      const target = document.querySelector(
        `input[name="editGender"][value="${k.toUpperCase()}"]`
      );
      if (target) target.checked = true;
      e.preventDefault();
    }
  }
  // Listener nur auf das Fieldset setzen
  genderFieldset.addEventListener("keydown", onGenderKey);

  // 10) Beim Schließen Listener entfernen
  const closeBtn = modal.querySelector(".close");
  const cleanup = () => {
    modal.removeEventListener("keydown", onGenderKey);
    genderFieldset.removeEventListener("keydown", onGenderKey);
  };
  closeBtn.onclick = () => {
    modal.style.display = "none";
    cleanup();
  };
}

// Funktion zum Zurücksetzen der visuellen Markierungen der Kategorien
function resetCategorySelection() {
  const categoryListItems = document.querySelectorAll('#categoryList .item');
  categoryListItems.forEach(item => {
    item.classList.remove('selected');  // Entfernen der "selected"-Markierung
  });
}

// Funktion zum Zurücksetzen der visuellen Markierungen der Keywords
function resetKeywordSelection() {
  const keywordListItems = document.querySelectorAll('#keywordList .item');
  keywordListItems.forEach(item => {
    item.classList.remove('selected');  // Entfernen der "selected"-Markierung
  });
}


 /**
 * Schließt das Edit-/Keyword-Modal.
 */
function closeEditModal() {
  const modal = document.getElementById("keywordModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// ==== Einsatzort-Modal hinzufügen ====
const einsatzortModalTemplate = `
<div id="einsatzortModal" class="modal" style="display:none; z-index:2000">
  <div class="modal-content">
    <span class="close" onclick="closeEinsatzortModal()">&times;</span>
    <h2>Einsatzgebiet wählen</h2>
    <ul id="presetList" class="list"></ul>
    <div style="margin-top:1em">
      <input
  type="text"
  id="customEinsatzort"
  placeholder="Eigenen Ort eingeben…"
  style="width: 100%; max-width: 400px; padding: 8px; font-size: 1rem; box-sizing: border-box;"
/>
    </div>
    <div style="margin-top:1em; text-align:right">
      <button onclick="closeEinsatzortModal()">Abbrechen</button>
      <button class="confirm-btn" id="confirmEinsatzort">OK</button>
    </div>
  </div>
</div>
`;
document.body.insertAdjacentHTML("beforeend", einsatzortModalTemplate);

// globale Variable für den gerade bearbeiteten Trupp-Index
let _pendingTruppIndex = null;