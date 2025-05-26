/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('newPatient & nextPatientNumber', () => {
  beforeAll(() => {
    // 1) Spy auf window.dispatchEvent, um das Storage-Event zu erfassen
    jest.spyOn(window, 'dispatchEvent');

    // 2) Stubs für Datum: Date.now() und toLocaleTimeString()
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    jest
      .spyOn(Date.prototype, 'toLocaleTimeString')
      .mockReturnValue('12:34');

    // 3) Simuliere DOM-Script-Injektion von main.js
    const code = fs.readFileSync(
      path.resolve(__dirname, '../scripts/main.js'),
      'utf8'
    );
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);
  });

  beforeEach(() => {
    // Clear LocalStorage und zurücksetzen
    localStorage.clear();
    // nextPatientNumber wird beim Script-Load initial auf 1 gesetzt
    window.nextPatientNumber = parseInt(
      localStorage.getItem('nextPatientNumber'),
      10
    ) || 1;
    jest.clearAllMocks();
  });

  test('newPatient gibt alte ID zurück und erhöht nextPatientNumber', () => {
    // Vorher: no patients, nextPatientNumber=1
    expect(window.nextPatientNumber).toBe(1);

    const returnedId = newPatient({
      team: ['T1'],
      location: 'L1',
      initialStatus: 'gemeldet'
    });

    // Rückgabe ist alte ID
    expect(returnedId).toBe(1);
    // nextPatientNumber global ist jetzt 2
    expect(window.nextPatientNumber).toBe(2);
    // localStorage nextPatientNumber ist "2"
    expect(localStorage.getItem('nextPatientNumber')).toBe('2');
  });

  test('newPatient speichert Patient in localStorage und feuert Event', () => {
    const id = newPatient({ team: 'T1', location: 'L1' });

    // Aus localStorage geladene Patienten-Liste
    const patients = JSON.parse(localStorage.getItem('patients'));
    expect(patients).toHaveLength(1);

    const p = patients[0];
    expect(p.id).toBe(id);
    expect(p.team).toEqual(['T1']);
    expect(p.location).toBe('L1');
    expect(p.status).toBe('gemeldet');
    // createdAt ist Date.now()
    expect(p.createdAt).toBe(1_700_000_000_000);
    // statusTimestamps.gemeldet gesetzt
    expect(p.statusTimestamps.gemeldet).toBe(1_700_000_000_000);
    // History-Eintrag mit getCurrentTime()
    expect(p.history).toEqual(['12:34 Status: gemeldet']);

    // Storage-Event wurde gefeuert mit key 'patients'
    expect(window.dispatchEvent).toHaveBeenCalled();
    const evt = window.dispatchEvent.mock.calls[0][0];
    expect(evt).toBeInstanceOf(StorageEvent);
    expect(evt.key).toBe('patients');
    const newValue = JSON.parse(evt.newValue);
    expect(newValue).toEqual(patients);
  });

  test('Storage-Event synchronisiert nextPatientNumber', () => {
    // Simuliere externes Update
    const event = new StorageEvent('storage', {
      key: 'nextPatientNumber',
      newValue: '42'
    });
    window.dispatchEvent(event);
    // global Variable wurde angepasst
    expect(window.nextPatientNumber).toBe(42);
  });
});
