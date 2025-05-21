function onSearchInput() {
  const term = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const resultsDiv = document.getElementById("searchResults");

  if (term === "") {
    // Leeres Suchfeld → zurück zu normalem Modus
    resultsDiv.style.display = "none";
    document.getElementById("categoryList").style.display = "block";
    document.getElementById("keywordList").style.display = "block";
    return;
  }

  // Suche in allen Kategorien→Keywords
  const hits = [];
  alarmConfig.forEach((cat, ci) => {
    cat.keywords.forEach((kw, ki) => {
      if (kw.word.toLowerCase().includes(term)) {
        hits.push({ ci, ki, word: kw.word });
      }
    });
  });

  // Ergebnis-Liste aufbauen
  resultsDiv.innerHTML = "";
  hits.forEach((hit) => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = `${alarmConfig[hit.ci].name} ➔ ${hit.word}`;
    div.onclick = () => {
      // Treffer auswählen und Modal zurücksetzen
      selectedCategory = hit.ci;
      selectedKeyword = hit.ki;
      document.getElementById("searchInput").value = hit.word;
      document.getElementById("otherDetail").style.display = /^sonstiger/i.test(
        hit.word
      )
        ? "block"
        : "none";
    };
    resultsDiv.appendChild(div);
  });

  // UI-Umschaltung
  resultsDiv.style.display = "block";
  document.getElementById("categoryList").style.display = "none";
  document.getElementById("keywordList").style.display = "none";
}

function openKeywordModal(patientId) {
  currentPatientId = patientId;
  selectedCategory = null;
  selectedKeyword = null;
  document.getElementById("searchInput").value = "";
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("categoryList").style.display = "block";
  document.getElementById("keywordList").style.display = "block";
  renderCategoryList();
  document.getElementById("keywordList").innerHTML = "";
  document.getElementById("keywordModal").style.display = "flex";
}

function renderCategoryList() {
  const catDiv = document.getElementById("categoryList");
  catDiv.innerHTML = "";
  alarmConfig.forEach((c, i) => {
    const d = document.createElement("div");
    d.textContent = c.name;
    d.className = "item" + (selectedCategory === i ? " selected" : "");
    d.onclick = () => {
      selectedCategory = i;
      selectedKeyword = null;
      renderCategoryList();
      renderKeywordList();
    };
    catDiv.appendChild(d);
  });
}

function renderKeywordList() {
  const kwDiv = document.getElementById("keywordList");
  kwDiv.innerHTML = "";
  document.getElementById("otherDetail").style.display = "none"; // immer verstecken
  if (selectedCategory === null) return;

  alarmConfig[selectedCategory].keywords.forEach((kw, j) => {
    const d = document.createElement("div");
    d.textContent = kw.word;
    d.className = "item" + (selectedKeyword === j ? " selected" : "");
    d.onclick = () => {
      selectedKeyword = j;
      renderKeywordList();
      // Wenn das Wort mit "sonstiger" (case-insensitive) anfängt → Feld einblenden
      if (/^sonstiger/i.test(kw.word)) {
        document.getElementById("otherDetail").style.display = "block";
        document.getElementById("otherInput").value = "";
      } else {
        document.getElementById("otherDetail").style.display = "none";
      }
    };
    kwDiv.appendChild(d);
  });
}

function confirmKeyword() {
  if (selectedCategory === null || selectedKeyword === null) {
    return alert("Bitte Kategorie und Stichwort wählen");
  }
  let cfg = alarmConfig[selectedCategory].keywords[selectedKeyword];
  let finalWord = cfg.word;

  // Wenn Zusatz-Feld sichtbar, hänge den Input an
  if (document.getElementById("otherDetail").style.display === "block") {
    const extra = document.getElementById("otherInput").value.trim();
    if (!extra) {
      return alert("Bitte die Art des Notfalls genauer beschreiben.");
    }
    finalWord += " – " + extra;
  }

  // 1) Diagnosis-Feld setzen
  updatePatientData(currentPatientId, "diagnosis", finalWord);

  // 2) vorgeschlagene Ressourcen speichern
  const patients = JSON.parse(localStorage.getItem("patients")) || [];
  const p = patients.find((x) => x.id === currentPatientId);
  p.suggestedResources = cfg.resources;
  localStorage.setItem("patients", JSON.stringify(patients));

  closeKeywordModal();
  loadPatients(currentPatientId);
}

function closeKeywordModal() {
  document.getElementById("keywordModal").style.display = "none";
}
