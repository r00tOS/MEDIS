// === 4) updateTrupp: wenn Status Patient, nextPatientNumber verwenden ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("confirmEinsatzort");
  if (!btn) {
    console.error("Button #confirmEinsatzort nicht gefunden!");
    return;
  }

  btn.addEventListener("click", () => {
    const ort = document.getElementById("customEinsatzort").value.trim();
    if (!ort || _pendingTruppIndex === null) return;
    const t = trupps[_pendingTruppIndex];
    t.currentOrt = ort;
    addHistoryEntry(t.patientInput, `Einsatzort gesetzt: ${ort}`);
    saveTrupps();
    renderTrupps();
    closeEinsatzortModal();
  });
});
function updateTrupp(index, status) {
  // 0) Scroll-Position merken
  const scrollEl = document.scrollingElement || document.documentElement;
  const scrollY = scrollEl.scrollTop;
  status = Number(status);
  const patientKeepStatuses = ["3","4","7","8"];
  const trupp = trupps[index];
  const oldStatus = trupp.status;
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

    if (oldStatus === 3 && status === 4 && trupp.patientInput) {
    // …dann setze im zugehörigen Patientendatensatz den Status auf "in Behandlung"
    updatePatientData(trupp.patientInput, 'status', 'in Behandlung');
  }

      if (oldStatus === 3 && status === 8 && trupp.patientInput) {
    // …dann setze im zugehörigen Patientendatensatz den Status auf "in Behandlung"
    updatePatientData(trupp.patientInput, 'status', 'Behandlung in UHS');
  }

      if (oldStatus === 4 && status === 7 && trupp.patientInput) {
    updatePatientData(trupp.patientInput, 'status', 'verlegt in UHS');
  }

        if (oldStatus === 7 && status === 8 && trupp.patientInput) {
    updatePatientData(trupp.patientInput, 'status', 'Behandlung in UHS');
  }

  // 1) Status-Gruppen definieren
    const einsatzStatuses = [
      11, // Streife
      3,  // Patient
      12, // Spielfeldrand
      0,  // Einsatz beendet
      4,  // dein neuer Status "Einsatzort" z.B.
      7,  // …
      8,  // …
    ];
  const pauseStatuses = [
    2,
    1,
    61,
  ];
  // Alles andere ist 6

  // 2) Wechsel IN Pausen-Status → Pause neu starten
  if (pauseStatuses.includes(status) && !pauseStatuses.includes(oldStatus)) {
    trupp.pausenzeit = 0;
    trupp.currentPauseStart = now;
  }

  // 3) Wechsel WEG von Pausen-Status → Messung stoppen
  if (!pauseStatuses.includes(status) && pauseStatuses.includes(oldStatus)) {
    trupp.currentPauseStart = null;
  }

  // 4) Wechsel IN Einsatz-Status → Einsatz neu starten
  if (
    einsatzStatuses.includes(status) &&
    !einsatzStatuses.includes(oldStatus)
  ) {
    trupp.einsatzzeit = 0;
    trupp.currentEinsatzStart = now;
  }

  // 5) Wechsel WEG von Einsatz-Status → Messung stoppen
  if (
    !einsatzStatuses.includes(status) &&
    einsatzStatuses.includes(oldStatus)
  ) {
    trupp.currentEinsatzStart = null;
  }

  // 6) Historie-Eintrag
  if (!trupp.history) trupp.history = [];
  if (oldStatus !== status) {
    trupp.history.push(`${timeStr} Status: ${status}`);
  }

  // 7) Spezielle Abschlüsse für Patient & Streife
  // nur löschen, wenn wir aus 3 in *keinen* der Sonder‐Status [4,7,8] wechseln
if (
  oldStatus === 3 &&
  trupp.patientInput &&
  trupp.patientStart &&
  !patientKeepStatuses.includes(String(status))
) {
    trupp.patientHistorie.push({
      nummer: trupp.patientInput,
      von: trupp.patientStart,
      bis: now,
    });
    trupp.patientInput = trupp.patientStart = null;
  }
// 7b) Streife abschließen
if (oldStatus === 11 && trupp.currentOrt && trupp.einsatzStartOrt) {
  const abgeschlossenerOrt = trupp.currentOrt;
  // 1) In die Einsatz-Historie
  trupp.einsatzHistorie.push({
    ort: abgeschlossenerOrt,
    von: trupp.einsatzStartOrt,
    bis: now,
  });
  // 2) In die Trupp-History (für Timeline-Log)
  if (!trupp.history) trupp.history = [];
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  trupp.history.push(`${timeStr} Streife beendet am Ort: ${abgeschlossenerOrt}`);
  // 3) Felder zurücksetzen
  trupp.currentOrt = trupp.einsatzStartOrt = null;
}

  // 8) Wechsel auf Patient → neuen Patienten anlegen
  if (oldStatus !== 3 && status === 3) {
    const letzteOrt =
      trupp.currentOrt || trupp.einsatzHistorie.at(-1)?.ort || "";

    // neue zentrale Funktion erzeugt Patient und erhöht ID
    const pid = newPatient({
      team: [trupp.name],
      location: letzteOrt,
      initialStatus: "disponiert",
    });

    trupp.patientInput = pid;
    trupp.patientStart = Date.now();
    openEditModal(pid);

    // Füge den Historieneintrag für Status "disponiert" hinzu
    updatePatientData(pid, "status", "disponiert");
  }

  // 9) Bei Streife → neuen Ort abfragen
if (status === 11) {
  openEinsatzortModal(index);
  // restliche Logik übernimmt dann confirmEinsatzort()
}
  // 10) Status übernehmen
  trupp.status = status;
  trupp.lastStatusChange = now;

  // 11) Trupp aus Patientendaten entfernen, wenn Weg von Patient
  //      Ausnahme: bleibe zugeordnet bei Status 3, 4, 7 oder 8
  const keepStatuses = [3, 4, 7, 8];
  if (oldStatus === 3 && !keepStatuses.includes(status)) {
    const stored = JSON.parse(localStorage.getItem("patients")) || [];
    stored.forEach((p) => {
      if (Array.isArray(p.team)) {
        const idx = p.team.indexOf(trupp.name);
        if (idx >= 0) {
          p.team.splice(idx, 1);
          p.history = p.history || [];
          p.history.push(`${timeStr} Trupp ${trupp.name} entfernt`);
        }
      }
    });
  }

  // 12) Speichern & neu rendern
  saveTrupps();
  renderTrupps();
  window.scrollTo(0, scrollY);
}

