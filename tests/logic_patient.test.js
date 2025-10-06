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
    
    // 2) Stub für getCurrentTime
    global.getCurrentTime = jest.fn(() => '10:00');

    // 3) Spy auf window.dispatchEvent
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    // 4) categories.js in DOM ausführen (füllt window.alarmConfig.categories)
    const categoriesCode = fs.readFileSync(
      path.resolve(__dirname, '../scripts/categories.js'),
      'utf8'
    );
    const catScript = document.createElement('script');
    catScript.textContent = categoriesCode;
    document.body.appendChild(catScript);

    // 5) logic_patient.js in DOM ausführen
    const logicCode = fs.readFileSync(
      path.resolve(__dirname, '../scripts/logic_patient.js'),
      'utf8'
    );
    const logicScript = document.createElement('script');
    logicScript.textContent = logicCode;
    document.body.appendChild(logicScript);

    // 6) Jetzt liegt clearAssignments auf window
    clearAssignments = window.clearAssignments;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('updates patient status for final states, persists it, and calls loadPatients', () => {
    localStorage.setItem(
      'patients',
      JSON.stringify([{ id: 'p1', status: 'active', history: [] }])
    );
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    // Test with final status
    clearAssignments('p1', 'Entlassen');

    const patients = JSON.parse(localStorage.getItem('patients'));
    expect(patients[0].status).toBe('Entlassen');
    expect(patients[0].history).toContain('10:00 Status: Entlassen');
    expect(global.loadPatients).toHaveBeenCalledWith('p1');
  });

  it('does not update patient status for non-final states', () => {
    localStorage.setItem(
      'patients',
      JSON.stringify([{ id: 'p1', status: 'active', history: [] }])
    );
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    // Test with non-final status
    clearAssignments('p1', 'disponiert');

    const patients = JSON.parse(localStorage.getItem('patients'));
    expect(patients[0].status).toBe('active'); // Should remain unchanged
    expect(global.loadPatients).toHaveBeenCalledWith('p1');
  });

  it('closes assignments on all matching trupps and fires storage events', () => {
    localStorage.setItem(
      'patients',
      JSON.stringify([{ id: 'p1', status: 'active', history: [] }])
    );
    localStorage.setItem(
      'trupps',
      JSON.stringify([{
        name: 'T1',
        patientInput: 'p1',
        patientStart: 500,
        status: 3,             // numerischer Code für „Patient"
        patientHistorie: [],
        history: []
      }])
    );
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    clearAssignments('p1', 'Entlassen');

    const trupps = JSON.parse(localStorage.getItem('trupps'));
    const t = trupps[0];
    // patientInput und patientStart wurden zurückgesetzt
    expect(t.patientInput).toBeNull();
    expect(t.patientStart).toBeNull();
    // Status wurde auf 0 („Einsatz beendet") gesetzt
    expect(t.status).toBe(0);
    // die Historie des Patienteneinsatzes wurde korrekt ergänzt
    expect(t.patientHistorie).toEqual([
      { nummer: 'p1', von: 500, bis: 1000 }
    ]);
    // und das eigene History‐Array enthält ein Event { when, event }
    expect(t.history).toEqual([
      { when: 1000, event: 0 }
    ]);

    // Multiple Storage‐Events wurden gefeuert (patients, trupps, rtms)
    expect(dispatchSpy).toHaveBeenCalledTimes(3);
    
    // Check that all three storage events were dispatched
    const storageEvents = dispatchSpy.mock.calls
      .filter(call => call[0] instanceof StorageEvent)
      .map(call => call[0].key);
    
    expect(storageEvents).toContain('patients');
    expect(storageEvents).toContain('trupps');
    expect(storageEvents).toContain('rtms');
  });

  it('closes assignments on matching RTMs via patientInput', () => {
    localStorage.setItem(
      'patients',
      JSON.stringify([{ id: 'p1', status: 'active', history: [] }])
    );
    localStorage.setItem(
      'rtms',
      JSON.stringify([{
        name: 'RTM1',
        patientInput: 'p1',
        patientStart: 500,
        status: 3,
        patientHistorie: [],
        history: []
      }])
    );
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    clearAssignments('p1', 'Transport in KH');

    const rtms = JSON.parse(localStorage.getItem('rtms'));
    const r = rtms[0];
    expect(r.patientInput).toBeNull();
    expect(r.patientStart).toBeNull();
    expect(r.status).toBe(0);
    expect(r.patientHistorie).toEqual([
      { nummer: 'p1', von: 500, bis: 1000 }
    ]);
    expect(r.history).toEqual([
      { when: 1000, event: 0 }
    ]);
  });

  it('closes assignments on RTMs via patient.rtm array and removes them from patient', () => {
    localStorage.setItem(
      'patients',
      JSON.stringify([{ 
        id: 'p1', 
        status: 'active', 
        history: [],
        rtm: ['RTM1'],
        team: ['T1']
      }])
    );
    localStorage.setItem(
      'rtms',
      JSON.stringify([{
        name: 'RTM1',
        patientInput: null, // Not linked via patientInput
        patientStart: 500,
        status: 4, // Active status
        patientHistorie: [],
        history: []
      }])
    );
    localStorage.setItem(
      'trupps',
      JSON.stringify([{
        name: 'T1',
        patientInput: null, // Not linked via patientInput
        patientStart: 500,
        status: 4, // Active status
        patientHistorie: [],
        history: []
      }])
    );
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    clearAssignments('p1', 'Entlassen');

    // Check that RTMs and teams were cleared
    const rtms = JSON.parse(localStorage.getItem('rtms'));
    expect(rtms[0].status).toBe(0);
    expect(rtms[0].patientInput).toBeNull();
    expect(rtms[0].patientStart).toBeNull();

    const trupps = JSON.parse(localStorage.getItem('trupps'));
    expect(trupps[0].status).toBe(0);
    expect(trupps[0].patientInput).toBeNull();
    expect(trupps[0].patientStart).toBeNull();

    // Check that patient arrays were cleared and history entries added
    const patients = JSON.parse(localStorage.getItem('patients'));
    expect(patients[0].rtm).toEqual([]);
    expect(patients[0].team).toEqual([]);
    expect(patients[0].history).toContain('10:00 RTM RTM1 entfernt');
    expect(patients[0].history).toContain('10:00 Trupp T1 entfernt');
    expect(patients[0].status).toBe('Entlassen');
  });
});

