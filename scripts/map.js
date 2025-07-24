// 1) Karte initialisieren
    const map = L.map('map', {
      zoomDelta: 1,           // Standard ist 1, Buttons funktionieren nur damit korrekt
      zoomControl: false      // Erst deaktivieren, unten wieder hinzufügen
    }).setView([51.1657, 10.4515], 6);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    // Zoom/Position laden & speichern (unverändert)
    const savedZoom = localStorage.getItem('mapZoom');
    const savedCenter = localStorage.getItem('mapCenter');
    if (savedZoom && savedCenter) {
      const center = JSON.parse(savedCenter);
      map.setView(center, parseInt(savedZoom, 10));
    }
    setInterval(() => {
      const c = map.getCenter();
      localStorage.setItem('mapCenter', JSON.stringify([c.lat, c.lng]));
      localStorage.setItem('mapZoom', map.getZoom());
    }, 1000);

    let selectedMain = null, selectedSub = null, currentIcon = null;

    const mainCatContainer = document.getElementById('main-categories');
    const subCatContainer = document.getElementById('sub-categories');
    const iconsContainer = document.getElementById('icons');

    // Ersetze die Funktion renderMainCategories durch:
    function renderMainCategories() {
      const dropdown = document.getElementById('main-categories-dropdown');
      dropdown.innerHTML = '';
      Object.keys(symbolLibrary).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        dropdown.appendChild(opt);
      });
      // Auswahl setzen (falls vorhanden)
      if (selectedMain && Object.keys(symbolLibrary).includes(selectedMain)) {
        dropdown.value = selectedMain;
      } else {
        selectedMain = dropdown.value;
      }
      // Direkt Unterkategorien und Icons anzeigen
      renderSubCategories();
    }

    function renderSubCategories() {
      subCatContainer.innerHTML = '';
      if (!selectedMain) return;
      const subKeys = Object.keys(symbolLibrary[selectedMain]);
      // Wenn nur eine Unterkategorie vorhanden ist, direkt auswählen und Icons anzeigen
      if (subKeys.length === 1) {
        selectedSub = subKeys[0];
        renderIcons();
        // Unterkategorie trotzdem anzeigen (optional, für Übersicht)
        const btn = document.createElement('div');
        btn.classList.add('subcategory-item', 'selected');
        btn.textContent = selectedSub;
        subCatContainer.appendChild(btn);
        return;
      }
      // Sonst wie gehabt Buttons für alle Unterkategorien
      subKeys.forEach(sub => {
        const btn = document.createElement('div');
        btn.classList.add('subcategory-item');
        btn.textContent = sub;
        btn.addEventListener('click', () => {
          selectedSub = sub; currentIcon = null;
          document.querySelectorAll('.subcategory-item').forEach(el=>el.classList.remove('selected'));
          btn.classList.add('selected'); iconsContainer.innerHTML='';
          renderIcons();
        });
        subCatContainer.appendChild(btn);
      });
    }

    // 1. Symbole in der Bibliothek draggable machen:
    function renderIcons() {
      iconsContainer.innerHTML = '';
      if (!selectedMain || !selectedSub) return;
      symbolLibrary[selectedMain][selectedSub].forEach(icon => {
        const div = document.createElement('div');
        div.classList.add('icon-item');
        div.innerHTML = `<img src="${icon.url}" alt="${icon.name}"><div>${icon.name}</div>`;
        div.title = icon.name;
        div.setAttribute('draggable', 'true');
        div.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('application/json', JSON.stringify(icon));
          // Optional: Symbol als Drag-Image
          const img = new Image();
          img.src = icon.url;
          e.dataTransfer.setDragImage(img, 20, 20);
        });
        iconsContainer.appendChild(div);
      });
    }

    renderMainCategories();

    // Nach Definition von symbolLibrary und vor renderMainCategories():
const searchInput = document.getElementById('symbol-search');

