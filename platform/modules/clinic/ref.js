// Clinical reference data for Teknons Santé: ICD-10 codes used in Cameroon
// (with the diseases under weekly surveillance by MINSANTE), the essential
// drug list with their pharmacological classes, drug interactions and allergy
// rules, laboratory panels with reference ranges, the NEWS2 early warning
// score, and the default departments, tariffs and wards of a new clinic.

// [code, fr, en, surveillance] surveillance: 'immediate' (notify within 24 h), 'weekly', or ''
export const ICD10 = [
  ['B54', 'Paludisme, sans précision', 'Malaria, unspecified', 'weekly'],
  ['B50.9', 'Paludisme à P. falciparum (simple)', 'P. falciparum malaria (uncomplicated)', 'weekly'],
  ['B50.0', 'Paludisme grave (neuropaludisme)', 'Severe malaria (cerebral)', 'weekly'],
  ['A01.0', 'Fièvre typhoïde', 'Typhoid fever', 'weekly'],
  ['A00', 'Choléra', 'Cholera', 'immediate'],
  ['A03', 'Shigellose (dysenterie bacillaire)', 'Shigellosis (bacillary dysentery)', 'weekly'],
  ['A09', 'Diarrhée et gastro-entérite infectieuses', 'Infectious diarrhoea and gastroenteritis', 'weekly'],
  ['B05', 'Rougeole', 'Measles', 'immediate'],
  ['A95', 'Fièvre jaune', 'Yellow fever', 'immediate'],
  ['A39', 'Méningite à méningocoque', 'Meningococcal meningitis', 'immediate'],
  ['G03.9', 'Méningite, sans précision', 'Meningitis, unspecified', 'immediate'],
  ['A80', 'Poliomyélite / PFA', 'Poliomyelitis / acute flaccid paralysis', 'immediate'],
  ['A33', 'Tétanos néonatal', 'Neonatal tetanus', 'immediate'],
  ['A82', 'Rage', 'Rabies', 'immediate'],
  ['A98.4', 'Maladie à virus Ebola', 'Ebola virus disease', 'immediate'],
  ['B04', 'Variole du singe (mpox)', 'Mpox', 'immediate'],
  ['U07.1', 'COVID-19, virus identifié', 'COVID-19, virus identified', 'weekly'],
  ['J11', 'Grippe (syndrome grippal)', 'Influenza-like illness', 'weekly'],
  ['A15', 'Tuberculose pulmonaire', 'Pulmonary tuberculosis', 'weekly'],
  ['B20', 'Infection à VIH', 'HIV disease', ''],
  ['B16', 'Hépatite B aiguë', 'Acute hepatitis B', ''],
  ['B18.1', 'Hépatite B chronique', 'Chronic hepatitis B', ''],
  ['A54', 'Gonococcie', 'Gonorrhoea', ''],
  ['A64', 'Infection sexuellement transmissible', 'Sexually transmitted infection', ''],
  ['B37', 'Candidose', 'Candidiasis', ''],
  ['B82', 'Parasitose intestinale', 'Intestinal parasitism', ''],
  ['J00', 'Rhinopharyngite aiguë', 'Acute nasopharyngitis (common cold)', ''],
  ['J02.9', 'Angine (pharyngite aiguë)', 'Acute pharyngitis', ''],
  ['J03.9', 'Amygdalite aiguë', 'Acute tonsillitis', ''],
  ['H66.9', 'Otite moyenne', 'Otitis media', ''],
  ['J18.9', 'Pneumonie', 'Pneumonia', 'weekly'],
  ['J20.9', 'Bronchite aiguë', 'Acute bronchitis', ''],
  ['J45', 'Asthme', 'Asthma', ''],
  ['I10', 'Hypertension artérielle essentielle', 'Essential hypertension', ''],
  ['I50.9', 'Insuffisance cardiaque', 'Heart failure', ''],
  ['I64', 'Accident vasculaire cérébral', 'Stroke', ''],
  ['E11', 'Diabète de type 2', 'Type 2 diabetes', ''],
  ['E10', 'Diabète de type 1', 'Type 1 diabetes', ''],
  ['E44', 'Malnutrition protéino-énergétique', 'Protein-energy malnutrition', 'weekly'],
  ['D50', 'Anémie ferriprive', 'Iron deficiency anaemia', ''],
  ['D57', 'Drépanocytose', 'Sickle-cell disease', ''],
  ['K29', 'Gastrite', 'Gastritis', ''],
  ['K35', 'Appendicite aiguë', 'Acute appendicitis', ''],
  ['K59.0', 'Constipation', 'Constipation', ''],
  ['N39.0', 'Infection urinaire', 'Urinary tract infection', ''],
  ['N76', 'Vaginite / vulvo-vaginite', 'Vaginitis', ''],
  ['O80', 'Accouchement normal', 'Normal delivery', ''],
  ['O82', 'Accouchement par césarienne', 'Caesarean delivery', ''],
  ['O14', 'Pré-éclampsie', 'Pre-eclampsia', ''],
  ['O20', 'Hémorragie du début de grossesse', 'Haemorrhage in early pregnancy', ''],
  ['O72', 'Hémorragie du post-partum', 'Postpartum haemorrhage', ''],
  ['Z34', 'Surveillance de grossesse (CPN)', 'Antenatal care', ''],
  ['Z00.1', 'Examen de santé de routine de l\'enfant', 'Routine child health check', ''],
  ['Z23', 'Vaccination', 'Immunization', ''],
  ['Z30', 'Planification familiale', 'Family planning', ''],
  ['L03', 'Cellulite / abcès', 'Cellulitis / abscess', ''],
  ['L30.9', 'Dermatite', 'Dermatitis', ''],
  ['M54.5', 'Lombalgie', 'Low back pain', ''],
  ['M19', 'Arthrose', 'Osteoarthritis', ''],
  ['M10', 'Goutte', 'Gout', ''],
  ['R50.9', 'Fièvre, sans précision', 'Fever, unspecified', ''],
  ['R51', 'Céphalées', 'Headache', ''],
  ['R10.4', 'Douleurs abdominales', 'Abdominal pain', ''],
  ['T14.1', 'Plaie ouverte', 'Open wound', ''],
  ['S06', 'Traumatisme crânien', 'Head injury', ''],
  ['T63.0', 'Envenimation (morsure de serpent)', 'Snake bite envenomation', 'weekly'],
  ['V89', 'Accident de la voie publique', 'Road traffic accident', 'weekly'],
  ['F32', 'Épisode dépressif', 'Depressive episode', ''],
  ['F41', 'Trouble anxieux', 'Anxiety disorder', ''],
  ['H10', 'Conjonctivite', 'Conjunctivitis', ''],
  ['K02', 'Carie dentaire', 'Dental caries', ''],
  ['N40', 'Hypertrophie bénigne de la prostate', 'Benign prostatic hyperplasia', ''],
  ['C50', 'Tumeur maligne du sein', 'Breast cancer', ''],
  ['C53', 'Tumeur maligne du col de l\'utérus', 'Cervical cancer', ''],
];
export const ICD = Object.fromEntries(ICD10.map(([c, fr, en, s]) => [c, { code: c, fr, en, surveillance: s }]));
export const searchIcd = (q, limit = 20) => {
  const s = String(q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ICD10.filter(([c, fr, en]) => !s || c.toLowerCase().startsWith(s) || norm(fr).includes(s) || norm(en).includes(s)).slice(0, limit).map(([c, fr, en, sv]) => ({ code: c, fr, en, surveillance: sv }));
};

// Essential drugs: [name, dci, form, strength, category, price, cost, classes, rx_only, reorder, unit]
export const DRUGS = [
  ['Paracétamol 500 mg', 'paracetamol', 'comprimé', '500 mg', 'Antalgique', 25, 10, 'analgesic', 0, 400, 'cp'],
  ['Paracétamol sirop 120 mg/5 ml', 'paracetamol', 'sirop', '125 ml', 'Antalgique', 900, 450, 'analgesic', 0, 30, 'flacon'],
  ['Paracétamol injectable 1 g', 'paracetamol', 'perfusion', '1 g/100 ml', 'Antalgique', 1800, 900, 'analgesic', 1, 40, 'flacon'],
  ['Ibuprofène 400 mg', 'ibuprofen', 'comprimé', '400 mg', 'AINS', 50, 20, 'nsaid', 0, 300, 'cp'],
  ['Diclofénac 50 mg', 'diclofenac', 'comprimé', '50 mg', 'AINS', 50, 20, 'nsaid', 1, 200, 'cp'],
  ['Acide acétylsalicylique 100 mg', 'aspirin', 'comprimé', '100 mg', 'Antiagrégant', 30, 12, 'nsaid,antiplatelet', 0, 200, 'cp'],
  ['Tramadol 50 mg', 'tramadol', 'gélule', '50 mg', 'Antalgique palier 2', 150, 60, 'opioid,serotonergic', 1, 100, 'gél'],
  ['Artéméther-Luméfantrine 20/120 mg', 'artemether-lumefantrine', 'comprimé', '20/120 mg (24 cp)', 'Antipaludique', 2500, 1100, 'antimalarial,qt', 1, 60, 'boîte'],
  ['Artésunate injectable 60 mg', 'artesunate', 'injectable', '60 mg', 'Antipaludique', 3500, 1700, 'antimalarial', 1, 50, 'amp'],
  ['Quinine 300 mg', 'quinine', 'comprimé', '300 mg', 'Antipaludique', 100, 40, 'antimalarial,qt', 1, 200, 'cp'],
  ['Amoxicilline 500 mg', 'amoxicillin', 'gélule', '500 mg', 'Antibiotique', 75, 30, 'penicillin,antibiotic', 1, 400, 'gél'],
  ['Amoxicilline suspension 250 mg/5 ml', 'amoxicillin', 'sirop', '60 ml', 'Antibiotique', 1500, 700, 'penicillin,antibiotic', 1, 40, 'flacon'],
  ['Amoxicilline + acide clavulanique 1 g', 'amoxicillin-clavulanate', 'comprimé', '1 g', 'Antibiotique', 450, 200, 'penicillin,antibiotic', 1, 150, 'cp'],
  ['Ceftriaxone 1 g injectable', 'ceftriaxone', 'injectable', '1 g', 'Antibiotique', 1500, 650, 'cephalosporin,antibiotic', 1, 80, 'flacon'],
  ['Ciprofloxacine 500 mg', 'ciprofloxacin', 'comprimé', '500 mg', 'Antibiotique', 150, 60, 'fluoroquinolone,antibiotic,qt,preg', 1, 200, 'cp'],
  ['Azithromycine 500 mg', 'azithromycin', 'comprimé', '500 mg', 'Antibiotique', 600, 250, 'macrolide,antibiotic,qt', 1, 60, 'cp'],
  ['Doxycycline 100 mg', 'doxycycline', 'gélule', '100 mg', 'Antibiotique', 75, 30, 'tetracycline,antibiotic,preg', 1, 150, 'gél'],
  ['Métronidazole 500 mg', 'metronidazole', 'comprimé', '500 mg', 'Anti-infectieux', 50, 20, 'metronidazole,antibiotic', 1, 300, 'cp'],
  ['Cotrimoxazole 960 mg', 'sulfamethoxazole-trimethoprim', 'comprimé', '800/160 mg', 'Antibiotique', 50, 20, 'sulfa,antibiotic', 1, 300, 'cp'],
  ['Fluconazole 150 mg', 'fluconazole', 'gélule', '150 mg', 'Antifongique', 500, 200, 'azole,qt', 1, 60, 'gél'],
  ['Albendazole 400 mg', 'albendazole', 'comprimé', '400 mg', 'Antiparasitaire', 300, 100, 'anthelmintic,preg', 0, 100, 'cp'],
  ['Oméprazole 20 mg', 'omeprazole', 'gélule', '20 mg', 'Antiulcéreux', 75, 30, 'ppi', 0, 200, 'gél'],
  ['Amlodipine 5 mg', 'amlodipine', 'comprimé', '5 mg', 'Antihypertenseur', 100, 40, 'ccb,antihypertensive', 1, 300, 'cp'],
  ['Captopril 25 mg', 'captopril', 'comprimé', '25 mg', 'Antihypertenseur', 50, 20, 'acei,antihypertensive,preg', 1, 200, 'cp'],
  ['Losartan 50 mg', 'losartan', 'comprimé', '50 mg', 'Antihypertenseur', 150, 60, 'arb,antihypertensive,preg', 1, 200, 'cp'],
  ['Hydrochlorothiazide 25 mg', 'hydrochlorothiazide', 'comprimé', '25 mg', 'Diurétique', 50, 20, 'thiazide,antihypertensive', 1, 200, 'cp'],
  ['Furosémide 40 mg', 'furosemide', 'comprimé', '40 mg', 'Diurétique', 50, 20, 'loop', 1, 150, 'cp'],
  ['Spironolactone 25 mg', 'spironolactone', 'comprimé', '25 mg', 'Diurétique', 150, 60, 'k_sparing', 1, 100, 'cp'],
  ['Metformine 850 mg', 'metformin', 'comprimé', '850 mg', 'Antidiabétique', 75, 30, 'metformin', 1, 300, 'cp'],
  ['Glibenclamide 5 mg', 'glibenclamide', 'comprimé', '5 mg', 'Antidiabétique', 50, 20, 'sulfonylurea', 1, 200, 'cp'],
  ['Insuline humaine NPH 100 UI/ml', 'insulin', 'injectable', '10 ml', 'Antidiabétique', 6500, 3800, 'insulin', 1, 15, 'flacon'],
  ['Warfarine 5 mg', 'warfarin', 'comprimé', '5 mg', 'Anticoagulant', 150, 60, 'anticoag,preg', 1, 60, 'cp'],
  ['Énoxaparine 4000 UI', 'enoxaparin', 'injectable', '0,4 ml', 'Anticoagulant', 3500, 1800, 'anticoag', 1, 30, 'ser'],
  ['Salbutamol inhalateur 100 µg', 'salbutamol', 'aérosol', '200 doses', 'Bronchodilatateur', 2500, 1200, 'beta2', 1, 20, 'flacon'],
  ['Prednisolone 20 mg', 'prednisolone', 'comprimé', '20 mg', 'Corticoïde', 100, 40, 'steroid', 1, 150, 'cp'],
  ['Dexaméthasone 4 mg injectable', 'dexamethasone', 'injectable', '4 mg', 'Corticoïde', 500, 200, 'steroid', 1, 60, 'amp'],
  ['Diazépam 10 mg injectable', 'diazepam', 'injectable', '10 mg', 'Anxiolytique', 400, 150, 'benzo', 1, 40, 'amp'],
  ['Sels de réhydratation orale', 'oral rehydration salts', 'sachet', '20,5 g', 'Réhydratation', 150, 50, 'ors', 0, 200, 'sachet'],
  ['Zinc 20 mg', 'zinc', 'comprimé', '20 mg', 'Supplément', 50, 15, 'mineral', 0, 200, 'cp'],
  ['Fer + acide folique', 'ferrous sulfate-folic acid', 'comprimé', '200/0,4 mg', 'Antianémique', 25, 10, 'iron', 0, 400, 'cp'],
  ['Ringer lactate 500 ml', 'ringer lactate', 'perfusion', '500 ml', 'Soluté', 1000, 450, 'fluid', 1, 100, 'poche'],
  ['Sérum glucosé 5 % 500 ml', 'glucose 5%', 'perfusion', '500 ml', 'Soluté', 900, 400, 'fluid', 1, 100, 'poche'],
  ['Chlorure de sodium 0,9 % 500 ml', 'sodium chloride 0.9%', 'perfusion', '500 ml', 'Soluté', 900, 400, 'fluid', 1, 100, 'poche'],
  ['Ocytocine 10 UI injectable', 'oxytocin', 'injectable', '10 UI', 'Obstétrique', 600, 250, 'uterotonic', 1, 40, 'amp'],
  ['Misoprostol 200 µg', 'misoprostol', 'comprimé', '200 µg', 'Obstétrique', 500, 200, 'uterotonic,preg', 1, 30, 'cp'],
  ['Sulfate de magnésium 50 %', 'magnesium sulfate', 'injectable', '5 g/10 ml', 'Obstétrique', 1200, 500, 'mgso4', 1, 20, 'amp'],
  ['Vitamine K1 10 mg', 'phytomenadione', 'injectable', '10 mg', 'Vitamine', 500, 200, 'vitk', 1, 20, 'amp'],
  ['Métoclopramide 10 mg', 'metoclopramide', 'comprimé', '10 mg', 'Antiémétique', 50, 20, 'antiemetic', 0, 150, 'cp'],
  ['Loratadine 10 mg', 'loratadine', 'comprimé', '10 mg', 'Antihistaminique', 100, 40, 'antihistamine', 0, 150, 'cp'],
];

// Interaction rules between pharmacological classes: [classA, classB, level, fr, en]
export const INTERACTIONS = [
  ['anticoag', 'nsaid', 'major', 'Risque hémorragique majeur (anticoagulant + AINS / aspirine)', 'Major bleeding risk (anticoagulant + NSAID / aspirin)'],
  ['anticoag', 'azole', 'major', "Potentialisation de l'anticoagulant (azolé) : surveiller l'INR", 'Anticoagulant potentiated by azole: monitor INR'],
  ['anticoag', 'metronidazole', 'major', "Potentialisation de l'anticoagulant (métronidazole) : surveiller l'INR", 'Anticoagulant potentiated by metronidazole: monitor INR'],
  ['anticoag', 'fluoroquinolone', 'moderate', "Hausse de l'INR possible avec les fluoroquinolones", 'INR may rise with fluoroquinolones'],
  ['anticoag', 'macrolide', 'moderate', "Hausse de l'INR possible avec les macrolides", 'INR may rise with macrolides'],
  ['nsaid', 'steroid', 'moderate', 'Risque d\'ulcère et de saignement digestif (AINS + corticoïde)', 'GI ulcer and bleeding risk (NSAID + steroid)'],
  ['nsaid', 'acei', 'moderate', 'Risque d\'insuffisance rénale et baisse de l\'effet antihypertenseur', 'Kidney injury risk and reduced antihypertensive effect'],
  ['nsaid', 'arb', 'moderate', 'Risque d\'insuffisance rénale et baisse de l\'effet antihypertenseur', 'Kidney injury risk and reduced antihypertensive effect'],
  ['nsaid', 'loop', 'moderate', "Baisse de l'effet du diurétique, risque rénal", 'Reduced diuretic effect, kidney risk'],
  ['acei', 'k_sparing', 'major', 'Risque d\'hyperkaliémie (IEC + diurétique épargneur de potassium)', 'Hyperkalaemia risk (ACE inhibitor + potassium-sparing diuretic)'],
  ['arb', 'k_sparing', 'major', 'Risque d\'hyperkaliémie (ARA II + diurétique épargneur de potassium)', 'Hyperkalaemia risk (ARB + potassium-sparing diuretic)'],
  ['acei', 'arb', 'major', 'Double blocage du système rénine-angiotensine : à éviter', 'Dual renin-angiotensin blockade: avoid'],
  ['qt', 'qt', 'major', 'Allongement du QT : association de deux médicaments torsadogènes', 'QT prolongation: two QT-prolonging drugs'],
  ['opioid', 'benzo', 'major', 'Dépression respiratoire (opioïde + benzodiazépine)', 'Respiratory depression (opioid + benzodiazepine)'],
  ['sulfonylurea', 'fluoroquinolone', 'moderate', 'Risque d\'hypoglycémie (sulfamide hypoglycémiant + fluoroquinolone)', 'Hypoglycaemia risk (sulfonylurea + fluoroquinolone)'],
  ['sulfonylurea', 'sulfa', 'moderate', 'Risque d\'hypoglycémie (cotrimoxazole)', 'Hypoglycaemia risk (cotrimoxazole)'],
  ['metronidazole', 'alcohol', 'moderate', 'Effet antabuse avec l\'alcool', 'Disulfiram-like reaction with alcohol'],
  ['iron', 'tetracycline', 'minor', 'Espacer de 2 heures la prise de fer et de la doxycycline', 'Take iron and doxycycline 2 hours apart'],
  ['iron', 'fluoroquinolone', 'minor', 'Espacer de 2 heures la prise de fer et de la ciprofloxacine', 'Take iron and ciprofloxacin 2 hours apart'],
];

// Allergy words written in the patient file → classes or substances they exclude.
export const ALLERGY_MAP = [
  [/p[ée]nicill|amoxi|augmentin/i, ['penicillin']],
  [/c[ée]phalospor|ceftria/i, ['cephalosporin']],
  [/sulfa|bactrim|cotrimox/i, ['sulfa']],
  [/aspirin|ains|anti-inflammatoire|ibupro|diclof|nsaid/i, ['nsaid']],
  [/quinolon|ciproflox/i, ['fluoroquinolone']],
  [/macrolid|azithro|[ée]rythro/i, ['macrolide']],
  [/quinine/i, ['antimalarial']],
  [/cod[ée]ine|morphin|opio|tramadol/i, ['opioid']],
  [/iode|iod/i, ['iodine']],
];

/**
 * Checks a prescription against the patient's allergies, the other lines and
 * the patient's current treatments. lines: [{name, dci, classes}]; returns
 * [{level:'allergy'|'major'|'moderate'|'minor'|'duplicate'|'pregnancy', fr, en, drugs}]
 */
export function checkPrescription(lines, { allergies = '', current = [], pregnant = false } = {}) {
  const out = [];
  const cls = (l) => String(l.classes || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const l of lines) {
    for (const [rx, classes] of ALLERGY_MAP) {
      if (rx.test(allergies) && classes.some((c) => cls(l).includes(c))) out.push({ level: 'allergy', fr: `Allergie connue (${allergies}) : ${l.name}`, en: `Known allergy (${allergies}): ${l.name}`, drugs: [l.name] });
    }
    if (allergies && l.dci && allergies.toLowerCase().includes(String(l.dci).toLowerCase().split('-')[0])) out.push({ level: 'allergy', fr: `Allergie à ${l.dci} notée dans le dossier`, en: `Allergy to ${l.dci} in the record`, drugs: [l.name] });
    if (pregnant && cls(l).includes('preg')) out.push({ level: 'pregnancy', fr: `${l.name} : déconseillé pendant la grossesse`, en: `${l.name}: avoid during pregnancy`, drugs: [l.name] });
  }
  const all = [...lines.map((l) => ({ ...l, current: false })), ...current.map((l) => ({ ...l, current: true }))];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a.current && b.current) continue;
      if (a.dci && a.dci === b.dci) { out.push({ level: 'duplicate', fr: `Doublon : ${a.name} et ${b.name} (même molécule)`, en: `Duplicate: ${a.name} and ${b.name} (same substance)`, drugs: [a.name, b.name] }); continue; }
      const ca = cls(a), cb = cls(b);
      for (const [x, y, level, fr, en] of INTERACTIONS) {
        if ((ca.includes(x) && cb.includes(y)) || (ca.includes(y) && cb.includes(x))) {
          out.push({ level, fr: `${a.name} + ${b.name}${b.current ? ' (traitement en cours)' : ''} : ${fr}`, en: `${a.name} + ${b.name}${b.current ? ' (current treatment)' : ''}: ${en}`, drugs: [a.name, b.name] });
          break;
        }
      }
      if (ca.includes('nsaid') && cb.includes('nsaid') && !ca.includes('antiplatelet') && !cb.includes('antiplatelet')) out.push({ level: 'duplicate', fr: `Deux AINS : ${a.name} et ${b.name}`, en: `Two NSAIDs: ${a.name} and ${b.name}`, drugs: [a.name, b.name] });
    }
  }
  const seen = new Set();
  return out.filter((x) => { const k = x.level + x.fr; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** NEWS2 early warning score from vitals (resp, spo2, sys, pulse, temp, avpu, o2). */
export function news2(v = {}) {
  if (!v || typeof v !== 'object') return null;
  const n = (k) => (v[k] === '' || v[k] == null ? null : Number(v[k]));
  const rr = n('resp'), sp = n('spo2'), sys = n('bp_sys'), hr = n('pulse'), t = n('temp');
  const parts = [rr, sp, sys, hr, t].filter((x) => x != null && !Number.isNaN(x));
  if (parts.length < 3) return null;
  let s = 0; let red = false;
  const add = (p) => { s += p; if (p === 3) red = true; };
  if (rr != null) add(rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3);
  if (sp != null) add(sp <= 91 ? 3 : sp <= 93 ? 2 : sp <= 95 ? 1 : 0);
  if (v.o2) add(2);
  if (sys != null) add(sys <= 90 ? 3 : sys <= 100 ? 2 : sys <= 110 ? 1 : sys <= 219 ? 0 : 3);
  if (hr != null) add(hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3);
  if (v.avpu && v.avpu !== 'A') add(3);
  if (t != null) add(t <= 35 ? 3 : t <= 36 ? 1 : t <= 38 ? 0 : t <= 39 ? 1 : 2);
  const level = s >= 7 ? 'high' : s >= 5 || red ? 'medium' : s >= 1 ? 'low' : 'none';
  return { score: s, level };
}

/** Body mass index from weight (kg) and height (cm). */
export const bmi = (v = {}) => (Number(v.weight) > 0 && Number(v.height) > 0 ? Math.round((Number(v.weight) / (Number(v.height) / 100) ** 2) * 10) / 10 : null);

// Lab parameters. Numbers: {k, label, unit, lo, hi, clo, chi} (clo/chi critical);
// choices: {k, label, choices, abnormal:[...]}; text: {k, label, text:true}
const P = (k, label, unit, lo, hi, clo, chi) => ({ k, label, unit, lo, hi, clo, chi });
const C = (k, label, choices, abnormal) => ({ k, label, choices, abnormal });
export const LAB_PANELS = {
  NFS: [P('hb', 'Hémoglobine', 'g/dL', 12, 16, 7, 20), P('ht', 'Hématocrite', '%', 36, 48, 20, 60), P('gb', 'Globules blancs', '10³/µL', 4, 10, 2, 30), P('neut', 'Neutrophiles', '%', 40, 75), P('lymph', 'Lymphocytes', '%', 20, 45), P('plq', 'Plaquettes', '10³/µL', 150, 400, 50, 1000), P('vgm', 'VGM', 'fL', 80, 100)],
  GE: [C('result', 'Goutte épaisse', ['Négative', 'Positive'], ['Positive']), P('density', 'Parasitémie', 'parasites/µL', 0, 0), C('species', 'Espèce', ['—', 'P. falciparum', 'P. malariae', 'P. ovale'], [])],
  TDR: [C('result', 'TDR paludisme', ['Négatif', 'Positif'], ['Positif'])],
  GLY: [P('gly', 'Glycémie à jeun', 'g/L', 0.7, 1.1, 0.4, 4)],
  HBA1C: [P('hba1c', 'Hémoglobine glyquée (HbA1c)', '%', 4, 6.5, null, 14)],
  CREA: [P('crea', 'Créatinine', 'mg/L', 6, 12, null, 50), P('uree', 'Urée', 'g/L', 0.15, 0.45, null, 2)],
  TRANS: [P('asat', 'ASAT (TGO)', 'UI/L', 0, 40, null, 1000), P('alat', 'ALAT (TGP)', 'UI/L', 0, 40, null, 1000)],
  CRP: [P('crp', 'Protéine C réactive', 'mg/L', 0, 6, null, 200)],
  WIDAL: [C('to', 'Widal TO', ['< 1/80', '1/80', '1/160', '≥ 1/320'], ['1/160', '≥ 1/320']), C('th', 'Widal TH', ['< 1/80', '1/80', '1/160', '≥ 1/320'], ['1/160', '≥ 1/320'])],
  HIV: [C('result', 'Test VIH (Determine / Oraquick)', ['Non réactif', 'Réactif'], ['Réactif'])],
  HBS: [C('result', 'Antigène HBs', ['Négatif', 'Positif'], ['Positif'])],
  BHCG: [C('result', 'Test de grossesse (β-hCG)', ['Négatif', 'Positif'], [])],
  GS: [C('abo', 'Groupe ABO', ['A', 'B', 'AB', 'O'], []), C('rh', 'Rhésus', ['Positif', 'Négatif'], [])],
  ECBU: [P('leuco', 'Leucocyturie', '/mm³', 0, 10), C('culture', 'Culture', ['Stérile', 'Positive'], ['Positive']), { k: 'germ', label: 'Germe et antibiogramme', text: true }],
  LIPID: [P('ct', 'Cholestérol total', 'g/L', 1.5, 2), P('hdl', 'HDL', 'g/L', 0.4, 0.9), P('ldl', 'LDL', 'g/L', 0, 1.3), P('tg', 'Triglycérides', 'g/L', 0.5, 1.5)],
  ELEC: [P('na', 'Sodium', 'mmol/L', 135, 145, 120, 160), P('k', 'Potassium', 'mmol/L', 3.5, 5, 2.5, 6.5)],
};

/** Flags each result against its range: '' (normal), 'L', 'H', 'LL'/'HH' (critical), 'A' (abnormal). */
export function flagResults(params = [], values = {}) {
  return params.map((p) => {
    const v = values[p.k];
    if (v === undefined || v === null || v === '') return { ...p, value: '', flag: '' };
    if (p.choices) return { ...p, value: String(v), flag: (p.abnormal || []).includes(String(v)) ? 'A' : '' };
    if (p.text) return { ...p, value: String(v).slice(0, 1000), flag: '' };
    const x = Number(String(v).replace(',', '.'));
    if (Number.isNaN(x)) return { ...p, value: String(v), flag: '' };
    let flag = '';
    if (p.clo != null && x < p.clo) flag = 'LL'; else if (p.chi != null && x > p.chi) flag = 'HH';
    else if (p.lo != null && x < p.lo) flag = 'L'; else if (p.hi != null && x > p.hi) flag = 'H';
    return { ...p, value: x, flag };
  });
}

export const DEPARTMENTS = [
  ['Médecine générale', 'General medicine', 'consult', '#6D3BEB'],
  ['Pédiatrie', 'Paediatrics', 'consult', '#0EA5E9'],
  ['Gynécologie-obstétrique', 'Obstetrics & gynaecology', 'consult', '#DB2777'],
  ['Médecine interne / cardiologie', 'Internal medicine / cardiology', 'consult', '#DC2626'],
  ['Urgences', 'Emergency', 'emergency', '#EA580C'],
  ['Chirurgie', 'Surgery', 'surgery', '#0F766E'],
  ['Laboratoire', 'Laboratory', 'lab', '#7C3AED'],
  ['Imagerie médicale', 'Medical imaging', 'imaging', '#4F46E5'],
  ['Pharmacie', 'Pharmacy', 'pharmacy', '#16A34A'],
];

// [code, name, name_en, kind, price, department kind, account, panel, tat_hours]
export const TARIFFS = [
  ['CS-G', 'Consultation de médecine générale', 'General consultation', 'consult', 5000, 'consult', '7061'],
  ['CS-S', 'Consultation spécialisée', 'Specialist consultation', 'consult', 10000, 'consult', '7061'],
  ['CS-U', "Consultation d'urgence", 'Emergency consultation', 'consult', 7500, 'emergency', '7061'],
  ['CS-T', 'Téléconsultation', 'Teleconsultation', 'consult', 5000, 'consult', '7061'],
  ['CS-C', 'Consultation de contrôle', 'Follow-up consultation', 'consult', 2500, 'consult', '7061'],
  ['CPN', 'Consultation prénatale (CPN)', 'Antenatal visit', 'consult', 3000, 'consult', '7061'],
  ['NFS', 'Numération formule sanguine (NFS)', 'Full blood count', 'lab', 4000, 'lab', '7062', 'NFS', 4],
  ['GE', 'Goutte épaisse (GE)', 'Malaria thick smear', 'lab', 2000, 'lab', '7062', 'GE', 2],
  ['TDR', 'TDR paludisme', 'Malaria rapid test', 'lab', 1500, 'lab', '7062', 'TDR', 1],
  ['GLY', 'Glycémie à jeun', 'Fasting glucose', 'lab', 1500, 'lab', '7062', 'GLY', 1],
  ['HBA1C', 'Hémoglobine glyquée (HbA1c)', 'HbA1c', 'lab', 8000, 'lab', '7062', 'HBA1C', 24],
  ['CREA', 'Créatinine et urée', 'Creatinine and urea', 'lab', 4000, 'lab', '7062', 'CREA', 6],
  ['TRANS', 'Transaminases (ASAT, ALAT)', 'Transaminases', 'lab', 5000, 'lab', '7062', 'TRANS', 6],
  ['CRP', 'CRP', 'C-reactive protein', 'lab', 4000, 'lab', '7062', 'CRP', 4],
  ['WIDAL', 'Sérodiagnostic de Widal', 'Widal test', 'lab', 3500, 'lab', '7062', 'WIDAL', 6],
  ['HIV', 'Test VIH', 'HIV test', 'lab', 2000, 'lab', '7062', 'HIV', 1],
  ['HBS', 'Antigène HBs', 'HBs antigen', 'lab', 3000, 'lab', '7062', 'HBS', 2],
  ['BHCG', 'Test de grossesse', 'Pregnancy test', 'lab', 2000, 'lab', '7062', 'BHCG', 1],
  ['GS', 'Groupe sanguin et rhésus', 'Blood group', 'lab', 2500, 'lab', '7062', 'GS', 2],
  ['ECBU', 'ECBU (examen des urines)', 'Urine culture', 'lab', 6000, 'lab', '7062', 'ECBU', 48],
  ['LIPID', 'Bilan lipidique', 'Lipid profile', 'lab', 9000, 'lab', '7062', 'LIPID', 24],
  ['ELEC', 'Ionogramme (Na, K)', 'Electrolytes', 'lab', 6000, 'lab', '7062', 'ELEC', 6],
  ['ECHO-A', 'Échographie abdomino-pelvienne', 'Abdominal ultrasound', 'imaging', 15000, 'imaging', '7062', null, 24],
  ['ECHO-O', 'Échographie obstétricale', 'Obstetric ultrasound', 'imaging', 15000, 'imaging', '7062', null, 24],
  ['RX-T', 'Radiographie du thorax', 'Chest X-ray', 'imaging', 12000, 'imaging', '7062', null, 24],
  ['RX-O', 'Radiographie osseuse', 'Bone X-ray', 'imaging', 12000, 'imaging', '7062', null, 24],
  ['ECG', 'Électrocardiogramme (ECG)', 'ECG', 'imaging', 10000, 'imaging', '7062', null, 4],
  ['INJ', 'Injection', 'Injection', 'care', 1000, 'consult', '7061'],
  ['PERF', 'Pose de perfusion', 'IV line', 'care', 3000, 'consult', '7061'],
  ['PANS', 'Pansement', 'Wound dressing', 'care', 2000, 'consult', '7061'],
  ['SUT', 'Suture (petite plaie)', 'Suture', 'act', 10000, 'surgery', '7061'],
  ['ACC', 'Accouchement par voie basse', 'Vaginal delivery', 'act', 60000, 'consult', '7061'],
  ['CES', 'Césarienne', 'Caesarean section', 'surgery', 350000, 'surgery', '7061'],
  ['APP', 'Appendicectomie', 'Appendectomy', 'surgery', 300000, 'surgery', '7061'],
  ['VACC', 'Acte de vaccination', 'Vaccination', 'care', 1000, 'consult', '7061'],
  ['OXY', "Oxygénothérapie (par jour)", 'Oxygen therapy (per day)', 'care', 15000, 'emergency', '7061'],
];

// [ward, kind, daily rate, rooms × beds]
export const WARDS = [
  ['Médecine', 'standard', 15000, [['M1', 4], ['M2', 4]]],
  ['Maternité', 'maternity', 20000, [['Mat1', 3], ['Mat2', 3]]],
  ['Pédiatrie', 'standard', 12000, [['P1', 4]]],
  ['Chambres privées', 'private', 35000, [['VIP1', 1], ['VIP2', 1], ['VIP3', 1]]],
  ['Soins intensifs', 'icu', 75000, [['SI', 3]]],
];

export const VACCINES = ['BCG', 'VPO (polio oral)', 'Penta (DTC-HepB-Hib)', 'Pneumo (PCV13)', 'Rota', 'VPI (polio inj.)', 'RR (rougeole-rubéole)', 'Fièvre jaune', 'Méningite A', 'HPV', 'Tétanos (VAT)', 'Hépatite B', 'COVID-19', 'Paludisme (RTS,S / R21)'];
