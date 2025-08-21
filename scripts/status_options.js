window.statusOptions = [
  { status: 0, text: 'Einsatz beendet', color:'#fdfefe'},
  { status: 1, text: 'Einsatzbereit auf Funk', color:'#85c1e9' },
  { status: 11, text: 'Einsatzbereit auf Streife', color:'#85c1e9' },
  { status: 12, text: 'Einsatzbereit in Sonderfunktion (Nicht alarmierbar)', color:'#85c1e9' },
  { status: 2, text: 'Einsatzbereit in UHS', color:'#28b463' },
  { status: 3, text: 'Einsatz übernommen', color:'#f4d03f' },
  { status: 4, text: 'Am Einsatzort', color:'#d35400' },
  { status: 6, text: 'Nicht einsatzbereit', color:'#839192' },
  { status: 61, text: 'Einsatzbereit in Rückhaltung', color:'#abb2b9' },
  { status: 7, text: 'Transport in UHS', color:'#d7bde2' },
  { status: 8, text: 'Transportziel erreicht', color:'#884ea0' },
];

// Status transition rules
window.getAvailableStatusTransitions = function(currentStatus) {
  const transitions = {
    0: [1, 11, 12, 2, 3, 6, 61],
    1: [11, 12, 2, 3, 6, 61],
    11: [1, 12, 2, 3, 6, 61],
    12: [1, 11, 2, 3, 6, 61],
    2: [1, 11, 12, 3, 6, 61],
    3: [4, 8],
    4: [7],
    6: [1, 11, 12, 2, 3, 61],
    61: [1, 11, 12, 2, 3, 6],
    7: [8],
    8: [] // No transitions allowed from status 8
  };
  
  const allowedStatuses = transitions[currentStatus] || [];
  return window.statusOptions.filter(option => allowedStatuses.includes(option.status));
};
