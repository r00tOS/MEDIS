// scripts/generateSymbols.js
const fs   = require('fs');
const path = require('path');

const svgRoot       = path.resolve(__dirname, '../map/svg');
const outFile       = path.resolve(__dirname, '../map/svg/symbolLibrary.js');
const symbolLibrary = {};

// 1) Ordnernamen als Buffer einlesen, dann als UTF-8-String decodieren
const dirents = fs.readdirSync(svgRoot, { withFileTypes: true, encoding: 'buffer' });

dirents
  .filter(d => d.isDirectory())
  .forEach(dBuf => {
    const folder = dBuf.name.toString('utf8');             // z. B. "Führungsstelle"
    const [category, subcategory] = folder.split('_');
    const subcatKey = subcategory || category;

    if (!symbolLibrary[category]) symbolLibrary[category] = {};
    if (!symbolLibrary[category][subcatKey]) symbolLibrary[category][subcatKey] = [];

    const folderPath = path.join(svgRoot, folder);
    // 2) Dateien im Ordner ebenfalls als Buffer + UTF-8
    const files = fs.readdirSync(folderPath, { encoding: 'buffer' })
      .map(fBuf => fBuf.toString('utf8'))
      .filter(f => f.endsWith('.svg'));

    files.forEach(file => {
      const name = path.basename(file, '.svg').replace(/_/g, ' ');
      symbolLibrary[category][subcatKey].push({
        name,
        url: `../map/svg/${folder}/${file}`
      });
    });
  });

// 3) Ergebnis in eine JS-Datei mit BOM schreiben, damit Editoren und Terminals
//    die Datei sicher als UTF-8 erkennen.
const output = 'const symbolLibrary = ' + JSON.stringify(symbolLibrary, null, 2) + ';\n';
fs.writeFileSync(outFile, '\uFEFF' + output, 'utf8');

console.log(`✅ Geschrieben: ${outFile}`);
