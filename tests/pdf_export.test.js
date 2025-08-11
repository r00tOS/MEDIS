/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('PDF Export', () => {
  let docMock, jsPDFMock;

  beforeAll(() => {
    // 1) Feste Zeit für deterministische Timestamp-/Filename-Erzeugung
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2025-05-24T12:34:00Z').getTime());
    jest
      .spyOn(Date.prototype, 'toLocaleTimeString')
      .mockReturnValue('12:34');
    jest.spyOn(Date.prototype, 'getDate').mockReturnValue(24);
    jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(4);   // Mai = 4
    jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2025);
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(12);
    jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(34);

    // 2) Mock-Implementierung für jsPDF-Objekt
    docMock = {
      setFontSize: jest.fn(),
      setFont: jest.fn(),            // <- neu hinzugefügt
      text: jest.fn(),
      addPage: jest.fn(),
      save: jest.fn(),
      splitTextToSize: jest.fn(text => [text]),
      internal: {
        pageSize: {
          getHeight: () => 800,
          getWidth:  () => 600,
        }
      },
      setDrawColor: jest.fn(),
      rect: jest.fn(),
    };
    jsPDFMock = jest.fn(() => docMock);

    // 3) window.jspdf einrichten
    window.jspdf = { jsPDF: jsPDFMock };

    // 4) Script-Datei injizieren (Pfad anpassen, falls nötig)
    const code = fs.readFileSync(
      path.resolve(__dirname, '../scripts/pdf_export.js'),
      'utf8'
    );
    const script = document.createElement('script');
    script.textContent = code;
    document.body.appendChild(script);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('exportTruppPDF erzeugt PDF und ruft save() mit korrektem Dateinamen auf', async () => {
    // Arrange: ein Trupp mit einer Einsatzhistorie
    const timestamp = Date.now() - 3600000;
    localStorage.setItem('trupps', JSON.stringify([{
      name: 'Team1',
      totalPauseTime: 120000,             // 2 Min Pause
      einsatzHistorie: [{ ort: 'OrtA', von: timestamp, bis: Date.now() }],
      patientHistorie: []
    }]));

    // Act
    await exportTruppPDF();

    // Assert: jsPDF wurde instanziert
    expect(jsPDFMock).toHaveBeenCalled();
    // Assert: Überschrift geschrieben
    expect(docMock.text).toHaveBeenCalledWith('Truppübersicht', 10, 10);
    // Assert: save() mit timestamp-basiertem Namen
    expect(docMock.save).toHaveBeenCalledWith(
      expect.stringMatching(/^trupp_rtm_uebersicht_24_05_2025_12_34\.pdf$/)
    );
  });

  test('exportPatientPDF erzeugt PDF und ruft save() mit korrektem Dateinamen auf', async () => {
    // Arrange: ein Patient mit Beispieldaten
    localStorage.setItem('patients', JSON.stringify([{
      id: 1,
      status: 'in Behandlung',
      location: 'Station',
      age: 42,
      gender: 'M',
      diagnosis: 'Testdiag',
      team: ['Team1'],
      rtm: ['RTM1'],
      remarks: 'Keine',
      history: ['12:00 Erstaufnahme'],
      durations: {
        einsatzdauer: '00:10',
        dispositionsdauer: '00:05',
        ausrueckdauer: '00:02',
        behandlungsdauer: '00:20',
        verlegedauerUHS: '00:03'
      }
    }]));

    // Act
    await exportPatientPDF();

    // Assert: jsPDF mit Optionen instanziert
    expect(jsPDFMock).toHaveBeenCalledWith({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait'
    });
    // Assert: Titel geschrieben
    expect(docMock.text).toHaveBeenCalledWith(
      'Patientenübersicht',
      expect.any(Number),
      expect.any(Number)
    );
    // Assert: save() mit timestamp-basiertem Namen
    expect(docMock.save).toHaveBeenCalledWith(
      expect.stringMatching(/^patienten_uebersicht_24_05_2025_12_34\.pdf$/)
    );
  });
});