function saveTrupps() {
  localStorage.setItem("nextMaxEinsatzTime", nextMaxEinsatzTime);
  localStorage.setItem("trupps", JSON.stringify(trupps));
}

function resetAll() {
  if (confirm("Willst du wirklich alle Daten löschen?")) {
    // Entferne alle relevanten LocalStorage-Einträge
    localStorage.removeItem("trupps");
    localStorage.removeItem("nextPatientNumber");
    localStorage.removeItem("nextMaxEinsatzTime");

    // Setze Arrays/Variablen zurück
    trupps = [];
    nextPatientNumber = 1;
    nextMaxEinsatzTime = 45;

    // Aktualisiere die Eingabefelder
    document.getElementById("maxEinsatzTime").value = nextMaxEinsatzTime;

    // Speichere und rendere neu
    saveTrupps();
    renderTrupps();
  }
}

function addTrupp(name = null) {
  const input = name || document.getElementById("newTruppName").value.trim();
  if (!input) return;
  trupps.push({
    name: input,
    status: 6,
    lastStatusChange: Date.now(),
    currentPauseStart: Date.now(),
    currentEinsatzStart: null,
    totalPauseTime: 0,
    pausenzeit: 0, // neu: initiale Pausenzeit
    einsatzzeit: 0, // neu: initiale Einsatzzeit
    einsatzHistorie: [],
    patientHistorie: [],
    patientInput: "",
    currentOrt: "",
    einsatzStartOrt: null,
    patientStart: null,
  });

  // Eingabefeld leeren, wenn vom Nutzer getriggert
  if (!name) document.getElementById("newTruppName").value = "";
  saveTrupps();
  renderTrupps();
}

