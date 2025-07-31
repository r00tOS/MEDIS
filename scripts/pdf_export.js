async function exportTruppPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const teams = JSON.parse(localStorage.getItem("trupps")) || [];
  const formatTime = (timestamp) => {
    if (!timestamp) return "–";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  let y = 10;

  doc.setFontSize(14);
  doc.text("Truppübersicht", 10, y);
  y += 10;

  teams.forEach((team) => {
    // Gesamte Pausenzeit direkt aus totalPauseTime (in ms) in Minuten umrechnen
    const totalPause = Math.floor((team.totalPauseTime || 0) / 60000);

    if (y > 240) {
      doc.addPage();
      y = 10;
    }

    doc.setFontSize(12);
    doc.text(`Trupp: ${team.name}`, 10, y);
    y += 6;
    doc.text(`Gesamte Pausenzeit: ${totalPause} Min`, 10, y);
    y += 6;

    const einsatzHistorie = team.einsatzHistorie.length
      ? team.einsatzHistorie.map(
          (e) => `• ${e.ort} (${formatTime(e.von)} - ${formatTime(e.bis)})`
        )
      : ["–"];
    doc.text("Einsatzorte:", 10, y);
    y += 6;
    einsatzHistorie.forEach((line) => {
      doc.text(line, 15, y);
      y += 6;
    });

    const patientHistorie = team.patientHistorie.length
      ? team.patientHistorie.map(
          (p) => `• ${p.nummer} (${formatTime(p.von)} - ${formatTime(p.bis)})`
        )
      : ["–"];
    doc.text("Patientennummern:", 10, y);
    y += 6;
    patientHistorie.forEach((line) => {
      doc.text(line, 15, y);
      y += 6;
    });

    y += 8;
    if (y > 270) {
      doc.addPage();
      y = 10;
    }
  });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ts = `${pad(now.getDate())}_${pad(
    now.getMonth() + 1
  )}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
  const filename = `trupp_uebersicht_${ts}.pdf`;

  doc.save(filename);
}

async function exportPatientPDF() {
  const { jsPDF } = window.jspdf;
  const patients = JSON.parse(localStorage.getItem("patients")) || [];

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait",
  });
  const margin = 20;
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth() - margin * 2;
  const lineH = 14;
  const padY = 10;

  let y = margin;

  doc.setFontSize(16);
  doc.text("Patientenübersicht", margin, y);
  y += lineH * 2;
  doc.setFontSize(12);

  // index-basierte Schleife statt for-of
  for (let idx = 0; idx < patients.length; idx++) {
    const p = patients[idx];
    let sessionStartY = y;

    function maybeNewPage() {
      if (y > pageH - margin - padY) {
        const sessionH = y - sessionStartY;
        doc.setDrawColor(150);
        doc.rect(margin, sessionStartY - padY, pageW, sessionH + padY);
        doc.addPage();
        y = margin;
        sessionStartY = y;
      }
    }

    function line(text, indent = 0, wrap = false) {
      if (wrap) {
        const maxW = pageW - indent - 10;
        const lines = doc.splitTextToSize(text, maxW);
        for (const l of lines) {
          maybeNewPage();
          doc.text(l, margin + 5 + indent, y);
          y += lineH;
        }
      } else {
        maybeNewPage();
        doc.text(text, margin + 5 + indent, y);
        y += lineH;
      }
    }

    // — deine line()-Aufrufe wie gehabt —
    doc.setFont(undefined, "bold");
    line(`Patient Nr.:    ${p.id}`);
    doc.setFont(undefined, "normal");
    line(`Status:         ${p.status}`);
    line(`Standort:       ${p.location || "–"}`);
    line(`Alter:          ${p.age || "–"}`);
    line(`Geschlecht:     ${p.gender}`);
    line(`Diagnose:       ${p.diagnosis || "–"}`);

    const team = Array.isArray(p.team) ? p.team.join(", ") : "–";
    const rtm = Array.isArray(p.rtm) ? p.rtm.join(", ") : "–";
    line(`Trupp:           ${team}`);
    line(`RTM:            ${rtm}`);

    line(`Bemerkungen:    ${p.remarks || "–"}`, 0, true);

    line("Historie:");
    for (const entry of p.history || []) {
      line(`• ${entry}`, 5, true);
    }

    line("", 0);

    // Rahmen
    const sessionH = y - sessionStartY;
    doc.setDrawColor(150);
    doc.rect(margin, sessionStartY - padY, pageW, sessionH + padY);

    // **Seitenumbruch nach jedem Patienten (außer nach letztem)**
    if (idx < patients.length - 1) {
      doc.addPage();
      y = margin;
      doc.setFontSize(16);
      doc.text("Patientenübersicht", margin, y);
      y += lineH * 2;
      doc.setFontSize(12);
    }
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ts = `${pad(now.getDate())}_${pad(
    now.getMonth() + 1
  )}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
  const filename = `patienten_uebersicht_${ts}.pdf`;

  doc.save(filename);
}
