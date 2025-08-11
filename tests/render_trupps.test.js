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
    window.toggleStatusDropdown  = jest.fn();
    window.copyToClipboard       = jest.fn();
    window.updateTrupp           = jest.fn();
    window.editOrt               = jest.fn();
    window.editPatient           = jest.fn();
    window.showTruppContextMenu  = jest.fn();

    // nextMaxEinsatzTime bereitstellen
    window.nextMaxEinsatzTime = 45;

    // statusOptions mit allen nötigen Properties
    window.statusOptions = [
      { status: 0,  text: 'Einsatz beendet', color: '#6c757d' },
      { status: 1,  text: 'Einsatzbereit auf Wache', color: '#007bff' },
      { status: 2,  text: 'Einsatzbereit in UHS', color: '#007bff' },
      { status: 3,  text: 'Patient', color: '#dc3545' },
      { status: 6,  text: 'Nicht einsatzbereit', color: '#6c757d' },
      { status: 11, text: 'Streife', color: '#28a745' },
      { status: 12, text: 'Spielfeldrand', color: '#fd7e14' },
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
    // Container anlegen mit table structure
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
    
    // Check if table was created
    const table = eins.querySelector('.trupps-table');
    expect(table).not.toBeNull();
    
    // Check if row exists
    const row = table.querySelector('tbody tr');
    expect(row).not.toBeNull();
    expect(row.classList.contains('patient')).toBe(true);
    
    // Check trupp name
    const nameCell = row.querySelector('.trupp-name strong');
    expect(nameCell.textContent.trim()).toBe('T1');
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
    
    const table = pause.querySelector('.trupps-table');
    expect(table).not.toBeNull();
    
    const row = table.querySelector('tbody tr');
    expect(row).not.toBeNull();
    expect(row.classList.contains('pause')).toBe(true);
    
    // Check if pause time is displayed
    const timeCell = row.querySelector('.time-cell');
    expect(timeCell.textContent).toMatch(/20 Min/);
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
    
    const table = nicht.querySelector('.trupps-table');
    expect(table).not.toBeNull();
    
    const row = table.querySelector('tbody tr');
    expect(row).not.toBeNull();
    expect(row.classList.contains('nicht-einsatzbereit')).toBe(true);
    expect(row.querySelector('.delete-btn')).not.toBeNull();
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

    const table = document.getElementById('einsatzContainer').querySelector('.trupps-table tbody');
    const rows = Array.from(table.querySelectorAll('tr'));
    
    // Check that we have 2 rows
    expect(rows).toHaveLength(2);
    
    // Check the names in the trupp-name cells
    const firstTruppName = rows[0].querySelector('.trupp-name strong').textContent.trim();
    const secondTruppName = rows[1].querySelector('.trupp-name strong').textContent.trim();
    
    // A (Streife) should come before B (Patient) based on sorting logic
    expect(firstTruppName).toBe('A');
    expect(secondTruppName).toBe('B');
  });

  it('creates proper table structure', () => {
    window.trupps = [{
      name: 'Test',
      status: 11,
      einsatzzeit: 0,
      pausenzeit: 0,
      totalPauseTime: 0,
      einsatzHistorie: [],
      patientHistorie: [],
    }];

    renderTrupps();

    const eins = document.getElementById('einsatzContainer');
    const table = eins.querySelector('.trupps-table');
    
    expect(table).not.toBeNull();
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    
    // Check header structure
    const headers = table.querySelectorAll('thead th');
    expect(headers).toHaveLength(4); // Trupp, Status, Einsatzort/Patient, Zeit
  });
});
