/**
 * @jest-environment jsdom
 */

const fs   = require('fs');
const path = require('path');

//
// 1) Kategorien-Definition laden (füllt window.alarmConfig)
//
const categoriesCode = fs.readFileSync(
  path.resolve(__dirname, '../scripts/categories.js'),
  'utf8'
);
eval(categoriesCode); // setzt window.alarmConfig

//
// 2) Deinen UI-Code laden (definiert onSearchInput, selectedCategory…)
//
const uiCode = fs.readFileSync(
  path.resolve(__dirname, '../scripts/keyword_modal.js'),
  'utf8'
);
eval(uiCode);

describe('onSearchInput', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="searchInput" />
      <div id="searchResults"></div>
      <div id="categoryList"></div>
      <div id="keywordList"></div>
      <div id="otherDetail"></div>
    `;
  });

  test('leer → verstecke Ergebnisse, zeige Liste', () => {
    document.getElementById('searchInput').value = '   ';
    onSearchInput();

    expect(document.getElementById('searchResults').style.display)
      .toBe('none');
    expect(document.getElementById('categoryList').style.display)
      .toBe('block');
    expect(document.getElementById('keywordList').style.display)
      .toBe('block');
  });

  test('Suchbegriff zeigt Treffer und blendet Listen aus', () => {
    // Beispiel: 'pneumonie' sollte mindestens einen Treffer in "Atmung" liefern
    document.getElementById('searchInput').value = 'pneumonie';
    onSearchInput();

    const results = document.getElementById('searchResults');
    expect(results.style.display).toBe('block');
    expect(document.getElementById('categoryList').style.display)
      .toBe('none');
    expect(document.getElementById('keywordList').style.display)
      .toBe('none');

    const items = results.querySelectorAll('.item');
    expect(items.length).toBeGreaterThan(0);
    // prüfe den Text des ersten Result-Divs
    expect(items[0].textContent).toMatch(/Atmung ➔ Pneumonie/i);
  });

  test('Click auf Ergebnis setzt Such-Input und toggelt otherDetail', () => {
    // Suchbegriff eingeben und Ergebnisliste aufbauen
    const term = 'verbrennung';
    document.getElementById('searchInput').value = term;
    onSearchInput();

    // Erstes Ergebnis anklicken
    const item = document.querySelector('#searchResults .item');
    item.click();

    // 1) Input-Wert sollte dem im Item angezeigten Keyword entsprechen:
    //    wir splitten auf "➔ " und nehmen den rechten Teil
    const expectedWord = item.textContent.split('➔ ')[1];
    expect(document.getElementById('searchInput').value)
      .toBe(expectedWord);

    // 2) otherDetail nur sichtbar, wenn das Wort mit "sonstiger" beginnt:
    const shouldShow = /^sonstiger/i.test(expectedWord);
    expect(document.getElementById('otherDetail').style.display)
      .toBe(shouldShow ? 'block' : 'none');
  });
});
