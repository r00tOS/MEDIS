/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('renderTrupps', () => {
  beforeAll(() => {
    // stub für scrollTo, damit jsdom nicht meckert
    window.scrollTo = jest.fn();

    // Stubs für externe Helfer
    window.deleteTrupp         = jest.fn();
    window.toggleStatusButtons = jest.fn();
    window.copyToClipboard     = jest.fn();
    window.updateTrupp         = jest.fn();
    window.editOrt             = jest.fn();
    window.editPatient         = jest.fn();

    // nextMaxEinsatzTime bereitstellen
    window.nextMaxEinsatzTime = 45;

    // Script injizieren
    const code = fs.readFileSync(
      path.resolve(__dirname, '../scripts/render_trupps.js'),
      'utf8'
    );
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);

    // formatTime als Spy überschreiben
    window.formatTime = jest.fn(ms => {
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

  it('ordnet "Patient"-Trupp in EinsatzContainer und markiert korrekt', () => {
    window.trupps = [{
      name: 'T1',
      status: 'Patient',
      einsatzzeit: 10 * 60000,
      pausenzeit: 5 * 60000,
      totalPauseTime: 15 * 60000,
      einsatzHistorie: [],       // leer → formatTime wird hier nicht aufgerufen
      patientHistorie: [],
      currentEinsatzStart: Date.now() - 10*60000,
    }];

    renderTrupps();

    const eins = document.getElementById('einsatzContainer');
    expect(eins.children).toHaveLength(1);
    const div = eins.firstElementChild;
    expect(div.classList.contains('patient')).toBe(true);
    expect(div.classList.contains('einsatz')).toBe(true);
    expect(div.querySelector('h3').textContent).toBe('T1');
    // kein Einsatzort, daher keine formatTime-Aufrufe:
    expect(formatTime).not.toHaveBeenCalled();
  });

  it('ordnet "Einsatzbereit in UHS" in PauseContainer und zeigt Rückhaltungshinweis', () => {
    window.trupps = [{
      name: 'T2',
      status: 'Einsatzbereit in UHS',
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

  it('ordnet "Nicht Einsatzbereit" in NichtContainer und zeigt löschen-Button', () => {
    window.trupps = [{
      name: 'T3',
      status: 'Nicht Einsatzbereit',
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

  it('sortiert EinsatzContainer nach einsatzzeit absteigend unter Berücksichtigung der Status-Priorität', () => {
    const now = Date.now();
    window.trupps = [
      { name:'A', status:'Streife', einsatzzeit:5*60000,  currentEinsatzStart: now-5*60000,  pausenzeit:0, totalPauseTime:0, einsatzHistorie:[],patientHistorie:[] },
      { name:'B', status:'Patient', einsatzzeit:10*60000, currentEinsatzStart: now-10*60000, pausenzeit:0, totalPauseTime:0, einsatzHistorie:[],patientHistorie:[] }
    ];

    renderTrupps();

    const kids = Array.from(document.getElementById('einsatzContainer').children);
    // A (Streife, sort=0) kommt vor B (Patient, sort=2)
    expect(kids[0].dataset.key).toBe('A');
    expect(kids[1].dataset.key).toBe('B');
  });
});
