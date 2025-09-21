/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('MEDIS Hauptinterface (unit tests)', () => {
  beforeAll(() => {
    // ────────────────────────────────────────
    // 0) Stub für scrollTo ganz vorne
    // ────────────────────────────────────────
    window.scrollTo = jest.fn();

    // ────────────────────────────────────────
    // 1) location komplett durch Mock ersetzen
    // ────────────────────────────────────────
    delete window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: jest.fn() }
    });

    // ────────────────────────────────────────
    // 1.5) stub presetFiles & presetlist.js
    // ────────────────────────────────────────
    window.presetFiles = ['dummy.js'];
    const presetListCode = fs.readFileSync(
      path.resolve(__dirname, '../../presets/presetlist.js'),
      'utf8'
    );
    const presetListScript = document.createElement('script');
    presetListScript.textContent = presetListCode;
    document.head.appendChild(presetListScript);

    // ────────────────────────────────────────
    // 2) HTML laden
    // ────────────────────────────────────────
    const htmlPath = path.resolve(__dirname, '../../index.html');
    const html     = fs.readFileSync(htmlPath, 'utf8');
    document.documentElement.innerHTML = html;

    // ────────────────────────────────────────
    // 3) pdf_export.js injizieren
    // ────────────────────────────────────────
    const pdfCode = fs.readFileSync(
      path.resolve(__dirname, '../../scripts/pdf_export.js'),
      'utf8'
    );
    const pdfScript = document.createElement('script');
    pdfScript.textContent = pdfCode;
    document.head.appendChild(pdfScript);

    // ────────────────────────────────────────
    // 4) Inline-Scripts aus HTML injizieren
    // ────────────────────────────────────────
    // matchAll for any <script>…</script>, including with attributes
    const inlineRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(inlineRe)) {
      if (!match[1].trim()) continue;           // skip empty
      const tag = document.createElement('script');
      tag.textContent = match[1];
      document.body.appendChild(tag);
    }

    // ────────────────────────────────────────
    // 5) Iframe-reloads stubben
    // ────────────────────────────────────────
    document.querySelectorAll('iframe').forEach((iframe) => {
      Object.defineProperty(iframe.contentWindow, 'location', {
        configurable: true,
        value: { reload: jest.fn() }
      });
    });

    // ────────────────────────────────────────
    // 6) DOMContentLoaded auslösen
    // ────────────────────────────────────────
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  
  test('PDF-Export: ruft exportTruppPDF und exportPatientPDF auf', async () => {
    const trMock = jest.spyOn(window, 'exportTruppPDF').mockResolvedValue();
    const pMock  = jest.spyOn(window, 'exportPatientPDF').mockResolvedValue();

    // Act: dispatch click and allow microtasks to run
    document.getElementById('btnExportPDF')
      .dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();

    // Assert
    expect(trMock).toHaveBeenCalled();
    expect(pMock).toHaveBeenCalled();
  });

  test('Settings-Modal öffnen, befüllen und speichern', () => {
    // Arrange
    localStorage.setItem('nextPatientNumber', '12');
    localStorage.setItem('nextMaxEinsatzTime', '99');

    const modal = document.getElementById('settingsModal');
    expect(modal.style.display).toBe('none');

    // Act: öffnen
    document.getElementById('btnSettings').click();

    // Assert: sichtbar und Inputs befüllt
    expect(modal.style.display).toBe('flex');
    const inpNP = document.getElementById('settingsNextPatient');
    const inpMT = document.getElementById('settingsMaxTime');
    expect(inpNP.value).toBe('12');
    expect(inpMT.value).toBe('99');

    // Arrange: neue Werte eingeben
    inpNP.value = '42';
    inpMT.value = '15';
    const storageSpy = jest.spyOn(window, 'dispatchEvent');

    // Act: speichern
    document.getElementById('saveSettings').click();

    // Assert: modal wieder versteckt, localStorage aktualisiert, Storage-Events gefeuert
    expect(modal.style.display).toBe('none');
    expect(localStorage.getItem('nextPatientNumber')).toBe('42');
    expect(localStorage.getItem('nextMaxEinsatzTime')).toBe('15');
    expect(storageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'storage', key: 'nextPatientNumber' })
    );
    expect(storageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'storage', key: 'nextMaxEinsatzTime' })
    );
  });

  test('Datum-/Uhrzeit-Update schreibt in #currentDate und #currentTime', () => {
    // Arrange: fixe Zeit
    jest.useFakeTimers('modern').setSystemTime(new Date('2025-05-24T09:07:05'));

    // Act
    window.updateDateTime();

    // Assert
    expect(document.getElementById('currentDate').textContent).toBe(
      '24.05.2025, Samstag'
    );
    expect(document.getElementById('currentTime').textContent).toBe('09:07:05');

    jest.useRealTimers();
  });
});
