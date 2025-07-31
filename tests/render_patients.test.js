/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('loadPatients', () => {
  beforeAll(() => {
    // 1) Stubs für alle externen Helfer, die loadPatients nur als onclick referenziert
    window.formatMS               = jest.fn(() => 'XX:XX');
    window.selectOnly             = jest.fn();
    window.updatePatientData      = jest.fn();
    window.assignSelectedTrupp    = jest.fn();
    window.openNachforderungModal = jest.fn();
    window.disposeRequest         = jest.fn();
    window.transportPatient       = jest.fn();
    window.dischargePatient       = jest.fn();
    window.promptAddEntry         = jest.fn();
    window.copyPatientData        = jest.fn();
    window.deletePatient          = jest.fn();
    window.assignResource         = jest.fn();
    window.removeTrupp            = jest.fn();
    window.removeRtm              = jest.fn();

    // 2) Script injizieren
    const code = fs.readFileSync(
      path.resolve(__dirname, '../scripts/render_patients.js'),
      'utf8'
    );
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);
  });

  beforeEach(() => {
    // sauberes DOM mit den drei Containern
    document.body.innerHTML = `
      <div id="activePatients"></div>
      <div id="inUhsPatients"></div>
      <div id="dismissedPatients"></div>
    `;
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('rendert gemeldete Patienten in #activePatients und hebt sie hervor', () => {
    // Arrange: ein gemeldeter Patient
    const now = Date.now();
    localStorage.setItem('patients', JSON.stringify([{
      id: 1,
      createdAt: now - 5000,
      status: 'gemeldet',
      statusTimestamps: { gemeldet: now - 5000 },
      durations: {
        einsatzdauer: '',
        dispositionsdauer: '',
        ausrueckdauer: '',
        behandlungsdauer: '',
        verlegedauerUHS: ''
      },
      team: [],
      location: 'TestOrt',
      history: ['12:00 Status: gemeldet'],
      disposed: {},
      rtm: [],
      remarks: '',
      diagnosis: ''
    }]));
    localStorage.setItem('trupps', JSON.stringify([]));

    // Act
    loadPatients(1);

    // Assert: in activePatients liegt genau eine Karte
    const active = document.getElementById('activePatients');
    expect(active.children).toHaveLength(1);
    const card = active.firstElementChild;
    expect(card.classList.contains('patient-card')).toBe(true);
    // Überschrift stimmt
    expect(card.querySelector('h2').textContent).toMatch(/Patient 1/);
    // Highlight-Klasse slide-in wurde angehängt
    expect(card.classList.contains('slide-in')).toBe(true);
  });

  it('rendert entlassene Patienten in #dismissedPatients', () => {
    // Arrange: ein entlassener Patient
    const now = Date.now();
    localStorage.setItem('patients', JSON.stringify([{
      id: 2,
      createdAt: now - 10000,
      status: 'Entlassen',
      statusTimestamps: { gemeldet: now - 15000 },
      durations: {},
      team: [],
      location: '',
      history: [],
      disposed: {},
      rtm: [],
      remarks: '',
      diagnosis: ''
    }]));
    localStorage.setItem('trupps', JSON.stringify([]));

    // Act
    loadPatients();

    // Assert: in dismissedPatients liegt genau eine Karte mit data-id="2"
    const dismissed = document.getElementById('dismissedPatients');
    expect(dismissed.children).toHaveLength(1);
    const card = dismissed.firstElementChild;
    expect(card.dataset.id).toBe('2');
  });
});
