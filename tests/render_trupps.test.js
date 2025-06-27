/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('renderTrupps', () => {
  beforeAll(() => {
    // stub für scrollTo, damit jsdom nicht meckert
    window.scrollTo = jest.fn();

    // Stubs für externe Helfer, passend zu render_trupps.js
    window.deleteTrupp           = jest.fn();
    window.toggleStatusDropdown  = jest.fn();  // hier richtig benennen
    window.copyToClipboard       = jest.fn();
    window.updateTrupp           = jest.fn();
    window.editOrt               = jest.fn();
    window.editPatient           = jest.fn();

    // nextMaxEinsatzTime bereitstellen
    window.nextMaxEinsatzTime = 45;

    // **Neu:** Ein minimaler Stub für statusOptions, damit .find() nicht abstürzt
    window.statusOptions = [
      { status: 0,  text: 'Einsatz beendet' },
      { status: 2,  text: 'Einsatzbereit in UHS' },
      { status: 3,  text: 'Patient' },
      { status: 6,  text: 'Nicht einsatzbereit' },
      { status: 11, text: 'Streife' },
      { status: 12, text: 'Spielfeldrand' },
      // bei Bedarf weitere Status hier ergänzen…
    ];

    // Script injizieren
    const code = fs.readFileSync(
      path.resolve(__dirname, '../scripts/render_trupps.js'),
      'utf8'
    );
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);

    // formatMS als Spy überschreiben (wird intern verwendet)
    window.formatMS = jest.fn(ms => {
      const m = Math.floor(ms / 60000);
      return `${m.toString().padStart(2,'0')}:00`;
    });
  });

  beforeEach(() => {
    // Container anlegen
    document.body.innerHTML = `
      <div id="einsatzContainer"></div>
      <div id="pauseContainer"></div>
      <div id="nichtContainer"></div>
    `;
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('ordnet "Patient" (status 3) in EinsatzContainer und markiert korrekt', () => {
    const tenMin = 10 * 60000;
    window.trupps = [{
      name: 'T1',
      status: 3, // Patient
      einsatzzeit: tenMin,
      pausenzeit: 5 * 60000,
      totalPauseTime: 15 * 60000,
      einsatzHistorie: [],
      patientHistorie: [],
      currentEinsatzStart: Date.now() - tenMin,
    }];

    renderTrupps();

    const eins = document.getElementById('einsatzContainer');
    expect(eins.children).toHaveLength(1);
    const div = eins.firstElementChild;
    // Status 3 → nur "patient", aber kein extra "einsatz"-Label
    expect(div.classList.contains('patient')).toBe(true);
    expect(div.classList.contains('einsatz')).toBe(false);
    expect(div.querySelector('h3').textContent.trim()).toBe('T1');
    // Kein Einsatzort → formatMS nicht aufgerufen
    expect(formatMS).not.toHaveBeenCalled();
  });

  it('ordnet Pause-Status (status 2) in PauseContainer und zeigt Pausenzeit', () => {
    window.trupps = [{
      name: 'T2',
      status: 2, // Einsatzbereit in UHS (Pause)
      pausenzeit: 20 * 60000,
      totalPauseTime: 20 * 60000,
      einsatzHistorie: [],
      patientHistorie: [],
    }];

    renderTrupps();

    const pause = document.getElementById('pauseContainer');
    expect(pause.children).toHaveLength(1);
    const div = pause.firstElementChild;
    expect(div.classList.contains('pause')).toBe(true);
    expect(div.textContent).toMatch(/Aktuelle Pausenzeit: 20 Min/);
  });

  it('ordnet Nicht-einsatzbereit (status 6) in NichtContainer und zeigt Lösch-Button', () => {
    window.trupps = [{
      name: 'T3',
      status: 6, // Nicht einsatzbereit
      pausenzeit: 0,
      totalPauseTime: 0,
      einsatzHistorie: [],
      patientHistorie: [],
    }];

    renderTrupps();

    const nicht = document.getElementById('nichtContainer');
    expect(nicht.children).toHaveLength(1);
    const div = nicht.firstElementChild;
    expect(div.classList.contains('nicht-einsatzbereit')).toBe(true);
    expect(div.querySelector('.delete-btn')).not.toBeNull();
  });

  it('sortiert EinsatzContainer Streife (status 11) vor Patient (status 3)', () => {
    const now = Date.now();
    window.trupps = [
      {
        name: 'A',
        status: 11, // Streife
        einsatzzeit: 5 * 60000,
        currentEinsatzStart: now - 5 * 60000,
        pausenzeit: 0,
        totalPauseTime: 0,
        einsatzHistorie: [],
        patientHistorie: []
      },
      {
        name: 'B',
        status: 3, // Patient
        einsatzzeit: 10 * 60000,
        currentEinsatzStart: now - 10 * 60000,
        pausenzeit: 0,
        totalPauseTime: 0,
        einsatzHistorie: [],
        patientHistorie: []
      }
    ];

    renderTrupps();

    const kids = Array.from(document.getElementById('einsatzContainer').children);
    // A (Streife) kommt vor B (Patient)
    expect(kids[0].dataset.key).toBe('A');
    expect(kids[1].dataset.key).toBe('B');
  });
});
