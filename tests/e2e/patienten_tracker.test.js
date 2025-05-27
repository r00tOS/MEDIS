/**
 * @jest-environment puppeteer
 */

describe('Patienten-Tracker (patienten_tracker.html)', () => {
  beforeAll(async () => {
    // stell sicher, dass dein dev-Server unter Port 3000 läuft und die Datei patienten_tracker.html liefert
    await page.goto('http://localhost:3000/sites/patienten_tracker.html');
  });

  beforeEach(async () => {
    // reset localStorage und schließe evtl. offene Modals
    await page.evaluate(() => {
      localStorage.clear();
      const modal = document.getElementById('keywordModal');
      if (modal) modal.style.display = 'none';
    });
  });

  it('legt beim Klick auf "Neuen Patienten erstellen" einen neuen Patienten an und öffnet das Modal', async () => {
    // Klick auf den Button
    await page.click('#btnNewPatient');

    // Erwartet: keywordModal ist sichtbar
    await page.waitForSelector('#keywordModal', { visible: true });

    // Und im localStorage liegt nun ein Patient
    const patients = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('patients') || '[]')
    );
    expect(patients).toHaveLength(1);
    expect(patients[0]).toHaveProperty('id');
  });

  it('zeigt im Active-Bereich den frisch angelegten Patienten', async () => {
    // erst neuen Patienten anlegen
    await page.click('#btnNewPatient');
    await page.waitForSelector('#keywordModal', { visible: true });

    // Modal schließen, um die Karte zu sehen
    await page.evaluate(() => {
      document.getElementById('keywordModal').style.display = 'none';
    });

    // Patient-Karte sollte im #activePatients-Container liegen
    const cards = await page.$$eval('#activePatients .patient-card', els =>
      els.map(e => e.dataset.id)
    );
    expect(cards).toHaveLength(1);
    // dataset.id ist die ID des Patienten
    expect(Number(cards[0])).toBeGreaterThan(0);
  });

  it('entfernt einen Trupp vom Patienten, wenn in trupps storage-event Status wechselt', async () => {
    // 1) Patienten anlegen und diagnostizieren
    await page.click('#btnNewPatient');
    await page.waitForSelector('#keywordModal', { visible: true });
    // im Modal auf Suche klicken, eine Kategorie + Stichwort auswählen …
    // hier einfach direkt in den localStorage einfügen:
    const patientId = await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('patients'))[0];
      // Simuliere, dass beim ConfirmKeyword resources gesetzt werden
      p.team = ['T1'];
      localStorage.setItem('patients', JSON.stringify([p]));
      return p.id;
    });
    // 2) Trupps so ins Storage schreiben, dass T1 zunächst status 'Patient' hat …
    await page.evaluate(() => {
      localStorage.setItem(
        'trupps',
        JSON.stringify([{ name: 'T1', status: 'Patient' }])
      );
    });
    // 3) Wechseln T1 auf einen Nicht-Patient-Status
    await page.evaluate(() => {
      localStorage.setItem(
        'trupps',
        JSON.stringify([{ name: 'T1', status: 'Nicht Einsatzbereit' }])
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'trupps',
          newValue: localStorage.getItem('trupps'),
        })
      );
    });
    // 4) kurz warten und dann prüfen, dass im patient-storage die team-Liste leer ist
    await page.evaluate(() => new Promise(res => setTimeout(res, 100)));
    const teamAfter = await page.evaluate(id => {
      const p = JSON.parse(localStorage.getItem('patients')).find(x => x.id === id);
      return p.team;
    }, patientId);
    expect(teamAfter).toEqual([]);
  });
});