function addTrupps(prefix, start, end, step = 1) {
  if (!confirm(`Willst du wirklich neue Trupps hinzufügen?`)) return;
  for (let i = start; i <= end; i += step) {
    addTrupp(`${prefix} ${i}`);
  }
}

function deleteTrupp(index) {
  if (!confirm("Willst du diesen Trupp wirklich löschen?")) return;
  const key = trupps[index].name;
  const el = document.querySelector(`[data-key="${key}"]`);
  if (el) {
    el.classList.add("move-out");
    setTimeout(() => {
      trupps.splice(index, 1);
      saveTrupps();
      renderTrupps();
    }, 300); // Delay matches CSS transition time
  } else {
    trupps.splice(index, 1);
    saveTrupps();
    renderTrupps();
  }
}

function copyToClipboard(truppName) {
  const trupp = trupps.find((t) => t.name === truppName);
  if (!trupp) return;

  let meldung = "";
  let standort;
  let alle;

  switch (trupp.status) {
    case 2:
      meldung = `${trupp.name} einsatzbereit in UHS`;
      break;
    case 6:
      meldung = `${trupp.name} nicht einsatzbereit`;
      break;
    case 11:
      meldung = `${trupp.name} übernimmt Streifengebiet ${
        trupp.currentOrt || "[Ort]"
      }`;
      break;
    case 3:
      standort =
        trupp.currentOrt ||
        (trupp.einsatzHistorie.length
          ? trupp.einsatzHistorie[trupp.einsatzHistorie.length - 1].ort
          : "");
      meldung = `Patient Nr.: ${trupp.patientInput || "[Patientennummer]"}
Trupp: ${trupp.name}
Standort: ${standort || ""}
Alter:
Geschlecht:
Verdachtsdiagnose:
Nachforderung:
Bemerkung:`;
      break;
    case 12:
      alle = trupps
        .filter((t) => t.status === 12)
        .map((t) => t.name)
        .join(", ");
      meldung = `${alle} Spielfeldrand erreicht`;
      break;
    default:
      meldung = `${trupp.name}: ${trupp.status}`;
  }

  navigator.clipboard
    .writeText(meldung)
    .then(() => {
      console.log("In Zwischenablage kopiert:", meldung);
    })
    .catch((err) => {
      console.error("Fehler beim Kopieren:", err);
    });
}


function addHistoryEntry(pid, entry) {
  // Alle Patienten aus dem lokalen Speicher holen
  const allPatients = JSON.parse(localStorage.getItem("patients") || "[]");

  // Den Patienten mit der angegebenen pid finden
  const patient = allPatients.find((p) => p.id === pid);

  // Wenn der Patient gefunden wird, Historie aktualisieren
  if (patient) {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Füge den neuen Status zur Historie des Patienten hinzu
    patient.history.push(`${timeStr} ${entry}`);

    // Speichern der aktualisierten Patienten-Daten im lokalen Speicher
    localStorage.setItem("patients", JSON.stringify(allPatients));

    // Event für die Aktualisierung auslösen
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "patients",
        newValue: JSON.stringify(allPatients),
      })
    );
  } else {
    console.error("Patient nicht gefunden: " + pid);
  }
}


function toggleStatusDropdown(truppId) {
  const prev = localStorage.getItem('openTruppId');
  const next = prev === truppId ? null : truppId;
  localStorage.setItem('openTruppId', next);
  renderTrupps();
}

function closeStatusDropdown() {
  localStorage.removeItem('openTruppId');
  renderTrupps();
}

// Wird von jedem <li> aufgerufen, nachdem updateTrupp() ausgeführt wurde:
function onStatusSelected(i, status, truppId) {
  updateTrupp(i, status);
  // schließe das Dropdown
  closeStatusDropdown();
}
