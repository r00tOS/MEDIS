// sites/main.js

// aus categories.js kommt window.alarmConfig = { categories: [ … ] }
const alarmConfig = window.alarmConfig.categories;

if (!document.getElementById("nachforderungModal")) {
  document.body.insertAdjacentHTML('beforeend', `
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
  `);
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

    <h2 id="editModalTitle" class="modal-title">Patient ‎</h2>

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

let editPatientId     = null;
let currentPatientId  = null;
let selectedCategory  = null;
let selectedKeyword   = null;

// Helper: Modal injizieren und öffnen/schließen
  document.body.insertAdjacentHTML('beforeend', modalTemplate);
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('beforeend', modalTemplate);
  renderCategoryList();
});

// openEditModal(), confirmEdit(), closeEditModal(),
// onSearchInput(), renderCategoryList(), renderKeywordList() …
// sowie alle Variablen wie selectedCategory, selectedKeyword
// musst du dort unten ebenfalls einfügen.

(function(global){
  // 0) globalen Zähler initialisieren und bei storage-Events synchronisieren
  global.nextPatientNumber = parseInt(localStorage.getItem("nextPatientNumber"), 10) || 1;
  window.addEventListener("storage", (e) => {
    if (e.key === "nextPatientNumber") {
      global.nextPatientNumber = parseInt(e.newValue, 10) || 1;
    }
  });

  // 1) zentrale Patient-Erzeugung
  global.newPatient = function({
    team = [],
    location = "",
    initialStatus = "gemeldet",
  } = {}) {
    // ID ziehen und hochzählen
    const next = global.nextPatientNumber;
    global.nextPatientNumber = next + 1;
    localStorage.setItem("nextPatientNumber", String(next + 1));

    // Patientendaten zusammenbauen
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const patient = {
      id: next,
      createdAt: now,
      status: initialStatus,
      statusTimestamps: {
        gemeldet: now,
        ...(initialStatus !== "gemeldet" ? {[initialStatus]: now} : {})
      },
      durations: {
        einsatzdauer: "",
        dispositionsdauer: "",
        ausrueckdauer: "",
        behandlungsdauer: "",
        verlegedauerUHS: ""
      },
      team: Array.isArray(team) ? team : [team],
      location,
      history: [`${timeStr} Status: gemeldet`],
    };

    // in den Storage schreiben und Event feuern
    const all = JSON.parse(localStorage.getItem("patients") || "[]");
    all.push(patient);
    localStorage.setItem("patients", JSON.stringify(all));
    window.dispatchEvent(new StorageEvent("storage", {
      key:      "patients",
      newValue: JSON.stringify(all)
    }));

    return next;
  };

})(window);


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
      document.getElementById("otherDetail").style.display =
        /^sonstiger/i.test(hit.word) ? "block" : "none";
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

