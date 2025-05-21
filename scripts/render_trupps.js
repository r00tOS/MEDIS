function renderTrupps() {
  const scrollY = window.scrollY;
  const now = Date.now();

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
    div.className = "trupp";
    div.dataset.key = trupp.name;
    div.dataset.truppId = trupp.id;

    const einsatzzeit = trupp.einsatzzeit || 0;
    let pausenzeit = trupp.pausenzeit || 0;
    let totalPause = trupp.totalPauseTime || 0;

    if (trupp.currentEinsatzStart && einsatzzeit > nextMaxEinsatzTime * 60000)
      div.classList.add("ueberzogen");
    if (trupp.status === "Einsatzbereit in Rückhaltung")
      div.classList.add("rueckhaltung");
    if (trupp.status === "Patient") div.classList.add("patient");
    if (trupp.status === "Spielfeldrand") div.classList.add("spielfeldrand");
    // 1) erst einmal die gemeinsame Einsatz-Gruppe
    if (
      ["Streife", "Patient", "Spielfeldrand", "Einsatz beendet"].includes(
        trupp.status
      )
    ) {
      div.classList.add("einsatz");
      // und wenn es genau "Einsatz beendet" ist, den lila Style
      if (trupp.status === "Einsatz beendet") {
        div.classList.add("einsatz-beendet");
      }
    }
    // 2) Pause-Status
    else if (
      [
        "Einsatzbereit in UHS",
        "Einsatzbereit unterwegs",
        "Einsatzbereit in Rückhaltung",
      ].includes(trupp.status)
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
      trupp.status !== "Einsatzbereit in Rückhaltung"
        ? `Aktuelle Einsatzzeit: ${min(einsatzzeit)} Min`
        : `Aktuelle Pausenzeit: ${min(pausenzeit)} Min${
            trupp.status === "Einsatzbereit in Rückhaltung"
              ? " (Rückhaltung zählt als Pause)"
              : ""
          }`;

    const gesamtPause = `Gesamte Pausenzeit: ${min(totalPause)} Min`;

    const progress =
      trupp.currentEinsatzStart &&
      trupp.status !== "Einsatzbereit in Rückhaltung"
        ? Math.min(einsatzzeit / (nextMaxEinsatzTime * 60000), 1)
        : 0;
    const progressBar =
      trupp.currentEinsatzStart &&
      trupp.status !== "Einsatzbereit in Rückhaltung"
        ? `<div style='background:#ccc;height:8px;border-radius:4px;margin-top:4px;'>
     <div style='height:8px;width:${Math.floor(
       progress * 100
     )}%;background:#28a745;border-radius:4px;'></div>
   </div>`
        : "";

    div.innerHTML = `
          <div class="trupp-header">
  <h3>${trupp.name}</h3>
  ${
    trupp.status === "Nicht Einsatzbereit"
      ? `<button class="delete-btn" onclick="deleteTrupp(${i})">×</button>`
      : ""
  }
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
  <span class="status-display" onclick="toggleStatusButtons('${
    trupp.id
  }')">Status: ${trupp.status}</span>
  ${
    !["Einsatzbereit in Rückhaltung", "Einsatzbereit unterwegs"].includes(
      trupp.status
    )
      ? `<button class="meldung-btn" onclick="copyToClipboard('${trupp.name}')">Meldung</button>`
      : ""
  }
</div>
<div class="status-buttons" style="display:none;">
<button class="btn-nicht-einsatzbereit" onclick="updateTrupp(${i}, 'Nicht Einsatzbereit')">Nicht Einsatzbereit</button>
            <button class="btn-pause" onclick="updateTrupp(${i}, 'Einsatzbereit in UHS')">In UHS</button>
            <button class="btn-pause" onclick="updateTrupp(${i}, 'Einsatzbereit unterwegs')">Unterwegs</button>
            <button class="btn-pause" onclick="updateTrupp(${i}, 'Einsatzbereit in Rückhaltung')">In Rückhaltung</button>
            <button class="btn-einsatz" onclick="updateTrupp(${i}, 'Streife')">Streife</button>
            ${
              trupp.status !== "Patient"
                ? `<button class="btn-patient" onclick="updateTrupp(${i}, 'Patient')">Patient</button>`
                : ""
            }
            <button class="btn-spielfeldrand" onclick="updateTrupp(${i}, 'Spielfeldrand')">Spielfeldrand</button>
          </div>

		  ${
        trupp.status === "Streife"
          ? `<p><strong>${
              trupp.currentOrt || "kein Einsatzort"
            }</strong> <button onclick="editOrt(${i})">✎</button></p>`
          : ""
      }
          ${
            trupp.status === "Patient"
              ? `<p><strong>Patient ${
                  trupp.patientInput || "keine Nummer"
                }</strong> <button onclick="editPatient(${i})">✎</button></p>`
              : ""
          }

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
      trupp.status === "Spielfeldrand"
        ? 99
        : trupp.status === "Patient"
        ? 2
        : trupp.status === "Einsatz beendet"
        ? 1
        : 0;
    if (
      ["Streife", "Patient", "Spielfeldrand", "Einsatz beendet"].includes(
        trupp.status
      )
    )
      einsatz.push({ el: div, sort: einsatzSort });
    else if (
      ["Einsatzbereit in UHS", "Einsatzbereit unterwegs"].includes(trupp.status)
    )
      pause.push({ el: div, sort: pausenzeit });
    else if (trupp.status === "Einsatzbereit in Rückhaltung")
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
        "Einsatzbereit in UHS",
        "Einsatzbereit unterwegs",
        "Einsatzbereit in Rückhaltung",
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

  window.scrollTo(0, scrollY);

  requestAnimationFrame(() => {
    document.querySelectorAll(".trupp").forEach((el) => {
      const key = el.dataset.key;
      const oldRect = prevRects.get(key);
      if (!oldRect) return;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (dx !== 0 || dy !== 0) {
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.4s ease";
          el.style.transform = "";
        });
      }
    });
  });
}

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