searchInput.addEventListener('input', function() {
  const query = this.value.trim().toLowerCase();
  if (!query) {
    // Standardanzeige
    renderMainCategories();
    subCatContainer.innerHTML = '';
    iconsContainer.innerHTML = '';
    return;
  }
  // Ergebnisse sammeln
  const results = [];
  Object.entries(symbolLibrary).forEach(([cat, subs]) => {
    Object.entries(subs).forEach(([sub, icons]) => {
      icons.forEach(icon => {
        if (icon.name.toLowerCase().includes(query)) {
          results.push({ ...icon, category: cat, subcategory: sub });
        }
      });
    });
  });
  // Ergebnisse anzeigen
  subCatContainer.innerHTML = '';
  iconsContainer.innerHTML = '';
  if (results.length === 0) {
    iconsContainer.innerHTML = '<div style="color:#888;padding:1em;">Keine Treffer</div>';
    return;
  }
  // Auch im Suchmodus:
  results.forEach(icon => {
    const div = document.createElement('div');
    div.classList.add('icon-item');
    div.innerHTML = `<img src="${icon.url}" alt="${icon.name}"><div>${icon.name}<br><span style="font-size:0.75em;color:#888;">${icon.category} / ${icon.subcategory}</span></div>`;
    div.title = icon.name;
    div.setAttribute('draggable', 'true');
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify(icon));
      const img = new Image();
      img.src = icon.url;
      e.dataTransfer.setDragImage(img, 20, 20);
    });
    iconsContainer.appendChild(div);
  });
});

    // 3) Marker-Verwaltung bleibt unverändert
    function saveMarkersToLocalStorage(markers) { localStorage.setItem('mapMarkers', JSON.stringify(markers)); }
    function loadMarkersFromLocalStorage() { const d = localStorage.getItem('mapMarkers'); return d?JSON.parse(d):[]; }
    let placedMarkers = loadMarkersFromLocalStorage();
    const contextMenu = document.createElement('div');
    contextMenu.style.position='absolute'; contextMenu.style.display='none';
    contextMenu.style.background='#fff'; contextMenu.style.border='1px solid #ccc'; contextMenu.style.zIndex=10000;
    contextMenu.innerHTML=`<div id="rename-marker" style="padding:8px;cursor:pointer;">Name ändern</div>` +
                          `<div id="delete-marker" style="padding:8px;cursor:pointer;color:red;">Löschen</div>`;
    contextMenu.innerHTML += `<div id="toggle-desc-marker" style="padding:8px;cursor:pointer;">Beschreibung ein-/ausblenden</div>`;
    document.body.appendChild(contextMenu);
    document.addEventListener('click',()=>{contextMenu.style.display='none';});

    const showMarkerDesc = () => document.getElementById('toggle-marker-desc')?.checked !== false;

    // Ersetze die markerHtml-Funktion wie folgt:
    function markerHtml(iconUrl, name, descVisible = true) {
      return `<div style="display:flex;flex-direction:column;align-items:center;">
        <img src="${iconUrl}" style="width:100px;height:100px;margin-bottom:-2px;">
        ${descVisible ? `<span style="background:rgba(255,255,255,0.8);border-radius:4px;font-size:15px;min-width:90px;text-align:center;display:inline-block;white-space:nowrap;margin-top:0;">${name}</span>` : ""}
      </div>`;
    }

    // Marker-Rendering anpassen:
    map.eachLayer(layer => {
      if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'custom-marker') {
        map.removeLayer(layer);
      }
    });
    placedMarkers.forEach((md, idx) => {
      const iconWidth = 100, iconHeight = 100;
      const ic = L.divIcon({
        className: 'custom-marker',
        html: markerHtml(md.iconUrl, md.name, md.descVisible !== false),
        iconSize: [iconWidth, iconHeight],
        iconAnchor: getCenteredAnchor(iconWidth, iconHeight)
      });
      const marker = L.marker([md.lat, md.lng], { icon: ic, draggable: true }).addTo(map);
      marker.on('dragend', e => { const { lat, lng } = e.target.getLatLng(); placedMarkers[idx].lat = lat; placedMarkers[idx].lng = lng; saveMarkersToLocalStorage(placedMarkers); });
      marker.on('contextmenu', e => {
        e.originalEvent.preventDefault();
        contextMenu.style.left = e.originalEvent.pageX + 'px';
        contextMenu.style.top = e.originalEvent.pageY + 'px';
        contextMenu.style.display = 'block';
        contextMenu.marker = marker;
        contextMenu.markerObj = md; // oder obj beim Drop!
        contextMenu.markerIdx = idx !== undefined ? idx : placedMarkers.length - 1;

        // Nur für Personentypen anzeigen:
        if (isPersonMarkerByIcon(contextMenu.markerObj)) {
          changePersonTypeDiv.style.display = 'block';
        } else {
          changePersonTypeDiv.style.display = 'none';
        }
      });
    });

    map.getContainer().addEventListener('dragover', function(e) {
      e.preventDefault();
    });

    contextMenu.querySelector('#rename-marker').onclick = e => {
      e.stopPropagation();
      const newName = prompt('Neuer Name:', contextMenu.markerObj.name);
      if (newName && newName.trim()) {
        contextMenu.markerObj.name = newName;
        const newIc = L.divIcon({
          className: 'custom-marker',
          html: markerHtml(contextMenu.markerObj.iconUrl, newName),
          iconSize: [60, 75],
          iconAnchor: [30, 30]
        });
        contextMenu.marker.setIcon(newIc);
        saveMarkersToLocalStorage(placedMarkers);
      }
      contextMenu.style.display = 'none';
    };
    contextMenu.querySelector('#delete-marker').onclick = e => {
      e.stopPropagation(); if(confirm('Marker wirklich löschen?')){ map.removeLayer(contextMenu.marker); placedMarkers.splice(contextMenu.markerIdx,1); saveMarkersToLocalStorage(placedMarkers);} contextMenu.style.display='none'; };
    // Checkbox-Event: Marker-Beschreibung ein-/ausblenden
    document.getElementById('toggle-marker-desc').addEventListener('change', () => {
      // Alle Marker neu setzen
      map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'custom-marker') {
          const markerObj = placedMarkers.find(m =>
            Math.abs(m.lat - layer.getLatLng().lat) < 1e-8 &&
            Math.abs(m.lng - layer.getLatLng().lng) < 1e-8
          );
          if (markerObj) {
            // Nur anzeigen, wenn nicht individuell ausgeblendet
            const show = markerObj.descVisible !== false && document.getElementById('toggle-marker-desc').checked;
            layer.setIcon(L.divIcon({
              className: 'custom-marker',
              html: markerHtml(markerObj.iconUrl, markerObj.name, show),
              iconSize: [100, 100],
              iconAnchor: getCenteredAnchor(100, 100)
            }));
          }
        }
      });
    });

    // Kontextmenü-Option für Beschreibung ein-/ausblenden:
    contextMenu.querySelector('#toggle-desc-marker').onclick = e => {
      e.stopPropagation();
      const markerObj = contextMenu.markerObj;
      markerObj.descVisible = !markerObj.descVisible;
      // Die Checkbox steuert nur Marker ohne individuelle Einstellung
      const show = markerObj.descVisible !== false && document.getElementById('toggle-marker-desc').checked;
      contextMenu.marker.setIcon(L.divIcon({
        className: 'custom-marker',
        html: markerHtml(markerObj.iconUrl, markerObj.name, show),
        iconSize: [100, 100],
        iconAnchor: getCenteredAnchor(100, 100)
      }));
      saveMarkersToLocalStorage(placedMarkers);
      contextMenu.style.display = 'none';
    };

    // 4) "Alle Marker löschen" Button-Funktionalität:
