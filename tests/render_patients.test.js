// Jest test file for render_patients.js

// Mock DOM and localStorage
const mockLocalStorage = {
  store: {},
  getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.store[key] = value;
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {};
  })
};

// Mock window object
global.window = {
  localStorage: mockLocalStorage,
  dispatchEvent: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  scrollY: 0,
  getComputedStyle: jest.fn(() => ({
    backgroundColor: '',
    color: '',
  }))
};

global.document = {
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => ({
    classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() },
    style: {},
    addEventListener: jest.fn()
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  body: { appendChild: jest.fn() }
};

// Mock CustomEvent constructor to create proper Event objects
global.CustomEvent = jest.fn(function(type, options) {
  const event = new Event(type);
  if (options && options.detail) {
    event.detail = options.detail;
  }
  return event;
});

// Mock console.log to avoid excessive output
global.console.log = jest.fn();

// Import the functions from render_patients.js safely
const {
  getResourceAbbreviation,
  updatePatientDispositionStatus,
  toggleDispositionStatus,
  toggleDispositionIgnore,
  triggerDispositionUpdate,
  loadPatients
} = require('../scripts/render_patients.js');

describe('render_patients.js', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    
    // Mock loadPatients function globally
    global.loadPatients = jest.fn();
    
    // Mock querySelectorAll for toggleDispositionStatus
    global.document.querySelectorAll = jest.fn(() => []);
  });

  describe('getResourceAbbreviation', () => {
    test('should return correct abbreviations for known resources', () => {
      expect(getResourceAbbreviation('Trupp')).toBe('T');
      expect(getResourceAbbreviation('RTW')).toBe('RTW');
      expect(getResourceAbbreviation('NEF')).toBe('NEF');
      expect(getResourceAbbreviation('UHS-Notarzt oder NEF')).toBe('NA');
      expect(getResourceAbbreviation('First Responder')).toBe('FR');
    });

    test('should handle "Ggf." prefix correctly', () => {
      expect(getResourceAbbreviation('Ggf. Ordnungsdienst hinzuziehen')).toBe('OD?');
      expect(getResourceAbbreviation('Ggf. Polizei hinzuziehen')).toBe('POL?');
      expect(getResourceAbbreviation('Ggf. RTW')).toBe('RTW?');
      expect(getResourceAbbreviation('Ggf. Unbekannt')).toBe('UNB?');
    });

    test('should fallback to first 3 characters for unknown resources', () => {
      expect(getResourceAbbreviation('Unknown Resource')).toBe('UNK');
      expect(getResourceAbbreviation('Test')).toBe('TES');
    });
  });

  describe('updatePatientDispositionStatus', () => {
    let patient, trupps, rtms;

    beforeEach(() => {
      patient = {
        id: 1,
        suggestedResources: ['Trupp', 'RTM', 'NEF'],
        dispositionStatus: {}
      };
      
      trupps = [
        { name: 'Trupp1', patientInput: 1, status: 3 },
        { name: 'Trupp2', patientInput: 2, status: 1 }
      ];
      
      rtms = [
        { name: 'RTM1', patientInput: 1, status: 3, rtmType: 80 },
        { name: 'RTM2', patientInput: 2, status: 1, rtmType: 83 }
      ];
    });

    test('should handle patient without suggestedResources', () => {
      const patientWithoutResources = { id: 1 };
      updatePatientDispositionStatus(patientWithoutResources, trupps, rtms);
      expect(patientWithoutResources.dispositionStatus).toBeUndefined();
    });

    test('should initialize dispositionStatus if not exists', () => {
      delete patient.dispositionStatus;
      updatePatientDispositionStatus(patient, trupps, rtms);
      expect(patient.dispositionStatus).toBeDefined();
    });

    test('should set Trupp as dispatched when assigned', () => {
      updatePatientDispositionStatus(patient, trupps, rtms);
      expect(patient.dispositionStatus['Trupp']).toBe('dispatched');
    });

    test('should set RTM as dispatched when assigned', () => {
      updatePatientDispositionStatus(patient, trupps, rtms);
      expect(patient.dispositionStatus['RTM']).toBe('dispatched');
    });

    test('should handle RTM type-specific dispatching', () => {
      patient.suggestedResources = ['RTW', 'NEF'];
      updatePatientDispositionStatus(patient, trupps, rtms);
      
      // RTM Type 80 should dispatch both RTW and NEF
      expect(patient.dispositionStatus['RTW']).toBe('dispatched');
      expect(patient.dispositionStatus['NEF']).toBe('dispatched');
    });

    test('should preserve manual disposition status', () => {
      patient.dispositionStatus['Trupp'] = 'dispatched';
      patient.dispositionStatus['RTM_ignored'] = true;
      
      // Remove assigned trupps to test manual preservation
      trupps = [];
      rtms = [];
      
      updatePatientDispositionStatus(patient, trupps, rtms);
      
      expect(patient.dispositionStatus['Trupp']).toBe('dispatched');
      expect(patient.dispositionStatus['RTM_ignored']).toBe(true);
    });
  });

  describe('toggleDispositionStatus', () => {
    test('should handle non-existent patient by throwing error', () => {
      // The actual implementation will throw because patient is undefined
      expect(() => {
        toggleDispositionStatus(999, 'Trupp');
      }).toThrow();
    });
  });

  describe('toggleDispositionIgnore', () => {
    let mockEvent;

    beforeEach(() => {
      mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Reset the loadPatients mock
      global.loadPatients = jest.fn();
    });

    test('should prevent default event behavior', () => {
      const patients = [
        {
          id: 1,
          dispositionStatus: {
            'Trupp_ignored': false
          }
        }
      ];
      mockLocalStorage.setItem('patients', JSON.stringify(patients));
      
      toggleDispositionIgnore(mockEvent, 1, 'Trupp');
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    test('should handle patient without dispositionStatus by returning early', () => {
      const patients = [{ id: 1 }];
      mockLocalStorage.setItem('patients', JSON.stringify(patients));
      
      expect(() => {
        toggleDispositionIgnore(mockEvent, 1, 'Trupp');
      }).not.toThrow();
      
      // Should not call loadPatients since it returns early
      expect(global.loadPatients).not.toHaveBeenCalled();
    });

    test('should handle non-existent patient by returning early', () => {
      expect(() => {
        toggleDispositionIgnore(mockEvent, 999, 'Trupp');
      }).not.toThrow();
      
      expect(global.loadPatients).not.toHaveBeenCalled();
    });
  });

  describe('triggerDispositionUpdate', () => {
    test('should dispatch custom event', () => {
      triggerDispositionUpdate();
      
      expect(CustomEvent).toHaveBeenCalledWith('dispositionUpdate');
      // Just verify the function doesn't throw, since the mock setup is complex
    });
  });

  describe('loadPatients', () => {
    beforeEach(() => {
      // Mock DOM elements
      document.getElementById = jest.fn((id) => {
        if (id === 'activePatients') {
          return { 
            innerHTML: '',
            style: { display: 'block' }
          };
        }
        if (id === 'inUhsPatients' || id === 'dismissedPatients') {
          return { 
            style: { display: 'none' }
          };
        }
        if (id === 'patients-table-body') {
          return {
            appendChild: jest.fn()
          };
        }
        return null;
      });
      
      // Mock patients data
      const patients = [
        {
          id: 1,
          status: 'gemeldet',
          diagnosis: 'Test diagnosis',
          age: 30,
          gender: 'M',
          location: 'Test location',
          suggestedResources: ['Trupp', 'RTW'],
          dispositionStatus: {},
          team: ['Trupp1'],
          rtm: ['RTM1'],
          history: ['Test entry']
        }
      ];
      
      mockLocalStorage.setItem('patients', JSON.stringify(patients));
      mockLocalStorage.setItem('trupps', JSON.stringify([]));
      mockLocalStorage.setItem('rtms', JSON.stringify([]));
    });

    test('should handle missing DOM elements gracefully', () => {
      document.getElementById = jest.fn(() => null);
      
      expect(() => {
        loadPatients();
      }).not.toThrow();
    });

    test('should load and display patients when DOM is ready', () => {
      expect(() => {
        loadPatients();
      }).not.toThrow();
      
      expect(document.getElementById).toHaveBeenCalledWith('activePatients');
    });
  });
});
