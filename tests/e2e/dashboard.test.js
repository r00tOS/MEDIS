/**
 * @jest-environment puppeteer
 */

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

describe('Einsatz-Dashboard (dashboard.html)', () => {
  beforeAll(async () => {
    await page.goto('http://localhost:3000/sites/dashboard.html');
  });

  beforeEach(async () => {
    await page.evaluate(() => localStorage.clear());
    // direkt neu rendern lassen
    await page.reload();
  });

  it('zeigt „Keine Daten" wenn leer', async () => {
    await page.waitForSelector('#count-patients');

    const ids = [
      'count-patients',
      'count-inUHS',
      'count-discharged',
      'count-transport',
    ];
    const texts = await Promise.all(
      ids.map((id) =>
        page.$eval(`#${id}`, (el) => el.textContent.trim())
      )
    );
    expect(texts).toEqual(['0','0','0','0']);

    // Prüfe Trupp-Übersicht
    const truppOverviewText = await page.$eval(
      '#trupp-overview tr',
      (tr) => tr.textContent
    );
    expect(truppOverviewText).toMatch(/Keine Daten/);

    // Prüfe RTM-Übersicht
    const rtmOverviewText = await page.$eval(
      '#rtm-overview tr',
      (tr) => tr.textContent
    );
    expect(rtmOverviewText).toMatch(/Keine Daten/);

    // Prüfe Patienten-Tabelle
    const rowText = await page.$eval(
      '#patient-list tr',
      (tr) => tr.textContent
    );
    expect(rowText).toMatch(/Keine Daten/);
  });

  it('aktualisiert die Übersichten korrekt', async () => {
    await page.evaluate(() => {
      localStorage.setItem('trupps', JSON.stringify([
        { name:'T1', status: 11, patientInput: null }, // Streife
        { name:'T2', status:  2, patientInput: null }, // Einsatzbereit in UHS
        { name:'T3', status:  6, patientInput: null }  // Nicht Einsatzbereit
      ]));
      localStorage.setItem('rtms', JSON.stringify([
        { name:'RTM1', status: 1 },
        { name:'RTM2', status: 2 }
      ]));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'trupps',
        newValue: localStorage.getItem('trupps')
      }));
    });

    // kurz warten, damit renderDashboard läuft
    await delay(200);

    // Prüfe dass Trupp-Übersicht gefüllt ist
    const truppRows = await page.$$eval(
      '#trupp-overview tr',
      (trs) => trs.length
    );
    expect(truppRows).toBeGreaterThan(1); // Header + mindestens 1 Datenzeile

    // Prüfe dass RTM-Übersicht gefüllt ist
    const rtmRows = await page.$$eval(
      '#rtm-overview tr',
      (trs) => trs.length
    );
    expect(rtmRows).toBeGreaterThan(1); // Header + mindestens 1 Datenzeile

    // Prüfe dass Status-Text mit Nummer angezeigt wird - korrigierter Selektor
    const truppStatusText = await page.$eval(
      '#trupp-overview tr:nth-child(2) td:nth-child(2)',
      (td) => td.textContent
    );
    expect(truppStatusText).toMatch(/^\d+ - /); // Sollte mit "Nummer - " beginnen
  });

  it('aktualisiert die Patienten-Zähler und Tabelle korrekt', async () => {
    await page.evaluate(() => {
      localStorage.setItem('patients', JSON.stringify([
        { id:1, status:'gemeldet',       location:'A', age:30, gender:'M', diagnosis:'X' },
        { id:2, status:'Behandlung in UHS', location:'B', age:40, gender:'W', diagnosis:'Y' },
        { id:3, status:'Entlassen',      location:'C', age:50, gender:'D', diagnosis:'Z' },
        { id:4, status:'Transport in KH', location:'D', age:60, gender:'M', diagnosis:'W' }
      ]));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'patients',
        newValue: localStorage.getItem('patients')
      }));
    });

    await delay(200);

    const patCounts = await Promise.all(
      ['count-patients','count-inUHS','count-discharged','count-transport'].map((id) =>
        page.$eval(`#${id}`, (el) => el.textContent.trim())
      )
    );
    expect(patCounts).toEqual(['2','1','1','1']);

    const rows = await page.$$eval(
      '#patient-list tr',
      (trs) => trs.map((r) => r.getAttribute('data-status')).filter(Boolean)
    );
    expect(rows).toEqual(expect.arrayContaining(['gemeldet','Behandlung in UHS']));
    expect(rows).not.toContain('Entlassen');
    expect(rows).not.toContain('Transport in KH');
  });

  it('zeigt Trupp-Status mit Farben an', async () => {
    await page.evaluate(() => {
      localStorage.setItem('trupps', JSON.stringify([
        { name:'T1', status: 3, patientInput: 'P001' }, // Patient-Status
        { name:'T2', status: 1, patientInput: null }     // Pause-Status
      ]));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'trupps',
        newValue: localStorage.getItem('trupps')
      }));
    });

    await delay(200);

    // Prüfe dass Status-Zellen Hintergrundfarben haben
    const statusCells = await page.$$eval(
      '#trupp-overview .status-cell',
      (cells) => cells.map(cell => ({
        text: cell.textContent,
        hasBackgroundColor: cell.style.backgroundColor !== ''
      }))
    );

    expect(statusCells.length).toBeGreaterThan(0);
    statusCells.forEach(cell => {
      expect(cell.hasBackgroundColor).toBe(true);
      expect(cell.text).toMatch(/^\d+ - /); // Status mit Nummer
    });
  });
}, 10000); // Erhöhe Timeout auf 10 Sekunden