document.getElementById('delete-all-markers').addEventListener('click', () => {
  if (!confirm('Wirklich alle Marker von der Karte löschen?')) return;
  // Alle Marker von der Karte entfernen
  map.eachLayer(layer => {
    if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'custom-marker') {
      map.removeLayer(layer);
    }
  });
  // Speicher leeren
  placedMarkers = [];
  saveMarkersToLocalStorage(placedMarkers);
});
document.getElementById('main-categories-dropdown').addEventListener('change', function() {
  selectedMain = this.value;
  // Unterkategorien bestimmen
  const subKeys = Object.keys(symbolLibrary[selectedMain]);
  if (subKeys.length === 1) {
    selectedSub = subKeys[0];
  } else {
    selectedSub = subKeys[0]; // <-- Automatisch erste Unterkategorie wählen
  }
  currentIcon = null;
  renderSubCategories();
  iconsContainer.innerHTML = '';
  renderIcons(); // <-- Icons direkt anzeigen
});

// Füge dies nach der Definition von iconsContainer, subCatContainer etc. ein:
document.getElementById('show-trupps').addEventListener('click', function() {
  // Trupps aus localStorage laden
  const trupps = JSON.parse(localStorage.getItem('trupps')) || [];
  const activeTrupps = trupps;
  subCatContainer.innerHTML = '';
  iconsContainer.innerHTML = '';
  if (activeTrupps.length === 0) {
    iconsContainer.innerHTML = '<div style="color:#888;padding:1em;">Keine aktiven Trupps gefunden</div>';
    return;
  }
  activeTrupps.forEach(trupp => {
    const div = document.createElement('div');
    div.classList.add('icon-item');
    div.innerHTML = `<img src="../map/svg/Rettungswesen_Einheiten/Sanitätstrupp.svg" alt="Sanitätstrupp"><div>${trupp.name}</div>`;
    div.title = trupp.name;
    div.setAttribute('draggable', 'true');
    div.addEventListener('dragstart', (e) => {
      // Das Drag-Objekt wie ein Symbol aufbauen
      const icon = {
        name: trupp.name,
        url: "../map/svg/Rettungswesen_Einheiten/Sanitätstrupp.svg",
        descVisible: true // Beschreibung AN für Trupps
      };
      e.dataTransfer.setData('application/json', JSON.stringify(icon));
      const img = new Image();
      img.src = icon.url;
      e.dataTransfer.setDragImage(img, 20, 20);
    });
    iconsContainer.appendChild(div);
  });
});

