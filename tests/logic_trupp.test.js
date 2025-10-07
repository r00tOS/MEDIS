/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('updateTrupp', () => {
  beforeAll(() => {
    // ——— Stubs & Globals ———
    global.newPatient         = jest.fn().mockReturnValue('new-pid');
    global.openEditModal      = jest.fn();
    global.openEinsatzortModal = jest.fn();      // <— hier stubben
    global.addHistoryEntry    = jest.fn();
    global.addHistoryEvent    = jest.fn();       
    global.saveTrupps         = jest.fn();
    global.renderTrupps       = jest.fn();
    window.scrollTo           = jest.fn();
    window.prompt             = jest.fn().mockReturnValue(null);

    // Damit logic_trupp.js nicht über nextMaxEinsatzTime stolpert:
    window.nextMaxEinsatzTime = 45;

    // Lege das Input-Feld aus deinem HTML an:
    const input = document.createElement('input');
    input.id = 'maxEinsatzTime';
    document.body.appendChild(input);

    // ——— categories.js ausführen (falls benötigt) ———
    const catCode = fs.readFileSync(
      path.resolve(__dirname, '../scripts/categories.js'),
      'utf8'
    );
    const catScript = document.createElement('script');
    catScript.textContent = catCode;
    document.body.appendChild(catScript);

    // ——— logic_trupp.js in den DOM injizieren ———
    const truppCode = fs.readFileSync(
      path.resolve(__dirname, '../scripts/logic_trupp.js'),
      'utf8'
    );
    const truppScript = document.createElement('script');
    truppScript.textContent = truppCode;
    document.body.appendChild(truppScript);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Initialisiere das globale trupps-Array wie dein App es erwartet
    window.trupps = [{
      name: 'T1',
      status: 6,                      // 6 = Nicht Einsatzbereit
      pausenzeit: 999,
      currentPauseStart: null,
      einsatzzeit: 999,
      currentEinsatzStart: null,
      currentOrt: '',
      einsatzStartOrt: null,
      patientInput: 'p1',
      patientStart: 200,
      einsatzHistorie: [],
      patientHistorie: [],
      history: []
    }];
    
    // Synchronisiere mit localStorage - das fehlte!
    localStorage.setItem("trupps", JSON.stringify(window.trupps));
  });

  test('wechsel in Pausen-Status setzt pausenzeit=0 und currentPauseStart', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    // Status-Code 2 = Einsatzbereit in UHS (Pause)
    updateTrupp(0, 2);
    // updateTrupp lädt aus localStorage, also müssen wir auch dort nachlesen
    const updatedTrupps = JSON.parse(localStorage.getItem("trupps"));
    const t = updatedTrupps[0];
    expect(t.pausenzeit).toBe(0);
    expect(t.currentPauseStart).toBe(1000);
  });

  test('wechsel weg von Pausen-Status löscht currentPauseStart', () => {
    // Ausgangszustand: Trupp ist in Pause
    window.trupps[0].status = 2;
    window.trupps[0].currentPauseStart = 500;
    localStorage.setItem("trupps", JSON.stringify(window.trupps));
    
    // zurück auf Nicht Einsatzbereit (6)
    updateTrupp(0, 6);
    const updatedTrupps = JSON.parse(localStorage.getItem("trupps"));
    const t = updatedTrupps[0];
    expect(t.currentPauseStart).toBeNull();
  });

  test('wechsel in Einsatz-Status setzt einsatzzeit=0 und currentEinsatzStart', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2000);
    // Status-Code 11 = Streife (Einsatz)
    updateTrupp(0, 11);
    const updatedTrupps = JSON.parse(localStorage.getItem("trupps"));
    const t = updatedTrupps[0];
    expect(t.einsatzzeit).toBe(0);
    expect(t.currentEinsatzStart).toBe(2000);
  });

  test('wechsel weg von Patient fügt patientHistorie-Entry hinzu und leert patientInput/patientStart', () => {
    // Setup: alter Status war Patient (3) und patientStart gesetzt
    window.trupps[0].status = 3;
    window.trupps[0].patientStart = 500;
    localStorage.setItem("trupps", JSON.stringify(window.trupps));

    jest.spyOn(Date, 'now').mockReturnValue(1500);

    // von Patient (3) → Nicht Einsatzbereit (6)
    updateTrupp(0, 6);

    const updatedTrupps = JSON.parse(localStorage.getItem("trupps"));
    const t = updatedTrupps[0];
    expect(t.patientHistorie).toEqual([
      { nummer: 'p1', von: 500, bis: 1500 }
    ]);
    expect(t.patientInput).toBeNull();
    expect(t.patientStart).toBeNull();
  });
});
