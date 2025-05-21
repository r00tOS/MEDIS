function clearAssignments(patientId, finalStatus) {
  const now = Date.now();
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;

  patient.status = finalStatus;
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients(patientId); // neu rendern (Team bleibt erhalten)

  // 2) Trupp-Tracker updaten: alle Trupps, die patientInput === patientId haben,
  //    bekommen ihren Einsatz beendet
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  trupps.forEach((t) => {
    if (t.patientInput === patientId) {
      // a) Patienteneinsatz abschließen
      if (t.patientStart) {
        t.patientHistorie = t.patientHistorie || [];
        t.patientHistorie.push({
          nummer: patientId,
          von: t.patientStart,
          bis: now,
        });
      }
      // b) Input­Felder zurücksetzen
      t.patientInput = null;
      t.patientStart = null;

      // c) Status auf "Einsatz beendet" setzen
      t.status = "Einsatz beendet";

      // d) Eigene Historie ergänzen
      t.history = t.history || [];
      t.history.push({
        when: now,
        event: "Einsatz beendet",
      });
    }
  });

  // 3) Speichern & Storage‐Event feuern
  localStorage.setItem("trupps", JSON.stringify(trupps));
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "trupps",
      newValue: JSON.stringify(trupps),
    })
  );
}

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
      patient.history.push(
        `${getCurrentTime()} Verdachtsdiagnose geändert: ${value}`
      );
    } else if (field === "discharge") {
      patient.history.push(`${getCurrentTime()} Entlassen: ${value}`);
    } else if (field === "transport") {
      patient.history.push(`${getCurrentTime()} Transport in KH: ${value}`);
    } else if (field === "additionalRequest") {
      patient.history.push(`${getCurrentTime()} ${value}`);
    } else if (
      !["age", "gender", "location", "team", "rtm", "remarks"].includes(field)
    ) {
      patient.history.push(`${getCurrentTime()} ${field} geändert: ${value}`);
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

function disposeRequest(id, request) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  patient.additionalRequest = request;
  if (!patient.history) patient.history = [];
  patient.history.push(`${getCurrentTime()} ${request}`);
  if (!patient.disposed) patient.disposed = {};
  patient.disposed[request] = false;
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients();
}

function markAsDisposed(id, request) {
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient.disposed) patient.disposed = {};
  patient.disposed[request] = true;
  // entfernt: kein Eintrag in Historie bei Disponiert
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients();
}

function dischargePatient(id) {
  const location = prompt("Wohin wurde der Patient entlassen?");
  if (!location) return;

  // 1) Discharge-Feld
  updatePatientData(id, "discharge", location);
  // 2) Status auf Entlassen
  updatePatientData(id, "status", "Entlassen");

  // 3) Noch einmal sicherstellen, dass der Trupp beendet wird:
  clearAssignments(id, "Entlassen");
}

// ✈️ Prompt für Transport-Ziel und Statuswechsel
function transportPatient(id) {
  const ziel = prompt("Bitte Zielklinik eingeben:");
  if (!ziel) return;
  // 1) Ziel speichern und in die Historie schreiben
  updatePatientData(id, "transport", ziel);
  // 2) Statuswechsel auslösen
  updatePatientData(id, "status", "Transport in KH");
  // 3) Trupp-Zuordnung beenden
  clearAssignments(id, "Transport in KH");
}