// Hilfsfunktion für zentrierten Anchor, abhängig von der Icon-Größe
function getCenteredAnchor(width = 100, height = 100) {
  return [width / 2, height / 2];
}

// Nur EIN Drop-Handler für Marker!
map.getContainer().addEventListener('drop', function(e) {
  e.preventDefault();
  const rect = map.getContainer().getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const latlng = map.containerPointToLatLng([x, y]);
  const icon = JSON.parse(e.dataTransfer.getData('application/json'));
  if (!icon) return;
  // Prüfe, ob descVisible gesetzt ist (Trupps), sonst false
  const descVisible = typeof icon.descVisible === "boolean" ? icon.descVisible : false;
  const iconWidthDrop = 60, iconHeightDrop = 75;
  const ic = L.divIcon({
    className: 'custom-marker',
    html: markerHtml(icon.url, icon.name, descVisible),
    iconSize: [iconWidthDrop, iconHeightDrop],
    iconAnchor: getCenteredAnchor(iconWidthDrop, iconHeightDrop)
  });
  const obj = { lat: latlng.lat, lng: latlng.lng, iconUrl: icon.url, name: icon.name, descVisible };
  placedMarkers.push(obj); saveMarkersToLocalStorage(placedMarkers);
  const marker = L.marker([latlng.lat, latlng.lng], { icon: ic, draggable: true }).addTo(map);
  marker.on('dragend', evt => { const { lat, lng } = evt.target.getLatLng(); obj.lat = lat; obj.lng = lng; saveMarkersToLocalStorage(placedMarkers); });
  marker.on('contextmenu', evt => { evt.originalEvent.preventDefault(); contextMenu.style.left = evt.originalEvent.pageX + 'px'; contextMenu.style.top = evt.originalEvent.pageY + 'px'; contextMenu.style.display = 'block'; contextMenu.marker = marker; contextMenu.markerObj = obj; contextMenu.markerIdx = placedMarkers.length - 1; });
});

// Definiere die Personengruppen und die zugehörigen Symbole
const personTypes = [
  { label: "Gerettete Person", icon: "../map/svg/Personen/Gerettete_Person.svg" },
  { label: "Person", icon: "../map/svg/Personen/Person.svg" },
  { label: "Tote Person", icon: "../map/svg/Personen/Tote_Person.svg" },
  { label: "Transportierte Person", icon: "../map/svg/Personen/Transportierte_Person.svg" },
  { label: "Verletzte Person", icon: "../map/svg/Personen/Verletzte_Person.svg" },
  { label: "Vermisste Person", icon: "../map/svg/Personen/Vermisste_Person.svg" },
  { label: "Verschüttete Person", icon: "../map/svg/Personen/Verschüttete_Person.svg" },
  { label: "Zu Transportierende Person", icon: "../map/svg/Personen/Zu_transportierende_Person.svg" }
];

