window.alarmConfig = {
  categories: [
    {
      name: "Kreislauf",
      keywords: [
        { word: "Kreislauferkrankung, allgemein", resources: ["Trupp"] },
        { word: "Exsikkose", resources: ["Trupp"] },
        { word: "Kreislaufprobleme", resources: ["Trupp"] },
        { word: "Hypertensive Entgleisung", resources: ["RTW", "Trupp"] },
        { word: "Hypotone Entgleisung", resources: ["RTW", "Trupp"] },
        { word: "Kardiale Notfälle, allgemein", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Akuter Thoraxschmerz", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Akutes Koronarsyndrom", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Herzinsuffizienz", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Herzrhythmusstörung, allgemein", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Herzrhythmusstörung, Bradykardie", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Herzrhythmusstörung, Tachykardie", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Reanimation", resources: ["Trupp", "RTW", "NEF", "Info an ASL"] },
        { word: "Allergische Reaktion, allgemein", resources: ["Trupp"] },
        { word: "Allergische Reaktion, Insektengifte", resources: ["RTW", "Trupp"] },
        { word: "Allergische Reaktion, Lebensmittel", resources: ["RTW", "Trupp"] },
        { word: "Allergische Reaktion, Medikamente", resources: ["RTW", "Trupp"] },
        { word: "Anaphylaktischer Schock", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Thermische Notfälle, allgemein", resources: ["Trupp"] },
        { word: "Erfrierung", resources: ["Trupp"] },
        { word: "Sonnenstich", resources: ["Trupp"] },
        { word: "Unterkühlung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Verbrennung", resources: ["RTW", "Trupp"] },
        { word: "Verbrühung", resources: ["RTW", "Trupp"] },
        { word: "sonstiger kardiologischer Notfall", resources: ["RTW", "NEF", "Trupp"] }
      ]
    },
    {
      name: "Atmung",
      keywords: [
        { word: "Atemnot, allgemein", resources: ["Trupp"] },
        { word: "Aspiration / Bolusgeschehen", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Asthma bronchiale", resources: ["Trupp"] },
        { word: "Atemnot, akut", resources: ["RTW", "NEF", "Trupp"] },
        { word: "COPD", resources: ["RTW", "Trupp"] },
        { word: "Ertrinken", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Hyperventilation", resources: ["Trupp"] },
        { word: "Lungenembolie", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Lungenödem", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Pneumonie", resources: ["RTW", "Trupp"] },
        { word: "Pneumothorax / Spannungspneumothorax", resources: ["RTW", "NEF", "Trupp"] },
        { word: "sonstiger respiratorischer Notfall", resources: ["RTW", "NEF", "Trupp"] }
      ]
    },
    {
      name: "Neurologie / Bewusstsein",
      keywords: [
        { word: "Bewusstseinsstörung, allgemein", resources: ["Trupp"] },
        { word: "Apoplex / TIA / PRIND", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Hyperglykämie", resources: ["Trupp"] },
        { word: "Hypoglykämie", resources: ["Trupp"] },
        { word: "Krampfanfall", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Person bedingt ansprechbar", resources: ["Trupp"] },
        { word: "Unklare Bewusstlosigkeit", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Kollabierte Person, ansprechbar", resources: ["Trupp"] },
        { word: "Kollabierte Person, nicht ansprechbar", resources: ["RTW", "NEF", "Trupp"] },
        { word: "sonstiger neurologischer Notfall", resources: ["RTW", "NEF", "Trupp"] }
      ]
    },
    {
      name: "Abdomen",
      keywords: [
        { word: "Abdomen, akut", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Abdomen, unklar", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Blinddarmentzündung", resources: ["RTW", "Trupp"] },
        { word: "Harnverhalt", resources: ["RTW", "Trupp"] },
        { word: "Ileus nft", resources: ["RTW", "Trupp"] },
        { word: "Magenblutung / Darmblutung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Nierenkolik / Gallenkolik", resources: ["Trupp"] },
        { word: "sonstiger abdomineller Notfall", resources: ["RTW", "Trupp"] }
      ]
    },
    {
      name: "Allgemeine Erkrankungen",
      keywords: [
        { word: "Erkrankung allgemein", resources: ["Trupp"] },
        { word: "Abusus C2H5OH", resources: ["Trupp"] },
        { word: "Thrombose / Gefäßverschluss", resources: ["RTW", "Trupp"] },
        { word: "Bandscheibenprolaps / Lumbago", resources: ["Trupp"] },
        { word: "Infekt – fieberhaft", resources: ["Trupp"] },
        { word: "Hilflose Person", resources: ["RTW", "Trupp"] },
        { word: "HNO", resources: ["Trupp"] },
        { word: "Nasenbluten, unstillbar", resources: ["RTW", "Trupp"] },
        { word: "Psychischer Ausnahmezustand", resources: ["Trupp"] },
        { word: "Schlechter AZ", resources: ["Trupp"] },
        { word: "Schmerzzustand", resources: ["Trupp"] },
        { word: "Tumorleiden", resources: ["Trupp"] },
        { word: "sonstiger Notfall", resources: ["Trupp"] }
      ]
    },
    {
      name: "Intoxikation",
      keywords: [
        { word: "Intoxikation, allgemein", resources: ["Trupp"] },
        { word: "Intoxikation, Alkohol", resources: ["Trupp"] },
        { word: "Intoxikation, Atemgifte / Rauchgase", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Intoxikation, Drogen / Rauschgifte", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Intoxikation, Medikamente", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Intoxikation, Mischintoxikation", resources: ["RTW", "NEF", "Trupp"] }
      ]
    },
    {
      name: "Suizid",
      keywords: [
        { word: "Suizid, allgemein", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Suizid, Androhung", resources: ["RTW", "Trupp"] }
      ]
    },
    {
      name: "Trauma",
      keywords: [
        { word: "Trauma, allgemein", resources: ["Trupp"] },
        { word: "Trauma, schwer", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Abdominaltrauma", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Extremitätentrauma", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Gesichtsschädeltrauma", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Inhalationstrauma", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Polytrauma", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Schädel-Hirn-Trauma", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Thoraxtrauma", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Wirbelsäulentrauma", resources: ["RTW", "NEF", "Trupp"] },
        { word: "sonstiger traumatologischer Notfall", resources: ["RTW", "NEF", "Trupp"] }
      ]
    },
    {
      name: "Extremitäten",
      keywords: [
        { word: "Amputationsverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Armverletzung", resources: ["Trupp"] },
        { word: "Augenverletzung", resources: ["Trupp"] },
        { word: "Beckenverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Beinverletzung", resources: ["Trupp"] },
        { word: "Blutung, leicht", resources: ["Trupp"] },
        { word: "Blutung, stark", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Fußverletzung", resources: ["Trupp"] },
        { word: "Gesichtsverletzung", resources: ["Trupp"] },
        { word: "Handverletzung", resources: ["Trupp"] },
        { word: "Kopfverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Knieverletzung", resources: ["Trupp"] },
        { word: "Oberarmverletzung", resources: ["Trupp"] },
        { word: "Oberschenkelhalsverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Oberschenkelverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Pfählungsverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Rippenverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Schnittverletzung", resources: ["Trupp"] },
        { word: "Schussverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Sprunggelenksverletzung", resources: ["Trupp"] },
        { word: "Stichverletzung", resources: ["Trupp"] },
        { word: "Teilamputationsverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Tierbissverletzung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Unterarmverletzung", resources: ["Trupp"] },
        { word: "Unterschenkelverletzung", resources: ["Trupp"] },
        { word: "Verätzung Säuren / Laugen", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Volumenmangelschock", resources: ["RTW", "NEF", "Trupp"] }
      ]
    },
    {
      name: "Pädiatrie / Gynäkologie",
      keywords: [
        { word: "Pädiatrischer Notfall, allgemein", resources: ["Trupp"] },
        { word: "Epiglottitis / Pseudokrupp", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Fieberkrampf", resources: ["Trupp"] },
        { word: "Urologischer Notfall, allgemein", resources: ["Trupp"] },
        { word: "Gynäkologischer Notfall, allgemein", resources: ["Trupp"] },
        { word: "Entbindung, Kliniktransport", resources: ["RTW", "Trupp"] },
        { word: "Frühgeburt", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Geburt, einsetzend", resources: ["RTW", "Trupp"] },
        { word: "Vaginale Blutung", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Fruchtwasserabgang", resources: ["RTW", "Trupp"] },
        { word: "sonstiger pädiatrischer Notfall", resources: ["Trupp"] },
        { word: "sonstiger gynäkologischer Notfall", resources: ["Trupp"] }
      ]
    },
    {
      name: "Unfälle",
      keywords: [
        { word: "Badeunfall", resources: ["RTW", "Trupp"] },
        { word: "Betriebs-/Arbeitsunfall", resources: ["RTW", "Trupp"] },
        { word: "Hausunfall", resources: ["Trupp"] },
        { word: "Inlineskaterunfall / Skaterunfall", resources: ["Trupp"] },
        { word: "Körperverletzung", resources: ["Trupp"] },
        { word: "Reitunfall", resources: ["RTW", "Trupp"] },
        { word: "Schulunfall", resources: ["Trupp"] },
        { word: "Sportunfall", resources: ["Trupp"] },
        { word: "Stromunfall Niederspannung <1000V", resources: ["RTW", "Trupp"] },
        { word: "Stromunfall Hochspannung >1000V", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Sturz aus Höhe < 3 Meter", resources: ["Trupp"] },
        { word: "Sturz aus Höhe > 3 Meter", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Tauchunfall", resources: ["RTW", "NEF", "Trupp"] },
        { word: "Treppensturz", resources: ["Trupp"] },
        { word: "Verkehrsunfall, allgemein", resources: ["RTW", "NEF", "Trupp"] }
      ]
    }
  ]
};