function loadPatients(highlightId) {
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
      patient.status === "Transport in KH" || patient.status === "Entlassen";

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
        .map(([req, done]) => {
          const style = done ? "background:#ccffcc" : "background:#ffcccc";
          const btn = done
            ? ""
            : `<button onclick="markAsDisposed(${patient.id}, '${req}')">Disponiert</button>`;
          return `<div style="${style};padding:4px;margin-bottom:4px;">${req} ${btn}</div>`;
        })
        .join("");
    }
    const dispoButtons = isFinal
      ? ""
      : `<div class="buttons" style="display:flex; flex-direction:column; gap:5px; margin-top:8px;">
  <button class="meldung-btn" onclick="disposeRequest(${patient.id}, 'Tragetrupp nachgefordert')">
    Tragetrupp
  </button>
  <button class="meldung-btn" onclick="disposeRequest(${patient.id}, 'Polizei nachgefordert')">
    Polizei
  </button>
  <button class="meldung-btn" onclick="disposeRequest(${patient.id}, 'RTW nachgefordert')">
    RTW
  </button>
  <button class="meldung-btn" onclick="disposeRequest(${patient.id}, 'RTW/NEF nachgefordert')">
    RTW/NEF
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
        <ul>${histItems}</ul>
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

	  <div style="margin-top:6px;">
  <strong>Verdachtsdiagnose:</strong>
  <div style="margin-bottom:16px;">
    ${patient.diagnosis || "–"}
    ${
      !isFinal
        ? `<button class="meldung-btn" onclick="editField(${patient.id}, 'diagnosis')">✏️</button>`
        : ""
    }
  </div>

  <strong style="margin-top:16px; display:block;">Dispositionsvorschlag:</strong>
  <ul style="margin-top:8px; margin-left:16px;">
    ${(patient.suggestedResources || []).map((r) => `<li>${r}</li>`).join("")}
  </ul>
</div>


      <div style="min-width:200px;">
        <strong>Geschlecht:</strong><br>
        <label><input type="checkbox" name="gender-${patient.id}" value="M"
                      ${patient.gender === "M" ? "checked" : ""}
                      ${isFinal ? "disabled" : ""}
                      onclick="selectOnly(this); updatePatientData(${
                        patient.id
                      }, 'gender', this.value)"> M</label>
        <label><input type="checkbox" name="gender-${patient.id}" value="W"
                      ${patient.gender === "W" ? "checked" : ""}
                      ${isFinal ? "disabled" : ""}
                      onclick="selectOnly(this); updatePatientData(${
                        patient.id
                      }, 'gender', this.value)"> W</label>
        <label><input type="checkbox" name="gender-${patient.id}" value="D"
                      ${patient.gender === "D" ? "checked" : ""}
                      ${isFinal ? "disabled" : ""}
                      onclick="selectOnly(this); updatePatientData(${
                        patient.id
                      }, 'gender', this.value)"> D</label><br>

        <div>
    <strong>Alter:</strong>
    <div>
      ${patient.age || "–"}
      ${
        !isFinal
          ? `<button class="meldung-btn" onclick="editField(${patient.id}, 'age')">✏️</button>`
          : ""
      }
    </div>
  </div>



  <div style="margin-top:6px;">
    <strong>Standort:</strong>
    <div>
      ${patient.location || "–"}
      ${
        !isFinal
          ? `<button class="meldung-btn" onclick="editField(${patient.id}, 'location')">✏️</button>`
          : ""
      }
    </div>
  </div>

  <div style="margin-top:6px;">
    <strong>Bemerkungen:</strong>
    <div>
      ${patient.remarks || "–"}
      <button class="meldung-btn" onclick="editField(${
        patient.id
      }, 'remarks')">✏️</button>
    </div>
  </div>
</div>

      <div style="min-width:200px;">
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

    const container = ["gemeldet", "disponiert", "in Behandlung"].includes(
      patient.status
    )
      ? "activePatients"
      : ["verlegt in UHS", "Behandlung in UHS"].includes(patient.status)
      ? "inUhsPatients"
      : "dismissedPatients";
    document.getElementById(container).appendChild(card);

    if (patient.id === highlightId) {
      card.classList.add("slide-in");
      card.addEventListener(
        "animationend",
        () => card.classList.remove("slide-in"),
        { once: true }
      );
    }
  });
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
  if (newStatus === "Entlassen" || newStatus === "Transport in KH") {
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

function assignResource(id, type) {
  const label = type === "team" ? "Trupp" : "RTM";
  const value = prompt(`${label} disponieren:`);
  if (value !== null && value.trim() !== "") {
    const patients = JSON.parse(localStorage.getItem("patients")) || [];
    const patient = patients.find((p) => p.id === id);
    if (type === "team") {
      if (!Array.isArray(patient.team)) patient.team = [];
      patient.team.push(value);
    } else {
      if (!Array.isArray(patient.rtm)) patient.rtm = [];
      patient.rtm.push(value);
    }
    // Nur wenn vorher noch kein Trupp und kein RTM zugewiesen war:
    if (
      patient.status !== "in Behandlung" &&
      (!Array.isArray(patient.team) || patient.team.length === 0) &&
      (!Array.isArray(patient.rtm) || patient.rtm.length === 0)
    ) {
      patient.status = "disponiert";
      patient.history = patient.history || [];
      patient.history.push(`${getCurrentTime()} Status: disponiert`);
    }
    // Und immer Eintrag, dass RTM disponiert wurde:
    patient.history = patient.history || [];
    patient.history.push(`${getCurrentTime()} ${label} ${value} disponiert`);

    localStorage.setItem("patients", JSON.stringify(patients));
    loadPatients();
  }
}

function assignSelectedTrupp(patientId) {
  // Patienten laden und Objekt finden
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const p = patients.find((x) => x.id === patientId);
  if (!p) return;

  // Sicherstellen, dass p.team ein Array ist
  if (!Array.isArray(p.team)) p.team = [];

  // ①: Status-Logik & Timestamp setzen, bevor irgendwas anderes passiert
  recordStatusChange(p, "disponiert");

  // ②: Wenn noch kein Trupp/RTM und Status nicht 'in Behandlung', auf 'disponiert' setzen
  if (
    p.status !== "in Behandlung" &&
    p.team.length === 0 &&
    (!Array.isArray(p.rtm) || p.rtm.length === 0)
  ) {
    p.status = "disponiert";
    p.history = p.history || [];
    p.history.push(`${getCurrentTime()} Status: disponiert`);
  }

  // ③: Tatsächlichen Trupp-Namen aus dem Select ziehen
  const sel = document.getElementById(`teamSelect-${patientId}`);
  const truppName = sel ? sel.value : null;
  if (!truppName) {
    // Nichts ausgewählt → abbrechen
    localStorage.setItem("patients", JSON.stringify(patients));
    return;
  }

  // ④: Trupp zu p.team hinzufügen und Historie eintragen
  p.team.push(truppName);
  p.history.push(`${getCurrentTime()} Trupp ${truppName} disponiert`);

  // ⑤: Speichern und neu rendern
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients(patientId);

  // ⑥: Trupp-Tracker aktualisieren (Einsatzzeit starten)
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const t = trupps.find((t) => t.name === truppName);
  if (t) {
    const now = Date.now();

    // a) eventuell laufenden Einsatz beenden
    if (t.currentOrt && t.einsatzStartOrt) {
      t.einsatzHistorie = t.einsatzHistorie || [];
      t.einsatzHistorie.push({
        ort: t.currentOrt,
        von: t.einsatzStartOrt,
        bis: now,
      });
    }

    // b) Status auf Patient setzen
    t.status = "Patient";
    t.patientInput = patientId;
    // c) Einsatz-Timer starten
    t.patientStart = now;
    t.currentEinsatzStart = now;
    // d) Pause-Timer zurücksetzen
    t.currentPauseStart = null;

    // e) Speichern & Storage-Event feuern
    localStorage.setItem("trupps", JSON.stringify(trupps));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "trupps",
        newValue: JSON.stringify(trupps),
      })
    );
  }
}

function removeTrupp(id, index) {
  if (!confirm("Soll dieser Trupp wirklich entfernt werden?")) return;

  // 1) Patienten-Seite updaten
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  const removed = Array.isArray(patient.team)
    ? patient.team.splice(index, 1)
    : [];
  patient.history = patient.history || [];
  patient.history.push(`${getCurrentTime()} Trupp ${removed[0]} entfernt`);
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients();

  // 2) Trupp-Tracker updaten
  const trupps = JSON.parse(localStorage.getItem("trupps")) || [];
  const t = trupps.find((t) => t.name === removed[0]);
  if (t) {
    const now = Date.now();

    // 📝 Falls gerade ein Patient zugewiesen, Patienteneinsatz abschließen
    if (t.patientInput && t.patientStart) {
      t.patientHistorie = t.patientHistorie || [];
      t.patientHistorie.push({
        nummer: t.patientInput,
        von: t.patientStart,
        bis: now,
      });
      // Reset der Patientendaten
      t.patientInput = "";
      t.patientStart = null;
    }

    // Statuswechsel, aber Einsatzzeit weiterlaufen lassen
    t.status = "Einsatz beendet";

    // Eigene Trupp-Historie ergänzen
    t.history = t.history || [];
    t.history.push({
      when: now,
      event: "Einsatz beendet",
    });

    // Speichern und Renderer anstoßen
    localStorage.setItem("trupps", JSON.stringify(trupps));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "trupps",
        newValue: JSON.stringify(trupps),
      })
    );
  }
}

function removeRtm(id, index) {
  if (!confirm("Soll dieses RTM wirklich entfernt werden?")) return;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (Array.isArray(patient.rtm)) {
    const removed = patient.rtm.splice(index, 1);
    if (!patient.history) patient.history = [];
    patient.history.push(`${getCurrentTime()} RTM ${removed[0]} entfernt`);
    localStorage.setItem("patients", JSON.stringify(patients));
    loadPatients();
  }
}

function editField(id, field) {
  if (field === "diagnosis") {
    // Modal für Stichwörter öffnen
    openKeywordModal(id);
    return;
  }
  // für alle anderen Felder weiter wie gehabt:
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  const current = patient[field] || "";
  const labelMap = {
    age: "Alter",
    diagnosis: "Verdachtsdiagnose",
    location: "Standort",
    remarks: "Bemerkungen",
  };
  const value = prompt(
    `Neuen Wert für ${labelMap[field] || field} eingeben:`,
    current
  );
  if (value !== null) {
    updatePatientData(id, field, value);
  }
}

function addCustomHistory(id, message) {
  if (!message.trim()) return;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient.history) patient.history = [];
  patient.history.push(`${getCurrentTime()} ${message}`);
  localStorage.setItem("patients", JSON.stringify(patients));
  loadPatients();
}

// Globale Variable, die immer aktuell ist
window.nextPatientNumber =
  parseInt(localStorage.getItem("nextPatientNumber"), 10) || 1;

// 1) Polling
function syncNextPatientNumber() {
  window.nextPatientNumber =
    parseInt(localStorage.getItem("nextPatientNumber"), 10) || 1;
}
setInterval(syncNextPatientNumber, 2000);

// 2) storage-Event
window.addEventListener("storage", (e) => {
  if (e.key === "nextPatientNumber") syncNextPatientNumber();
});

window.addEventListener("storage", (e) => {
  if (e.key === "patients") {
    loadPatients();
  }
});

/**
 * Sammelt alle relevanten Felddaten des Patienten, formatiert sie
 * und kopiert den resultierenden Text in die Zwischenablage.
 */
function copyPatientData(id) {
  // Patientendaten laden
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const patient = patients.find((p) => p.id === id);
  if (!patient) return;

  // Felder extrahieren
  const trupp = Array.isArray(patient.team) ? patient.team.join(", ") : "–";
  const rtm = Array.isArray(patient.rtm) ? patient.rtm.join(", ") : "–";
  const nachf =
    (patient.history || []).filter((e) => /nachgefordert/.test(e)).join("\n") ||
    "–";
  const remarks = patient.remarks || "–";
  const historyText = (patient.history || []).join("\n") || "–";

  // Textblock zusammenbauen
  const text = `Patient Nr.: ${patient.id}