// --- Menü für Personentyp-Änderung (Kontextmenü) ---
const personTypeMenu = document.createElement('div');
personTypeMenu.id = 'person-type-menu';
personTypeMenu.style.display = 'none';
personTypeMenu.style.position = 'absolute';
personTypeMenu.style.background = '#fff';
personTypeMenu.style.border = '1px solid #ccc';
personTypeMenu.style.zIndex = 10001;
personTypeMenu.style.left = '0';
personTypeMenu.style.top = '0';
personTypeMenu.innerHTML = personTypes.map(pt =>
  `<div class="person-type-option" data-icon="${pt.icon}" data-label="${pt.label}" style="padding:8px;cursor:pointer;display:flex;align-items:center;gap:8px;">
    <img src="${pt.icon}" style="width:24px;height:24px;">${pt.label}
  </div>`
).join('');
document.body.appendChild(personTypeMenu);

// --- Menü für Personentyp-Auswahl (Marker erstellen) ---
const personCreateMenu = document.createElement('div');
personCreateMenu.id = 'person-create-menu';
personCreateMenu.style.display = 'none';
personCreateMenu.style.position = 'absolute';
personCreateMenu.style.background = '#fff';
personCreateMenu.style.border = '1px solid #ccc';
personCreateMenu.style.zIndex = 10001;
personCreateMenu.style.left = '0';
personCreateMenu.style.top = '0';
personCreateMenu.innerHTML = personTypes.map(pt =>
  `<div class="person-create-option" data-icon="${pt.icon}" data-label="${pt.label}" style="padding:8px;cursor:pointer;display:flex;align-items:center;gap:8px;">
    <img src="${pt.icon}" style="width:24px;height:24px;">${pt.label}
  </div>`
).join('');
document.body.appendChild(personCreateMenu);

// Kontextmenü erweitern: Option zum Ändern des Personentyps
const changePersonTypeDiv = document.createElement('div');
changePersonTypeDiv.id = 'change-person-type';
changePersonTypeDiv.style.padding = '8px';
changePersonTypeDiv.style.cursor = 'pointer';
changePersonTypeDiv.textContent = 'Personen-Typ ändern';
contextMenu.appendChild(changePersonTypeDiv);

// Klick auf "Personen-Typ ändern" öffnet das Untermenü
changePersonTypeDiv.onclick = e => {
  e.stopPropagation();
  // Positioniere das Untermenü neben dem Kontextmenü
  personTypeMenu.style.left = contextMenu.style.left;
  personTypeMenu.style.top = (parseInt(contextMenu.style.top) + contextMenu.offsetHeight) + 'px';
  personTypeMenu.style.display = 'block';
};

// --- Kontextmenü: Handler EINMAL setzen ---
personTypeMenu.querySelectorAll('.person-type-option').forEach(opt => {
  opt.onclick = null;
  opt._contextTypeHandler = function contextTypeChange(e) {
    if (personTypeMenu.style.display === 'block' && contextMenu.style.display === 'block') {
      e.stopPropagation();
      const iconUrl = opt.getAttribute('data-icon');
      const label = opt.getAttribute('data-label');
      contextMenu.markerObj.iconUrl = iconUrl;
      contextMenu.markerObj.name = label;
      const showDesc = contextMenu.markerObj.descVisible !== false && document.getElementById('toggle-marker-desc').checked;
      contextMenu.marker.setIcon(L.divIcon({
        className: 'custom-marker',
        html: markerHtml(iconUrl, contextMenu.markerObj.name, showDesc),
        iconSize: [100, 100],
        iconAnchor: getCenteredAnchor(100, 100)
      }));
      saveMarkersToLocalStorage(placedMarkers);
      personTypeMenu.style.display = 'none';
      contextMenu.style.display = 'none';
    }
  };
  opt.addEventListener('click', opt._contextTypeHandler);
});

