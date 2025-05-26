// tests/categories.test.js

const fs   = require('fs');
const vm   = require('vm');
const path = require('path');

let alarmConfig;

beforeAll(() => {
  // 1) Datei als String einlesen
  const filePath = path.resolve(__dirname, '../scripts/categories.js');
  const code     = fs.readFileSync(filePath, 'utf8');

  // 2) VM-Context mit leerem window aufsetzen
  const context = { window: {} };
  vm.createContext(context);

  // 3) Skript in den Context laden (füllt window.alarmConfig)
  vm.runInContext(code, context);

  // 4) alarmConfig aus window holen
  alarmConfig = context.window.alarmConfig;
});

describe('alarmConfig Grund-Checks', () => {
  test('alarmConfig existiert', () => {
    expect(alarmConfig).toBeDefined();
  });

  test('categories ist ein Array', () => {
    expect(Array.isArray(alarmConfig.categories)).toBe(true);
  });

  test('jede Kategorie hat einen name', () => {
    alarmConfig.categories.forEach(cat => {
      expect(cat).toHaveProperty('name');
    });
  });

test('jede Kategorie hat mindestens ein Keyword', () => {
  const emptyCats = alarmConfig.categories
    .filter(cat => cat.keywords.length === 0)
    .map(cat => cat.name);

  // emptyCats sollte leer sein
  expect(emptyCats).toHaveLength(0);
});


  test('jedes Keyword hat word und resources', () => {
    alarmConfig.categories.forEach(cat => {
      cat.keywords.forEach(kw => {
        expect(kw).toHaveProperty('word');
        expect(kw).toHaveProperty('resources');
      });
    });
  });

  test('resources ist Array und nicht leer', () => {
    alarmConfig.categories.forEach(cat => {
      cat.keywords.forEach(kw => {
        expect(Array.isArray(kw.resources)).toBe(true);
        expect(kw.resources.length).toBeGreaterThan(0);
      });
    });
  });
});