Trupp: ${trupp}
RTM: ${rtm}
Standort: ${patient.location || "–"}
Alter: ${patient.age || "–"}
Geschlecht: ${patient.gender || "–"}
Verdachtsdiagnose: ${patient.diagnosis || "–"}
Nachforderungen:
${nachf}
Bemerkung: ${remarks}

Patienten-Historie:
${historyText}`;

  copyToClipboard(text);
}

/**
 * Kopiert reinen Text in die Zwischenablage, mit Fallback.
 */
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Clipboard write failed, fallback:", err);
      fallbackCopyTextToClipboard(text);
    });
  } else {
    fallbackCopyTextToClipboard(text);
  }
}

function fallbackCopyTextToClipboard(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed"; // verhindert Scroll-Jump
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    alert("Patientendaten kopiert 🎉");
  } catch (err) {
    console.error("Fallback: Copy failed", err);
  }
  document.body.removeChild(ta);
}

function deletePatient(id) {
  if (!confirm("Soll Patient " + id + " wirklich gelöscht werden?")) return;
  // aus localStorage holen
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  // Patient finden und entfernen
  const idx = patients.findIndex((p) => p.id === id);
  if (idx > -1) {
    patients.splice(idx, 1);
    localStorage.setItem("patients", JSON.stringify(patients));
    // neu rendern
    loadPatients();
  }
}