// --- Freie Fläche: Handler dynamisch und sauber setzen ---
function showPersonMenu(x, y, callback) {
  personCreateMenu.style.left = x + 'px';
  personCreateMenu.style.top = y + 'px';
  personCreateMenu.style.display = 'block';
  personCreateMenu.querySelectorAll('.person-create-option').forEach(opt => {
    if (opt._personCreateHandler) {
      opt.removeEventListener('click', opt._personCreateHandler);
      delete opt._personCreateHandler;
    }
    const handler = function(e) {
      e.stopPropagation();
      personCreateMenu.style.display = 'none';
      callback(opt.getAttribute('data-icon'), opt.getAttribute('data-label'));
      opt.removeEventListener('click', handler);
    };
    opt._personCreateHandler = handler;
    opt.addEventListener('click', handler);
  });
}

// --- Ergänzung: Kontextmenü für freie Fläche ---

// Menü für freie Fläche erstellen
const mapContextMenu = document.createElement('div');
mapContextMenu.id = 'map-context-menu';
mapContextMenu.style.position = 'absolute';
mapContextMenu.style.display = 'none';
mapContextMenu.style.background = '#fff';
mapContextMenu.style.border = '1px solid #ccc';
mapContextMenu.style.zIndex = 10001;
mapContextMenu.innerHTML = `
  <div id="create-person" style="padding:8px;cursor:pointer;">Person erstellen</div>
  <div id="create-gefahr" style="padding:8px;cursor:pointer;">Gefahr erstellen</div>
`;
document.body.appendChild(mapContextMenu);

// Untermenü für Gefahrentypen (wird wiederverwendet)
const gefahrTypes = Object.values(symbolLibrary["Gefahren"]["Gefahren"]);
const gefahrMenu = document.createElement('div');
gefahrMenu.id = 'gefahr-type-menu';
gefahrMenu.style.position = 'absolute';
gefahrMenu.style.display = 'none';
gefahrMenu.style.background = '#fff';
gefahrMenu.style.border = '1px solid #ccc';
gefahrMenu.style.zIndex = 10001;
// Scrollbar und feste Höhe für viele Einträge:
gefahrMenu.style.maxHeight = '350px';
gefahrMenu.style.overflowY = 'auto';
gefahrMenu.style.minWidth = '260px';
gefahrMenu.innerHTML = gefahrTypes.map(g =>
  `<div class="gefahr-type-option" data-icon="${g.url}" data-label="${g.name}" style="padding:8px;cursor:pointer;display:flex;align-items:center;gap:8px;">
    <img src="${g.url}" style="width:24px;height:24px;">${g.name}
  </div>`
).join('');
document.body.appendChild(gefahrMenu);

function showGefahrMenu(x, y, callback) {
  gefahrMenu.style.left = x + 'px';
  gefahrMenu.style.top = y + 'px';
  gefahrMenu.style.display = 'block';
  gefahrMenu.querySelectorAll('.gefahr-type-option').forEach(opt => {
    opt.onclick = e => {
      e.stopPropagation();
      gefahrMenu.style.display = 'none';
      callback(opt.getAttribute('data-icon'), opt.getAttribute('data-label'));
    };
  });
}

// Map-Rechtsklick-Handler (nur freie Fläche)
map.on('contextmenu', function(e) {
  // Prüfe, ob auf einen Marker geklickt wurde (dann kein Map-Menü)
  let onMarker = false;
  map.eachLayer(layer => {
    if (layer instanceof L.Marker && layer.getLatLng().distanceTo(e.latlng) < 0.0001) {
      onMarker = true;
    }
  });
  if (onMarker) return;

  mapContextMenu.style.left = e.originalEvent.pageX + 'px';
  mapContextMenu.style.top = e.originalEvent.pageY + 'px';
  mapContextMenu.style.display = 'block';
  // Speichere die Position für spätere Marker-Erstellung
  mapContextMenu._latlng = e.latlng;
});

