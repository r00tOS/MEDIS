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

  it('zeigt „Keine Daten“ wenn leer', async () => {
    await page.waitForSelector('#count-einsatz');

    // statt $$eval mit Array: einzeln abfragen
    const ids = [
      'count-einsatz',
      'count-pause',
      'count-nicht',
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
    // alle Zähler sollten "0" sein, Dashboard nutzt "0" statt "–"
    expect(texts).toEqual(['0','0','0','0','0','0','0']);

    const rowText = await page.$eval(
      '#patient-list tr',
      (tr) => tr.textContent
    );
    expect(rowText).toMatch(/Keine Daten/);
  });

  it('aktualisiert die Trupp-Zähler korrekt', async () => {
    await page.evaluate(() => {
      localStorage.setItem('trupps', JSON.stringify([
        { name:'T1', status:'Streife' },
        { name:'T2', status:'Einsatzbereit in UHS' },
        { name:'T3', status:'Nicht Einsatzbereit' }
      ]));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'trupps',
        newValue: localStorage.getItem('trupps')
      }));
    });

    // kurz warten, damit renderDashboard läuft
    await delay(100);

    const counts = await Promise.all(
      ['count-einsatz','count-pause','count-nicht'].map((id) =>
        page.$eval(`#${id}`, (el) => el.textContent.trim())
      )
    );
    expect(counts).toEqual(['1','1','1']);
  });

  it('aktualisiert die Patienten-Zähler und Tabelle korrekt', async () => {
    await page.evaluate(() => {
      localStorage.setItem('patients', JSON.stringify([
        { id:1, status:'gemeldet', location:'A', age:30, gender:'M', diagnosis:'X' },
        { id:2, status:'Behandlung in UHS', location:'B', age:40, gender:'W', diagnosis:'Y' },
        { id:3, status:'Entlassen', location:'C', age:50, gender:'D', diagnosis:'Z' },
        { id:4, status:'Transport in KH', location:'D', age:60, gender:'M', diagnosis:'W' }
      ]));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'patients',
        newValue: localStorage.getItem('patients')
      }));
    });

    await delay(100);

    const patCounts = await Promise.all(
      ['count-patients','count-inUHS','count-discharged','count-transport'].map((id) =>
        page.$eval(`#${id}`, (el) => el.textContent.trim())
      )
    );
    expect(patCounts).toEqual(['2','1','1','1']);

    const rows = await page.$$eval(
      '#patient-list tr',
      (trs) => trs.map((r) => r.getAttribute('data-status'))
    );
    expect(rows).toEqual(expect.arrayContaining(['gemeldet','Behandlung in UHS']));
    expect(rows).not.toContain('Entlassen');
    expect(rows).not.toContain('Transport in KH');
  });
});
