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

    // Modal schließen, um die Tabelle zu sehen
    await page.evaluate(() => {
      document.getElementById('keywordModal').style.display = 'none';
    });

    // Warte auf das Rendering der Tabelle
    await page.waitForSelector('#patients-table-body', { visible: true });
    
    // Warte bis Patient-Rows geladen sind
    await page.waitForFunction(
      () => document.querySelectorAll('#patients-table-body tr.patient-row').length > 0,
      { timeout: 3000 }
    );

    // Patient-Row sollte in der Tabelle liegen (neue Struktur mit table)
    const patientRows = await page.$$eval('#patients-table-body tr.patient-row', els =>
      els.map(e => e.dataset.id).filter(id => id) // Filter out undefined/empty IDs
    );
    
    expect(patientRows).toHaveLength(1);
    // dataset.id ist die ID des Patienten
    expect(Number(patientRows[0])).toBeGreaterThan(0);
  });

  it('entfernt einen Trupp vom Patienten, wenn in trupps storage-event Status wechselt', async () => {
    // 1) Patienten anlegen und diagnostizieren
    await page.click('#btnNewPatient');
    await page.waitForSelector('#keywordModal', { visible: true });
    
    // Modal schließen und Patient-Daten direkt setzen
    await page.evaluate(() => {
      document.getElementById('keywordModal').style.display = 'none';
    });
    
    const patientId = await page.evaluate(() => {
      const patients = JSON.parse(localStorage.getItem('patients') || '[]');
      const p = patients[0];
      // Simuliere, dass beim ConfirmKeyword resources und team gesetzt werden
      p.team = ['T1'];
      p.status = 'disponiert'; // Setze Status explizit
      localStorage.setItem('patients', JSON.stringify([p]));
      return p.id;
    });
    
    // 2) Trupps so ins Storage schreiben, dass T1 zunächst status 3 (Patient) hat
    await page.evaluate(() => {
      localStorage.setItem(
        'trupps',
        JSON.stringify([{ name: 'T1', status: 3 }]) // Status 3 = Einsatz übernommen
      );
    });
    
    // 3) Wechseln T1 auf einen Nicht-Patient-Status (z.B. Status 6 = Nicht Einsatzbereit)
    await page.evaluate(() => {
      localStorage.setItem(
        'trupps',
        JSON.stringify([{ name: 'T1', status: 6 }]) // Status 6 = Nicht Einsatzbereit
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'trupps',
          newValue: localStorage.getItem('trupps'),
        })
      );
    });
    
    // 4) Warten bis das Storage-Event verarbeitet wurde
    await page.waitForFunction(
      (id) => {
        const patients = JSON.parse(localStorage.getItem('patients') || '[]');
        const p = patients.find(x => x.id === id);
        return p && (!p.team || p.team.length === 0);
      },
      { timeout: 5000 },
      patientId
    );
    
    const teamAfter = await page.evaluate(id => {
      const patients = JSON.parse(localStorage.getItem('patients') || '[]');
      const p = patients.find(x => x.id === id);
      return p ? p.team : null;
    }, patientId);
    
    expect(teamAfter).toEqual([]);
  });

  it('zeigt Patienten in der korrekten Tabellensektion basierend auf Status', async () => {
    // Patienten mit verschiedenen Status anlegen
    await page.evaluate(() => {
      const patients = [
        { id: 1, status: 'gemeldet', diagnosis: 'Test 1', history: [] },
        { id: 2, status: 'verlegt in UHS', diagnosis: 'Test 2', history: [] },
        { id: 3, status: 'Entlassen', diagnosis: 'Test 3', history: [] }
      ];
      localStorage.setItem('patients', JSON.stringify(patients));
    });

    // Seite neu laden um die Tabelle zu rendern
    await page.reload();
    await page.waitForSelector('#patients-table-body');

    // Warte bis Section-Headers geladen sind
    await page.waitForFunction(
      () => document.querySelectorAll('.section-header h3').length >= 3,
      { timeout: 3000 }
    );

    // Prüfe dass Section-Headers vorhanden sind
    const sectionHeaders = await page.$$eval('.section-header h3', els =>
      els.map(e => e.textContent)
    );
    
    expect(sectionHeaders).toContain('Aktive Patienten (1)');
    expect(sectionHeaders).toContain('In UHS (1)');
    expect(sectionHeaders).toContain('Entlassen/Transport (1)');
  });
});