// Person erstellen
mapContextMenu.querySelector('#create-person').onclick = function(e) {
  e.stopPropagation();
  mapContextMenu.style.display = 'none';
  showPersonMenu(parseInt(mapContextMenu.style.left), parseInt(mapContextMenu.style.top), (iconUrl, label) => {
    // Marker an gespeicherter Position erzeugen
    const latlng = mapContextMenu._latlng;
    const iconWidth = 100, iconHeight = 100;
    const ic = L.divIcon({
      className: 'custom-marker',
      html: markerHtml(iconUrl, label, false), // Beschreibung AUS
      iconSize: [iconWidth, iconHeight],
      iconAnchor: getCenteredAnchor(iconWidth, iconHeight)
    });
    const obj = { lat: latlng.lat, lng: latlng.lng, iconUrl: iconUrl, name: label, descVisible: false }; // Beschreibung AUS
    placedMarkers.push(obj); saveMarkersToLocalStorage(placedMarkers);
    const marker = L.marker([latlng.lat, latlng.lng], { icon: ic, draggable: true }).addTo(map);
    marker.on('dragend', evt => { const { lat, lng } = evt.target.getLatLng(); obj.lat = lat; obj.lng = lng; saveMarkersToLocalStorage(placedMarkers); });
    marker.on('contextmenu', evt => {
      evt.originalEvent.preventDefault();
      contextMenu.style.left = evt.originalEvent.pageX + 'px';
      contextMenu.style.top = evt.originalEvent.pageY + 'px';
      contextMenu.style.display = 'block';
      contextMenu.marker = marker;
      contextMenu.markerObj = obj;
      contextMenu.markerIdx = placedMarkers.length - 1;
      if (isPersonMarkerByIcon(obj)) {
        changePersonTypeDiv.style.display = 'block';
      } else {
        changePersonTypeDiv.style.display = 'none';
      }
    });
  });
};

// Gefahr erstellen
mapContextMenu.querySelector('#create-gefahr').onclick = function(e) {
  e.stopPropagation();
  mapContextMenu.style.display = 'none';
  showGefahrMenu(parseInt(mapContextMenu.style.left), parseInt(mapContextMenu.style.top), (iconUrl, label) => {
    const latlng = mapContextMenu._latlng;
    const iconWidth = 100, iconHeight = 100;
    const ic = L.divIcon({
      className: 'custom-marker',
      html: markerHtml(iconUrl, label, false), // Beschreibung AUS
      iconSize: [iconWidth, iconHeight],
      iconAnchor: getCenteredAnchor(iconWidth, iconHeight)
    });
    const obj = { lat: latlng.lat, lng: latlng.lng, iconUrl: iconUrl, name: label, descVisible: false }; // Beschreibung AUS
    placedMarkers.push(obj);
    saveMarkersToLocalStorage(placedMarkers);
    const marker = L.marker([latlng.lat, latlng.lng], { icon: ic, draggable: true }).addTo(map);
    marker.on('dragend', evt => {
      const { lat, lng } = evt.target.getLatLng();
      obj.lat = lat;
      obj.lng = lng;
      saveMarkersToLocalStorage(placedMarkers);
    });
    marker.on('contextmenu', evt => {
      evt.originalEvent.preventDefault();
      contextMenu.style.left = evt.originalEvent.pageX + 'px';
      contextMenu.style.top = evt.originalEvent.pageY + 'px';
      contextMenu.style.display = 'block';
      contextMenu.marker = marker;
      contextMenu.markerObj = obj;
      contextMenu.markerIdx = placedMarkers.length - 1;
      if (isPersonMarkerByIcon(obj)) {
        changePersonTypeDiv.style.display = 'block';
      } else {
        changePersonTypeDiv.style.display = 'none';
      }
    });
  });
};

// Schließe alle Menüs bei Klick außerhalb
document.addEventListener('click', (e) => {
  // Personentyp-Änderungsmenü schließen
  if (personTypeMenu.style.display === 'block' && !personTypeMenu.contains(e.target)) {
    personTypeMenu.style.display = 'none';
  }
  // Personen-Erstellmenü schließen
  if (personCreateMenu.style.display === 'block' && !personCreateMenu.contains(e.target)) {
    personCreateMenu.style.display = 'none';
  }
  // Gefahrentyp-Menü schließen
  if (gefahrMenu.style.display === 'block' && !gefahrMenu.contains(e.target)) {
    gefahrMenu.style.display = 'none';
  }
  // Kontextmenü für freie Fläche schließen
  if (mapContextMenu.style.display === 'block' && !mapContextMenu.contains(e.target)) {
    mapContextMenu.style.display = 'none';
  }
  // Kontextmenü für Marker schließen (optional, falls nicht schon oben)
  if (contextMenu.style.display === 'block' && !contextMenu.contains(e.target)) {
    contextMenu.style.display = 'none';
  }
});