function renderCategoryList() {
  const catDiv = document.getElementById("categoryList");
  catDiv.innerHTML = "";
  alarmConfig.forEach((c, i) => {
    const d = document.createElement("div");
    d.textContent = c.name;
    d.className = "item" + (selectedCategory === i ? " selected" : "");
    d.onclick = () => {
      selectedCategory = i;
      selectedKeyword = null;
      renderCategoryList();
      renderKeywordList();
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
  p.suggestedResources = cfg.resources;
  localStorage.setItem("patients", JSON.stringify(patients));

  closeKeywordModal();
  loadPatients(currentPatientId);
}

function closeKeywordModal() {
  document.getElementById("keywordModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  // nur binden, wenn das Element wirklich da ist
  document.getElementById("btnNewPatient")?.addEventListener("click", createNewPatient);
  // loadPatients nur aufrufen, wenn die Patienten‐Container existieren
  if (document.getElementById("activePatients")) {
    loadPatients();
  }
});

function openEditModal(id) {
  editPatientId = id;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const p = patients.find(x => x.id === id);
  if (!p) return;

  // 1) Alle Felder vorbefüllen
  document.getElementById("editAge").value      = p.age      || "";
  document.getElementById("editLocation").value = p.location || "";
  document.getElementById("editRemarks").value  = p.remarks  || "";

  // 2) Gender-Radios vorbefüllen: erst alle abwählen, dann vorhandenes setzen
  document
    .querySelectorAll('#keywordModal input[name="editGender"]')
    .forEach(radio => { radio.checked = false; });
  if (p.gender) {
    const sel = document.querySelector(
      `#keywordModal input[name="editGender"][value="${p.gender}"]`
    );
    if (sel) sel.checked = true;
  }

  // 3) Keyword-Modal resetten
  document.getElementById("searchInput").value = "";
  document.getElementById("otherDetail").style.display = "none";
  document.getElementById("categoryList").style.display  = "block";
  document.getElementById("keywordList").style.display   = "block";
  document.getElementById("searchResults").style.display = "none";
  renderCategoryList();

  // 4) Modal anzeigen
  const modal = document.getElementById("keywordModal");
  modal.style.display = "flex";

  // 5) Alter-Feld fokussieren
  const ageInput = document.getElementById("editAge");
  if (ageInput) {
    ageInput.focus();
    ageInput.select();
  }

  // 6) Gender-Shortcut: nur aktiv, wenn Gender-Feld fokussiert ist
  const genderFieldset = document.querySelector('#keywordModal fieldset');
  function onGenderKey(e) {
    const k = e.key.toLowerCase();
    if (["m","w","d"].includes(k)) {
      const target = document.querySelector(
        `input[name=\"editGender\"][value=\"${k.toUpperCase()}\"]`
      );
      if (target) target.checked = true;
      e.preventDefault();
    }
  }
  // Listener nur auf das Fieldset setzen
  genderFieldset.addEventListener('keydown', onGenderKey);

  // 7) Beim Schließen Listener entfernen
  const closeBtn = modal.querySelector(".close");
  const cleanup = () => {
    modal.removeEventListener('keydown', onGenderKey);
    genderFieldset.removeEventListener('keydown', onGenderKey);
  };
  closeBtn.onclick = () => {
    modal.style.display = "none";
    cleanup();
  };
}





function confirmEdit() {
  // 1) Basis-Daten speichern (Alter, Geschlecht, Standort, Bemerkung)
  const p = JSON.parse(localStorage.getItem("patients"))
                .find(x => x.id === editPatientId);
  if (!p) return alert("Kein Patient geladen");

  // Gender
  const g = document.querySelector('input[name="editGender"]:checked');
  if (g && g.value !== p.gender) {
    updatePatientData(editPatientId, "gender", g.value);
  }
  // Age
  const age = document.getElementById("editAge").value.trim();
  if (age && age !== String(p.age)) {
    updatePatientData(editPatientId, "age", age);
  }
  // Location
  const loc = document.getElementById("editLocation").value.trim();
  if (loc && loc !== p.location) {
    updatePatientData(editPatientId, "location", loc);
  }
  // Remarks
  const rem = document.getElementById("editRemarks").value.trim();
  if (rem && rem !== p.remarks) {
    updatePatientData(editPatientId, "remarks", rem);
  }

  // 2) Stichwort-Diagnose übernehmen (angepasst von confirmKeyword)
  if (selectedCategory === null || selectedKeyword === null) {
  } else {
    const cfg = alarmConfig[selectedCategory].keywords[selectedKeyword];
    let finalWord = cfg.word;

    // falls „sonstiger …“ sichtbar, hänge Zusatztext an
    if (document.getElementById("otherDetail").style.display === "block") {
      const extra = document.getElementById("otherInput").value.trim();
      if (!extra) {
        return alert("Bitte die Art des Notfalls genauer beschreiben.");
      }
      finalWord += " – " + extra;
    }

    // 2a) Diagnose setzen (inkl. Historie)
    updatePatientData(editPatientId, "diagnosis", finalWord);

    // 2b) vorgeschlagene Ressourcen ergänzen
    const arr = JSON.parse(localStorage.getItem("patients")) || [];
    const toUpdate = arr.find(x => x.id === editPatientId);
    if (toUpdate) {
      toUpdate.suggestedResources = cfg.resources;
      localStorage.setItem("patients", JSON.stringify(arr));
      // Storage-Event, damit alle UIs neu rendern
      window.dispatchEvent(new StorageEvent("storage", {
        key:      "patients",
        newValue: JSON.stringify(arr)
      }));
    }

  }

  // 3) Modal schließen & neu rendern
  closeEditModal();
  loadPatients(editPatientId);
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

// 1) Zentrale Update-Funktion
function updatePatientData(id, field, value) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient) return;
  // History-Array initialisieren, falls nötig
  if (!patient.history) patient.history = [];

  // Hilfs-Objekte sicherstellen
  patient.statusTimestamps = patient.statusTimestamps || {};
  patient.durations = patient.durations || {};

  const now = Date.now();

  // 1) Timestamp & Dauer-Kalkulation zentral in recordStatusChange
  function doTimeTracking() {
    recordStatusChange(patient, value);
  }

  // 2) Update von History, Feld, Triggern von recordStatusChange und Speichern
  function applyUpdate() {
    // a) History-Eintrag
    if (field === "status") {
      patient.history.push(`${getCurrentTime()} Status: ${value}`);
    } else if (field === "diagnosis") {
      // kompakten Überblick aller Felder in die Historie
patient.history.push(
  `${getCurrentTime()} Patientendaten geändert: ` +
  `Verdachtsdiagnose=${value}, ` +
  `Alter=${patient.age || "–"}, ` +
  `Geschlecht=${patient.gender || "–"}, ` +
  `Standort=${patient.location || "–"}, ` +
  `Bemerkung=${patient.remarks || "–"}`
);
    } else if (field === "discharge") {
      patient.history.push(`${getCurrentTime()} Entlassen: ${value}`);
    } else if (field === "transport") {
      patient.history.push(`${getCurrentTime()} Transport in KH: ${value}`);
    } else if (field === "additionalRequest") {
      patient.history.push(`${getCurrentTime()} ${value}`);
    } else if (
      !["age", "gender", "location", "team", "rtm", "remarks"].includes(
        field
      )
    ) {
      patient.history.push(
        `${getCurrentTime()} ${field} geändert: ${value}`
      );
    }

    // b) Feld setzen
    patient[field] = value;

    // c) Timestamp & Dauer-Berechnungen
    doTimeTracking();

    // d) persistieren
    localStorage.setItem("patients", JSON.stringify(patients));
  }

  // 3) Sonderfall Status → Animation + Delayed Update
  if (field === "status") {
    // a) History-Eintrag & Status setzen
    patient.history.push(`${getCurrentTime()} Status: ${value}`);
    patient.status = value;

    // b) Timestamp‐ und Dauer‐Berechnung
    recordStatusChange(patient, value);

    // c) Persist
    localStorage.setItem("patients", JSON.stringify(patients));

    // d) Animation & Trupp‐Aufräum‐Logik
    const oldCard = document.querySelector(`.patient-card[data-id='${id}']`);
    const finish = () => {
      if (value === "Entlassen" || value === "Transport in KH") {
        clearAssignments(id);
      }
      loadPatients(id);
      updateLiveTimers(); // einmal direkt nachladen
    };

    if (oldCard) {
      oldCard.classList.add("slide-out");
      oldCard.addEventListener("animationend", finish, { once: true });
    } else {
      finish();
    }
    return;
  }


  // 4) Alle anderen Felder → direkt updaten
  applyUpdate();
  loadPatients();
}

function recordStatusChange(patient, newStatus) {
  const now = Date.now();
  patient.statusTimestamps = patient.statusTimestamps || {};
  patient.durations = patient.durations || {};

  // 1) Timestamp für den neuen Status nur einmal setzen
  if (!patient.statusTimestamps[newStatus]) {
    patient.statusTimestamps[newStatus] = now;
  }

  // 2) Einsatzdauer → erst beim finalen Status
  if (
    (newStatus === "Entlassen" || newStatus === "Transport in KH") &&
    !patient.durations.einsatzdauer
  ) {
    patient.durations.einsatzdauer = formatMS(now - patient.createdAt);
  }

  // 3) Dispositionsdauer: gemeldet → disponiert
  if (
    newStatus === "disponiert" &&
    patient.statusTimestamps.gemeldet &&
    !patient.durations.dispositionsdauer
  ) {
    patient.durations.dispositionsdauer = formatMS(
      now - patient.statusTimestamps.gemeldet
    );
  }

  // 4) Ausrückdauer: disponiert → in Behandlung/UHS
  if (
    ["in Behandlung", "verlegt in UHS", "Behandlung in UHS"].includes(
      newStatus
    ) &&
    patient.statusTimestamps.disponiert &&
    !patient.durations.ausrueckdauer
  ) {
    patient.durations.ausrueckdauer = formatMS(
      now - patient.statusTimestamps.disponiert
    );
  }

  // 5) Verlegedauer UHS: verlegt in UHS → Behandlung in UHS
  if (
    newStatus === "Behandlung in UHS" &&
    patient.statusTimestamps["verlegt in UHS"] &&
    !patient.durations.verlegedauerUHS
  ) {
    patient.durations.verlegedauerUHS = formatMS(
      now - patient.statusTimestamps["verlegt in UHS"]
    );
  }

  // 6) **Behandlungsdauer**: wenn wir ins Finale wechseln
  if (
    (newStatus === "Entlassen" || newStatus === "Transport in KH") &&
    !patient.durations.behandlungsdauer
  ) {
    // 6a) nimm den Start-Timestamp „in Behandlung“ oder „Behandlung in UHS“
    const start =
      patient.statusTimestamps["in Behandlung"] ||
      patient.statusTimestamps["Behandlung in UHS"];
    if (start) {
      patient.durations.behandlungsdauer = formatMS(now - start);
    } else {
      // falls nie richtig in Behandlung
      patient.durations.behandlungsdauer = "00:00";
    }
  }
  // 7) alle übrigen Dauern beim finalen Status nachtragen
if ((newStatus === "Entlassen" || newStatus === "Transport in KH")) {
  // Dispositionsdauer, falls nie auf disponiert gewechselt
  if (
    patient.statusTimestamps.gemeldet &&
    !patient.durations.dispositionsdauer
  ) {
    patient.durations.dispositionsdauer = formatMS(
      now - patient.statusTimestamps.gemeldet
    );
  }
  // Ausrückdauer, falls nie auf disponiert→in Behandlung gewechselt
  if (
    patient.statusTimestamps.disponiert &&
    !patient.durations.ausrueckdauer
  ) {
    patient.durations.ausrueckdauer = formatMS(
      now - patient.statusTimestamps.disponiert
    );
  }
  // Verlegedauer UHS, falls nie auf verlegt→UHS gewechselt
  if (
    patient.statusTimestamps["verlegt in UHS"] &&
    !patient.durations.verlegedauerUHS
  ) {
    patient.durations.verlegedauerUHS = formatMS(
      now - patient.statusTimestamps["verlegt in UHS"]
    );
  }
}
}

function loadPatients(highlightId) {
    if (!document.getElementById("activePatients")) return;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];

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
      patient.status === "Transport in KH" ||
      patient.status === "Entlassen";

    // --- Trupp-Dropdown ---
    const excluded = ["Nicht Einsatzbereit", "Patient", "Spielfeldrand"];
    const options = trupps
      .filter((t) => !excluded.includes(t.status))
      .map((t) => `<option value="${t.name}">${t.name}</option>`)
      .join("");
    const truppSelect = `
<select id="teamSelect-${patient.id}" ${isFinal ? "disabled" : ""}>
  <option value="">Wählen…</option>
  ${options}
</select>
<button class="meldung-btn" onclick="assignSelectedTrupp(${
  patient.id
})" ${isFinal ? "disabled" : ""}>
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
        if (details.trupp) extra = ` <span style="color:gray;font-size:0.95em;">[Trupp: ${details.trupp}]</span>`;
        if (details.rtm)   extra = ` <span style="color:gray;font-size:0.95em;">[RTM: ${details.rtm}]</span>`;
      } else if (details === true) {
        done = true;
      }
      const style = done
        ? "background:#ccffcc"
        : "background:#ffcccc";
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
</button>
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
    const statusClass = (patient.status || "undefined").replace(
      /\s/g,
      "-"
    );
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
<p><button class="status-gemeldet"
       onclick="updatePatientData(${patient.id}, 'status', 'gemeldet')">
 gemeldet
</button></p>
<p><button class="status-disponiert"
       onclick="updatePatientData(${patient.id}, 'status', 'disponiert')">
 disponiert
</button></p>
<p><button class="status-in-Behandlung"
       onclick="updatePatientData(${
         patient.id
       }, 'status', 'in Behandlung')">
 in Behandlung
</button></p>
<p><button class="status-verlegt-in-UHS"
       onclick="updatePatientData(${
         patient.id
       }, 'status', 'verlegt in UHS')">
 verlegt in UHS
</button></p>
<p><button class="status-Behandlung-in-UHS"
       onclick="updatePatientData(${
         patient.id
       }, 'status', 'Behandlung in UHS')">
 Behandlung in UHS
</button></p>
<button class="status-Transport-in-KH"
       onclick="transportPatient(${patient.id})">
 Transport in KH
</button>
<p><button class="status-Entlassen"
       onclick="dischargePatient(${patient.id})">
 Entlassen
</button></p>
</div>


${historyHTML}

<div class="patient-info-block" style="min-width:400px;">
  <div class="patient-info-text">
  <!-- ➊ Tabelle für Verdachtsdiagnose & Dispositionsvorschlag -->
<table class="patient-details-table">
<thead>
<tr>
<th>Verdachtsdiagnose</th>
<th>Dispositionsvorschlag</th>
</tr>
</thead>
<tbody>
<tr>
<td>
${patient.diagnosis || "–"}
</td>
<td>
<ul style="margin:0; padding-left:1.2em;">
  ${(patient.suggestedResources || []).map(r => `<li>${r}</li>`).join("")}
</ul>
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
    ${["M", "W", "D"].map(g =>
      `<label style="margin-right:8px;">
         <input type="checkbox"
                name="gender-${patient.id}"
                value="${g}"
                ${patient.gender === g ? "checked" : ""}
                disabled>
         ${g}
       </label>`
    ).join("")}
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
  ${!isFinal
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
  <button class="meldung-btn" onclick="assignResource(${
    patient.id
  }, 'rtm')" ${isFinal ? "disabled" : ""}>
    RTM disponieren
  </button>
</div>

<div style="min-width:240px;">
<strong>Nachforderung:</strong>
<div style="display:flex; gap:8px; align-items:flex-start; margin-top:4px;">
<div style="flex:1;">
${requestBox}
</div>
<div>
${dispoButtons}
</div>
</div>
</div>

`;

    const container = [
      "gemeldet",
      "disponiert",
      "in Behandlung",
    ].includes(patient.status)
      ? "activePatients"
      : ["verlegt in UHS", "Behandlung in UHS"].includes(patient.status)
      ? "inUhsPatients"
      : "dismissedPatients";
    document.getElementById(container).appendChild(card);

    // <–– HIER scrollen wir den History-Container ans Ende:
const histContainer = card.querySelector('.history-container');
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

  document.querySelectorAll('.history-container').forEach(hc => {
hc.scrollTop = hc.scrollHeight;
});
}
function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Nachforderung Modal globale Variablen ---
let nachforderungPatientId = null;
let nachforderungRequest   = null;

// Modal in DOM injizieren, falls noch nicht geschehen
if (!document.getElementById("nachforderungModal")) {
  document.body.insertAdjacentHTML('beforeend', /* ...HTML siehe oben... */);
}

// Modal öffnen
function openNachforderungModal(patientId, request) {
  nachforderungPatientId = patientId;
  nachforderungRequest   = request;
  // Modal-Felder zurücksetzen:
  document.getElementById("nachforderungTruppRadio").checked = false;
  document.getElementById("nachforderungRtmRadio").checked   = false;
  document.getElementById("nachforderungTruppDiv").style.display = "none";
  document.getElementById("nachforderungRtmDiv").style.display   = "none";
  document.getElementById("nachforderungRequestType").textContent = request;

  // **Dieses Feld immer leeren!**
  document.getElementById("nachforderungRtmInput").value = "";

  // Trupp-Liste vorbereiten (wie gehabt)
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const excluded = ["Nicht Einsatzbereit", "Patient", "Spielfeldrand"];
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
  const showRtm   = art && art.value === "rtm";
  document.getElementById("nachforderungTruppDiv").style.display = showTrupp ? "block" : "none";
  document.getElementById("nachforderungRtmDiv").style.display   = showRtm   ? "block" : "none";
}


// Modal schließen
function closeNachforderungModal() {
  document.getElementById("nachforderungModal").style.display = "none";
  nachforderungPatientId = null;
  nachforderungRequest   = null;
}

// Bestätigen-Handler
function confirmNachforderungModal() {
  const art = document.querySelector('input[name="nachforderungArt"]:checked');
  if (!art) {
    alert("Bitte auswählen, ob Trupp oder RTM disponiert werden soll.");
    return;
  }
  const useTrupp = art.value === "trupp";
  const useRtm   = art.value === "rtm";
  if (!useTrupp && !useRtm) {
    alert("Bitte auswählen, ob Trupp oder RTM disponiert werden soll.");
    return;
  }
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === nachforderungPatientId);
  if (!patient) return alert("Patient nicht gefunden!");
  if (!patient.disposed) patient.disposed = {};

  let entryText = nachforderungRequest;
  let details   = {};

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

    // Status-Logik wie gewohnt
    if (
      patient.status !== "in Behandlung" &&
      patient.team.length === 1 &&
      (!Array.isArray(patient.rtm) || patient.rtm.length === 0)
    ) {
      patient.status = "disponiert";
      patient.history = patient.history || [];
      patient.history.push(`${getCurrentTime()} Status: disponiert`);
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
      t.status = "Patient";
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
    const rtmKennung = document.getElementById("nachforderungRtmInput").value.trim();
    if (!rtmKennung) {
      alert("Bitte RTM-Kennung eintragen.");
      return;
    }
    if (!Array.isArray(patient.rtm)) patient.rtm = [];
    patient.rtm.push(rtmKennung);
    entryText += ` → RTM ${rtmKennung} disponiert`;
    details.rtm = rtmKennung;
  }

  // Nachforderung als "disponiert" markieren, Details speichern
  patient.disposed[nachforderungRequest] = details;
  patient.history = patient.history || [];
  patient.history.push(`${getCurrentTime()} ${entryText}`);

  // Persistieren und UI refresh
  localStorage.setItem("patients", JSON.stringify(patients));
  closeNachforderungModal();
  loadPatients(nachforderungPatientId);
}

function addHistoryEntry(pid, entry) {
  // Alle Patienten aus dem lokalen Speicher holen
  const allPatients = JSON.parse(localStorage.getItem("patients") || "[]");

  // Den Patienten mit der angegebenen pid finden
  const patient = allPatients.find(p => p.id === pid);

  // Wenn der Patient gefunden wird, Historie aktualisieren
  if (patient) {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

    // Füge den neuen Status zur Historie des Patienten hinzu
    patient.history.push(`${timeStr} ${entry}`);

    // Speichern der aktualisierten Patienten-Daten im lokalen Speicher
    localStorage.setItem("patients", JSON.stringify(allPatients));

    // Event für die Aktualisierung auslösen
    window.dispatchEvent(new StorageEvent("storage", {
      key: "patients",
      newValue: JSON.stringify(allPatients)
    }));
  } else {
    console.error("Patient nicht gefunden: " + pid);
  }
};
