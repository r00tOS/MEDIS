// scripts/generateSymbols.js
const fs   = require('fs');
const path = require('path');

const svgRoot       = path.resolve(__dirname, '../map/svg');
const outFile       = path.resolve(__dirname, '../map/svg/symbolLibrary.js');
const symbolLibrary = {};

// 1) Ordnernamen als Buffer einlesen, dann als UTF-8-String decodieren
const dirents = fs.readdirSync(svgRoot, { withFileTypes: true, encoding: 'buffer' });

function addSvgsRecursively(baseCategory, subcatKey, folderPath, urlPrefix) {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true, encoding: 'buffer' });
  entries.forEach(entry => {
    const name = entry.name.toString('utf8');
    const fullPath = path.join(folderPath, name);
    if (entry.isDirectory()) {
      // Unterordner als weitere Subkategorie
      addSvgsRecursively(baseCategory, name, fullPath, urlPrefix + '/' + name);
    } else if (entry.isFile() && name.endsWith('.svg')) {
      if (!symbolLibrary[baseCategory]) symbolLibrary[baseCategory] = {};
      if (!symbolLibrary[baseCategory][subcatKey]) symbolLibrary[baseCategory][subcatKey] = [];
      symbolLibrary[baseCategory][subcatKey].push({
        name: path.basename(name, '.svg').replace(/_/g, ' '),
        url: `../map/svg/${urlPrefix}/${name}`
      });
    }
  });
}

dirents
  .filter(d => d.isDirectory())
  .forEach(dBuf => {
    const folder = dBuf.name.toString('utf8');
    const [category, subcategory] = folder.split('_');
    const subcatKey = subcategory || category;
    const folderPath = path.join(svgRoot, folder);
    addSvgsRecursively(category, subcatKey, folderPath, folder);
  });

// 3) Ergebnis in eine JS-Datei mit BOM schreiben, damit Editoren und Terminals
//    die Datei sicher als UTF-8 erkennen.
const output = 'const symbolLibrary = ' + JSON.stringify(symbolLibrary, null, 2) + ';\n';
fs.writeFileSync(outFile, '\uFEFF' + output, 'utf8');

console.log(`✅ Geschrieben: ${outFile}`);
