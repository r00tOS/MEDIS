// === 4) updateTrupp: wenn Status Patient, nextPatientNumber verwenden ===

function updateTrupp(index, status) {
  // 0) Scroll-Position merken
  const scrollEl = document.scrollingElement || document.documentElement;
  const scrollY = scrollEl.scrollTop;

  const trupp = trupps[index];
  const oldStatus = trupp.status;
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1) Status-Gruppen definieren
  const einsatzStatuses = [
    "Streife",
    "Patient",
    "Spielfeldrand",
    "Einsatz beendet",
  ];
  const pauseStatuses = [
    "Einsatzbereit in UHS",
    "Einsatzbereit unterwegs",
    "Einsatzbereit in Rückhaltung",
  ];
  // Alles andere ist "Nicht Einsatzbereit"

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
  if (oldStatus === "Patient" && trupp.patientInput && trupp.patientStart) {
    trupp.patientHistorie.push({
      nummer: trupp.patientInput,
      von: trupp.patientStart,
      bis: now,
    });
    trupp.patientInput = trupp.patientStart = null;
  }
  if (oldStatus === "Streife" && trupp.currentOrt && trupp.einsatzStartOrt) {
    trupp.einsatzHistorie.push({
      ort: trupp.currentOrt,
      von: trupp.einsatzStartOrt,
      bis: now,
    });
    trupp.currentOrt = trupp.einsatzStartOrt = null;
  }

  // 8) Wechsel auf Patient → neuen Patienten anlegen
  if (oldStatus !== "Patient" && status === "Patient") {
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
  }

  // 9) Bei Streife → neuen Ort abfragen
  if (status === "Streife") {
    trupp.einsatzStartOrt = now;
    const neuerOrt = prompt(
      "Bitte Einsatzort eingeben:",
      trupp.currentOrt || ""
    );
    if (neuerOrt !== null) trupp.currentOrt = neuerOrt.trim();
  }

  // 10) Status übernehmen
  trupp.status = status;
  trupp.lastStatusChange = now;

  // 11) Trupp aus Patientendaten entfernen, wenn Weg von Patient
  if (oldStatus === "Patient" && status !== "Patient") {
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
    status: "Nicht Einsatzbereit",
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

  switch (trupp.status) {
    case "Einsatzbereit in UHS":
      meldung = `${trupp.name} einsatzbereit in UHS`;
      break;
    case "Nicht Einsatzbereit":
      meldung = `${trupp.name} nicht einsatzbereit`;
      break;
    case "Streife":
      meldung = `${trupp.name} übernimmt Streifengebiet ${
        trupp.currentOrt || "[Ort]"
      }`;
      break;
    case "Patient":
      const standort =
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
    case "Spielfeldrand":
      const alle = trupps
        .filter((t) => t.status === "Spielfeldrand")
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
