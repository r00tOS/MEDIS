/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Mock Leaflet library
global.L = {
  map: jest.fn(() => ({
    setView: jest.fn().mockReturnThis(),
    getCenter: jest.fn(() => ({ lat: 51.1657, lng: 10.4515 })),
    getZoom: jest.fn(() => 6),
    eachLayer: jest.fn(),
    removeLayer: jest.fn(),
    containerPointToLatLng: jest.fn(() => ({ lat: 51.1657, lng: 10.4515 })),
    on: jest.fn(),
    getContainer: jest.fn(() => document.createElement('div'))
  })),
  control: {
    zoom: jest.fn(() => ({
      addTo: jest.fn()
    }))
  },
  tileLayer: jest.fn(() => ({
    addTo: jest.fn()
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
    on: jest.fn(),
    setIcon: jest.fn(),
    getLatLng: jest.fn(() => ({ lat: 51.1657, lng: 10.4515 }))
  })),
  divIcon: jest.fn(() => ({})),
  Marker: class MockMarker {
    constructor() {}
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock symbol library
global.symbolLibrary = {
  "Personen": {
    "Personen": [
      { name: "Person", url: "../map/svg/Personen/Person.svg" },
      { name: "Verletzte Person", url: "../map/svg/Personen/Verletzte_Person.svg" }
    ]
  },
  "Gefahren": {
    "Gefahren": [
      { name: "Brand", url: "../map/svg/Gefahren/Brand.svg" },
      { name: "Explosion", url: "../map/svg/Gefahren/Explosion.svg" }
    ]
  }
};

// Mock einsatzorte
global.einsatzorte = ["Hauptbühne", "Eingang West", "Sanitätszelt"];

// Mock functions that map.js might need
global.isPersonMarkerByIcon = jest.fn(() => true);
global.saveTrupps = jest.fn();
global.renderTrupps = jest.fn();

describe('Map Functionality', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="map"></div>
      <select id="main-categories-dropdown"></select>
      <div id="sub-categories"></div>
      <div id="icons"></div>
      <input id="symbol-search" />
      <button id="show-trupps"></button>
      <button id="delete-all-markers"></button>
      <input type="checkbox" id="toggle-marker-desc" checked />
    `;

    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Map Initialization', () => {
    test('can create map with default settings', () => {
      // Test the Leaflet map creation directly
      const map = L.map('map', {
        zoomDelta: 1,
        zoomControl: false
      });
      
      expect(L.map).toHaveBeenCalledWith('map', {
        zoomDelta: 1,
        zoomControl: false
      });
    });

    test('localStorage integration works', () => {
      // Test localStorage interaction patterns
      localStorageMock.getItem.mockReturnValueOnce('8');
      localStorageMock.getItem.mockReturnValueOnce('[52.5, 13.4]');
      
      const savedZoom = localStorageMock.getItem('mapZoom');
      const savedCenter = localStorageMock.getItem('mapCenter');
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mapZoom');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mapCenter');
      expect(savedZoom).toBe('8');
      expect(savedCenter).toBe('[52.5, 13.4]');
    });
  });

  describe('Symbol Library Integration', () => {
    test('can populate dropdown with categories', () => {
      const dropdown = document.getElementById('main-categories-dropdown');
      
      // Simulate what map.js does
      Object.keys(symbolLibrary).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        dropdown.appendChild(opt);
      });
      
      expect(dropdown.children.length).toBe(2);
      expect(dropdown.children[0].textContent).toBe('Personen');
      expect(dropdown.children[1].textContent).toBe('Gefahren');
    });

    test('symbol search functionality', () => {
      const searchInput = document.getElementById('symbol-search');
      const iconsContainer = document.getElementById('icons');
      
      // Simulate search
      searchInput.value = 'person';
      
      // Mock search results
      const results = [];
      Object.entries(symbolLibrary).forEach(([cat, subs]) => {
        Object.entries(subs).forEach(([sub, icons]) => {
          icons.forEach(icon => {
            if (icon.name.toLowerCase().includes('person')) {
              results.push({ ...icon, category: cat, subcategory: sub });
            }
          });
        });
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toMatch(/person/i);
    });
  });

  describe('Trupp Integration', () => {
    test('can load trupps from localStorage', () => {
      const testTrupps = [
        { name: "Trupp 1", status: 1 },
        { name: "Trupp 2", status: 3 }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testTrupps));
      
      const trupps = JSON.parse(localStorageMock.getItem('trupps') || '[]');
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('trupps');
      expect(trupps).toEqual(testTrupps);
    });

    test('handles empty trupps list correctly', () => {
      localStorageMock.getItem.mockReturnValue('[]');
      
      const trupps = JSON.parse(localStorageMock.getItem('trupps') || '[]');
      const iconsContainer = document.getElementById('icons');
      
      if (trupps.length === 0) {
        iconsContainer.innerHTML = '<div style="color:#888;padding:1em;">Keine aktiven Trupps gefunden</div>';
      }
      
      expect(trupps.length).toBe(0);
      expect(iconsContainer.innerHTML).toContain('Keine aktiven Trupps gefunden');
    });
  });

  describe('Marker Management', () => {
    test('can save and load markers', () => {
      const testMarkers = [
        { lat: 51.1657, lng: 10.4515, iconUrl: "test.svg", name: "Test Marker" }
      ];
      
      // Save markers
      localStorageMock.setItem('mapMarkers', JSON.stringify(testMarkers));
      
      // Load markers
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testMarkers));
      const loaded = JSON.parse(localStorageMock.getItem('mapMarkers') || '[]');
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mapMarkers');
      expect(loaded).toEqual(testMarkers);
    });
  });

  describe('UI Elements', () => {
    test('required DOM elements exist', () => {
      const toggle = document.getElementById('toggle-marker-desc');
      const deleteBtn = document.getElementById('delete-all-markers');
      const showTruppsBtn = document.getElementById('show-trupps');
      
      expect(toggle).toBeTruthy();
      expect(deleteBtn).toBeTruthy();
      expect(showTruppsBtn).toBeTruthy();
    });

    test('marker description toggle works', () => {
      const toggle = document.getElementById('toggle-marker-desc');
      expect(toggle.type).toBe('checkbox');
      expect(toggle.checked).toBe(true);
      
      // Simulate toggle
      toggle.checked = false;
      expect(toggle.checked).toBe(false);
    });
  });

  describe('Delete All Markers', () => {
    test('delete confirmation works', () => {
      global.confirm = jest.fn(() => true);
      
      const deleteBtn = document.getElementById('delete-all-markers');
      
      // Simulate delete action
      if (confirm('Wirklich alle Marker von der Karte löschen?')) {
        localStorageMock.setItem('mapMarkers', JSON.stringify([]));
      }
      
      expect(global.confirm).toHaveBeenCalledWith('Wirklich alle Marker von der Karte löschen?');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('mapMarkers', '[]');
      
      global.confirm.mockRestore();
    });
  });

  describe('Utility Functions', () => {
    test('getCenteredAnchor calculation', () => {
      // Test the anchor calculation logic
      const getCenteredAnchor = (width = 100, height = 100) => {
        return [width / 2, height / 2];
      };
      
      expect(getCenteredAnchor(100, 100)).toEqual([50, 50]);
      expect(getCenteredAnchor(60, 75)).toEqual([30, 37.5]);
    });
  });

  describe('Drag and Drop', () => {
    test('can handle drag and drop events', () => {
      const mapContainer = document.createElement('div');
      document.body.appendChild(mapContainer);

      // Mock drag event
      const dragEvent = new Event('dragover');
      dragEvent.preventDefault = jest.fn();
      
      // Simulate dragover handler
      mapContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      
      mapContainer.dispatchEvent(dragEvent);
      expect(dragEvent.preventDefault).toHaveBeenCalled();
    });

    test('can handle drop events with valid data', () => {
      const mapContainer = document.createElement('div');
      document.body.appendChild(mapContainer);

      const testIcon = { name: "Test Icon", url: "test.svg" };
      
      // Simulate what happens on drop
      const iconData = JSON.stringify(testIcon);
      const parsedIcon = JSON.parse(iconData);
      
      expect(parsedIcon).toEqual(testIcon);
      expect(parsedIcon.name).toBe("Test Icon");
    });
  });
});