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
              .map(([req, done]) => {
                const style = done
                  ? "background:#ccffcc"
                  : "background:#ffcccc";
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
