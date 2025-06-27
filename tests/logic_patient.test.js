/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('clearAssignments', () => {
  let clearAssignments;
  let dispatchSpy;

  beforeAll(() => {
    // 1) Stub für loadPatients
    global.loadPatients = jest.fn();

    // 2) Spy auf window.dispatchEvent
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    // 3) categories.js in DOM ausführen (füllt window.alarmConfig.categories)
    const categoriesCode = fs.readFileSync(
      path.resolve(__dirname, '../scripts/categories.js'),
      'utf8'
    );
    const catScript = document.createElement('script');
    catScript.textContent = categoriesCode;
    document.body.appendChild(catScript);

    // 4) logic_patient.js in DOM ausführen
    const logicCode = fs.readFileSync(
      path.resolve(__dirname, '../scripts/logic_patient.js'),
      'utf8'
    );
    const logicScript = document.createElement('script');
    logicScript.textContent = logicCode;
    document.body.appendChild(logicScript);

    // 5) Jetzt liegt clearAssignments auf window
    clearAssignments = window.clearAssignments;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('updates patient status, persists it, and calls loadPatients', () => {
    localStorage.setItem(
      'patients',
      JSON.stringify([{ id: 'p1', status: 'active' }])
    );
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    clearAssignments('p1', 'finished');

    const patients = JSON.parse(localStorage.getItem('patients'));
    expect(patients[0].status).toBe('finished');
    expect(global.loadPatients).toHaveBeenCalledWith('p1');
  });

  it('closes assignments on all matching trupps and fires storage event', () => {
    localStorage.setItem(
      'patients',
      JSON.stringify([{ id: 'p1', status: 'active' }])
    );
    localStorage.setItem(
      'trupps',
      JSON.stringify([{
        name: 'T1',
        patientInput: 'p1',
        patientStart: 500,
        status: 3,             // numerischer Code für „Patient“
        patientHistorie: [],
        history: []
      }])
    );
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    clearAssignments('p1', 'finished');

    const trupps = JSON.parse(localStorage.getItem('trupps'));
    const t = trupps[0];
    // patientInput und patientStart wurden zurückgesetzt
    expect(t.patientInput).toBeNull();
    expect(t.patientStart).toBeNull();
    // Status wurde auf 0 („Einsatz beendet“) gesetzt
    expect(t.status).toBe(0);
    // die Historie des Patienteneinsatzes wurde korrekt ergänzt
    expect(t.patientHistorie).toEqual([
      { nummer: 'p1', von: 500, bis: 1000 }
    ]);
    // und das eigene History‐Array enthält ein Event { when, event }
    expect(t.history).toEqual([
      { when: 1000, event: 0 }
    ]);

    // Storage‐Event wurde gefeuert
    expect(dispatchSpy).toHaveBeenCalled();
    const evt = dispatchSpy.mock.calls.find(
      call => call[0] instanceof StorageEvent
    )[0];
    expect(evt.key).toBe('trupps');
  });
});
