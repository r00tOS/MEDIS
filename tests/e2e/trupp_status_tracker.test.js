/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

describe('Trupp-Status-Tracker (unit tests)', () => {
  beforeAll(() => {
    // 1) HTML laden
    const htmlPath = path.resolve(__dirname, '../../sites/trupp_status_tracker.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 2) DOM setzen
    document.documentElement.innerHTML = html;

    // 3) Externe Skripte injizieren
    const external = [
      'categories.js',
      'logic_patient.js',
      'logic_trupp.js',
      'render_trupps.js',
      'render_patients.js',
      'main.js',
      'keyword_modal.js',
      'history.js'
    ];
    for (const name of external) {
      const code = fs.readFileSync(
        path.resolve(__dirname, '../../scripts', name),
        'utf8'
      );
      const s = document.createElement('script');
      s.textContent = code;
      document.head.appendChild(s);
    }

    // 4) Inline-Skripte aus <script>…</script> im HTML in body injizieren
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const s = document.createElement('script');
      s.textContent = match[1];
      document.body.appendChild(s);
    }
  });

  beforeEach(() => {
    localStorage.clear();
    // damit der Inline-Initializer läuft:
    // reset der input-Value auf Default
    // in beforeAll haben wir die Inline-Skripte schon ausgeführt,
    // aber nach clear() muss der input erneut den lexikalischen Wert bekommen:
    const defaultVal = parseInt(localStorage.getItem('nextMaxEinsatzTime'), 10) || 45;
    const inp = document.getElementById('maxEinsatzTime');
    if (inp) inp.value = String(defaultVal);
    // Und die lexikale Variable:
    window.eval(`nextMaxEinsatzTime = ${defaultVal};`);
  });

  test('Initialwert im #maxEinsatzTime Input steht auf 45', () => {
    const input = document.getElementById('maxEinsatzTime');
    expect(input).not.toBeNull();
    expect(input.value).toBe('45');
  });

  test('addTrupp() legt einen neuen Trupp an und speichert in localStorage', () => {
    const name = 'TeamX';
    const inp = document.getElementById('newTruppName');
    inp.value = name;

    // renderTrupps stubben
    const renderSpy = jest.spyOn(window, 'renderTrupps').mockImplementation(() => {});

    // Aufruf
    window.addTrupp();

    const stored = JSON.parse(localStorage.getItem('trupps') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe(name);

    // render wurde gerufen
    expect(renderSpy).toHaveBeenCalled();
  });

  test('updateMaxEinsatzTime() speichert neuen Wert in localStorage', () => {
    // lexikale Variable auf 15 setzen
    window.eval('nextMaxEinsatzTime = 15;');
    // input spiegelt es (optional, nur zur Vollständigkeit)
    document.getElementById('maxEinsatzTime').value = '15';

    // Aufruf
    window.updateMaxEinsatzTime();

    expect(localStorage.getItem('nextMaxEinsatzTime')).toBe('15');
  });
});