describe('removeTrupp', () => {
  let removeTrupp;
  let loadPatients;
  let triggerDispositionUpdate;
  let dispatchSpy;

  beforeAll(() => {
    // Load getCurrentTime stub
    global.getCurrentTime = jest.fn(() => '10:00');

    // Load logic_patient.js
    const logicCode = fs.readFileSync(
      path.resolve(__dirname, '../scripts/logic_patient.js'),
      'utf8'
    );
    const logicScript = document.createElement('script');
    logicScript.textContent = logicCode;
    document.body.appendChild(logicScript);

    removeTrupp = window.removeTrupp;
    loadPatients = window.loadPatients = jest.fn();
    triggerDispositionUpdate = window.triggerDispositionUpdate = jest.fn();
    
    // Mock confirm to always return true
    global.confirm = jest.fn(() => true);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');
  });

  it('should clear patientInput even when patientStart is null', () => {
    // Setup patient with trupp
    localStorage.setItem(
      'patients',
      JSON.stringify([{
        id: 'p1',
        team: ['T1'],
        history: []
      }])
    );

    // Setup trupp with patientInput but NO patientStart (the bug scenario)
    localStorage.setItem(
      'trupps',
      JSON.stringify([{
        name: 'T1',
        patientInput: 'p1',
        patientStart: null, // This is the key - patientStart is null
        status: 3,
        patientHistorie: [],
        history: []
      }])
    );

    jest.spyOn(Date, 'now').mockReturnValue(1000);

    // Remove trupp from patient
    removeTrupp('p1', 0);

    // Verify trupp patient reference is cleared
    const trupps = JSON.parse(localStorage.getItem('trupps'));
    expect(trupps[0].patientInput).toBeNull();
    expect(trupps[0].patientStart).toBeNull();
    expect(trupps[0].status).toBe(0);
  });

  it('should clear patientInput and save history when both patientInput and patientStart exist', () => {
    // Setup patient with trupp
    localStorage.setItem(
      'patients',
      JSON.stringify([{
        id: 'p1',
        team: ['T1'],
        history: []
      }])
    );

    // Setup trupp with both patientInput and patientStart
    localStorage.setItem(
      'trupps',
      JSON.stringify([{
        name: 'T1',
        patientInput: 'p1',
        patientStart: 500,
        status: 3,
        patientHistorie: [],
        history: []
      }])
    );

    jest.spyOn(Date, 'now').mockReturnValue(1000);

    // Remove trupp from patient
    removeTrupp('p1', 0);

    // Verify trupp patient reference is cleared and history is saved
    const trupps = JSON.parse(localStorage.getItem('trupps'));
    expect(trupps[0].patientInput).toBeNull();
    expect(trupps[0].patientStart).toBeNull();
    expect(trupps[0].status).toBe(0);
    expect(trupps[0].patientHistorie).toEqual([
      { nummer: 'p1', von: 500, bis: 1000 }
    ]);
  });

  it('should remove trupp from patient team array', () => {
    // Setup patient with trupp
    localStorage.setItem(
      'patients',
      JSON.stringify([{
        id: 'p1',
        team: ['T1', 'T2'],
        history: []
      }])
    );

    // Setup trupp
    localStorage.setItem(
      'trupps',
      JSON.stringify([{
        name: 'T1',
        patientInput: 'p1',
        patientStart: null,
        status: 3,
        patientHistorie: [],
        history: []
      }])
    );

    jest.spyOn(Date, 'now').mockReturnValue(1000);

    // Remove first trupp
    removeTrupp('p1', 0);

    // Verify trupp is removed from patient
    const patients = JSON.parse(localStorage.getItem('patients'));
    expect(patients[0].team).toEqual(['T2']);
    expect(patients[0].history).toContain('10:00 Trupp T1 entfernt');
  });
});
