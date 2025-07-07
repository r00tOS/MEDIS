    // 1) Karte initialisieren
    const map = L.map('map').setView([51.1657, 10.4515], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap-Mitwirkende'
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
    document.body.appendChild(contextMenu);
    document.addEventListener('click',()=>{contextMenu.style.display='none';});

    const showMarkerDesc = () => document.getElementById('toggle-marker-desc')?.checked !== false;

    // Ersetze die markerHtml-Funktion wie folgt:
    function markerHtml(iconUrl, name) {
      return `<div style="display:flex;flex-direction:column;align-items:center;">
        <img src="${iconUrl}" style="width:60px;height:60px;">
        ${showMarkerDesc() ? `<span style="background:rgba(255,255,255,0.8);padding:4px 18px;border-radius:4px;font-size:15px;margin-top:4px;min-width:90px;text-align:center;display:inline-block;white-space:nowrap;">${name}</span>` : ""}
      </div>`;
    }

    // Marker-Rendering anpassen:
    placedMarkers.forEach((md, idx) => {
      const ic = L.divIcon({
        className: 'custom-marker',
        html: markerHtml(md.iconUrl, md.name),
        iconSize: [60, 75],
        iconAnchor: [30, 30]
      });
      const marker = L.marker([md.lat, md.lng], { icon: ic, draggable: true }).addTo(map);
      marker.on('dragend', e => { const { lat, lng } = e.target.getLatLng(); placedMarkers[idx].lat = lat; placedMarkers[idx].lng = lng; saveMarkersToLocalStorage(placedMarkers); });
      marker.on('contextmenu', e => {
        e.originalEvent.preventDefault();
        contextMenu.style.left = e.originalEvent.pageX + 'px';
        contextMenu.style.top = e.originalEvent.pageY + 'px';
        contextMenu.style.display = 'block';
        contextMenu.marker = marker; contextMenu.markerObj = md; contextMenu.markerIdx = idx;
      });
    });

    map.getContainer().addEventListener('dragover', function(e) {
      e.preventDefault();
    });
    map.getContainer().addEventListener('drop', function(e) {
      e.preventDefault();
      // Kartenpixel zu LatLng umrechnen
      const rect = map.getContainer().getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const latlng = map.containerPointToLatLng([x, y]);
      const icon = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!icon) return;
      const ic = L.divIcon({
        className: 'custom-marker',
        html: markerHtml(icon.url, icon.name),
        iconSize: [60, 75],
        iconAnchor: [30, 30]
      });
      const marker = L.marker([latlng.lat, latlng.lng], { icon: ic, draggable: true }).addTo(map);
      const obj = { lat: latlng.lat, lng: latlng.lng, iconUrl: icon.url, name: icon.name };
      placedMarkers.push(obj); saveMarkersToLocalStorage(placedMarkers);
      marker.on('dragend', evt => { const { lat, lng } = evt.target.getLatLng(); obj.lat = lat; obj.lng = lng; saveMarkersToLocalStorage(placedMarkers); });
      marker.on('contextmenu', evt => { evt.originalEvent.preventDefault(); contextMenu.style.left = evt.originalEvent.pageX + 'px'; contextMenu.style.top = evt.originalEvent.pageY + 'px'; contextMenu.style.display = 'block'; contextMenu.marker = marker; contextMenu.markerObj = obj; contextMenu.markerIdx = placedMarkers.length - 1; });
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
            layer.setIcon(L.divIcon({
              className: 'custom-marker',
              html: markerHtml(markerObj.iconUrl, markerObj.name),
              iconSize: [60, 75],
              iconAnchor: [30, 30]
            }));
          }
        }
      });
    });

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
        url: "../map/svg/Rettungswesen_Einheiten/Sanitätstrupp.svg"
      };
      e.dataTransfer.setData('application/json', JSON.stringify(icon));
      const img = new Image();
      img.src = icon.url;
      e.dataTransfer.setDragImage(img, 20, 20);
    });
    iconsContainer.appendChild(div);
  });
});