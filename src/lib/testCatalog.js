/**
 * Canonical analyte catalog — the thing that makes a trend possible across labs.
 *
 * The same test is named differently by every lab in this dataset: "Haemoglobin
 * (SLSHemoglobin)" at Neuberg, "Hemoglobin (Cyanomethemoglobin)" at Manipal,
 * plain "Hemoglobin" at Tata 1mg. Without folding those onto one key, a patient
 * with reports from three labs has three one-point series instead of one
 * three-point trend.
 *
 * `match` patterns are tested against the lowercased raw name with method
 * parentheticals already stripped. First match wins, so order matters where
 * patterns overlap (free T3 before T3).
 *
 * A raw name that matches nothing is NOT dropped — it renders in its own report
 * with its own reference interval, it just cannot join a cross-report series.
 */

// Some analytes share a name across specimens (RBC in blood vs in urine). Where
// that happens the entry declares `specimen`, and matching also checks the unit.
const C = (key, name, panel, opts = {}) => ({ key, name, panel, ...opts })

export const CATALOG = [
  // --- haematology ---------------------------------------------------------
  C('hemoglobin', 'Hemoglobin', 'cbc', { match: [/^h(a)?emoglobin\b/, /^hb$/] }),
  C('rbc', 'RBC count', 'cbc', { specimen: 'blood', match: [/^rbc(\s*count)?$/, /^rbc count\b/, /^red blood cell count$/, /^total rbc/] }),
  C('hct', 'Hematocrit', 'cbc', { match: [/^h(a)?ematocrit/, /^hct$/, /^pcv$/, /^packed cell volume/] }),
  C('mcv', 'MCV', 'cbc', { match: [/^mcv$/, /^mean corpuscular volume/] }),
  C('mch', 'MCH', 'cbc', { match: [/^mch$/, /^mean corpuscular h(a)?emoglobin$/] }),
  C('mchc', 'MCHC', 'cbc', { match: [/^mchc$/, /^mean corpuscular h(a)?emoglobin conc/, /^mean corpuscular hb$/] }),
  C('rdw', 'RDW-CV', 'cbc', { match: [/^rdw([\s-]?cv)?/, /^red cell distribution width/] }),
  C('tlc', 'Total leucocyte count', 'cbc', { match: [/^tlc$/, /^total (wbc|leu[ck]ocyte|white)/, /^wbc(\s*count)?$/] }),
  C('platelets', 'Platelet count', 'cbc', { match: [/^platelet/, /^plt$/] }),
  C('mpv', 'MPV', 'cbc', { match: [/^mpv$/, /^mean platelet volume/] }),
  C('pdw', 'PDW', 'cbc', { match: [/^pdw$/, /^platelet distribution width/] }),
  C('plcr', 'P-LCR', 'cbc', { match: [/^p[\s-]?lcr$/, /platelet large cell ratio/] }),

  C('neutrophils', 'Neutrophils', 'dlc', { match: [/^neutrophils?$/, /^segmented neutrophil/] }),
  C('lymphocytes', 'Lymphocytes', 'dlc', { match: [/^lymphocytes?$/] }),
  C('monocytes', 'Monocytes', 'dlc', { match: [/^monocytes?$/] }),
  C('eosinophils', 'Eosinophils', 'dlc', { match: [/^eosinophils?$/] }),
  C('basophils', 'Basophils', 'dlc', { match: [/^basophils?$/] }),
  C('anc', 'Absolute neutrophil count', 'alc', { match: [/^absolute neutrophil/] }),
  C('alc_lymph', 'Absolute lymphocyte count', 'alc', { match: [/^absolute lymphocyte/] }),
  C('amc', 'Absolute monocyte count', 'alc', { match: [/^absolute monocyte/] }),
  C('aec', 'Absolute eosinophil count', 'alc', { match: [/^absolute eosinophil/] }),

  // --- inflammatory --------------------------------------------------------
  C('ig_pct', 'Immature granulocytes', 'dlc', { match: [/^immature granulocyte/, /^ig%?$/] }),
  C('nrbc', 'Nucleated RBC', 'cbc', { match: [/^nucleated red/, /^nrbc/] }),

  C('esr', 'ESR', 'inflammatory', { match: [/^esr$/, /^erythrocyte sedimentation/] }),
  C('crp', 'C-reactive protein', 'inflammatory', { match: [/c[\s-]?reactive protein/, /^crp\b/, /hs[\s-]?crp/] }),

  // --- diabetes ------------------------------------------------------------
  C('glucose_fasting', 'Glucose – fasting', 'diabetes', { match: [/^glucose[\s,-]*(–|-)?\s*\(?fasting\)?/, /^fasting (blood )?(glucose|sugar)/, /^fbs$/] }),
  C('glucose_pp', 'Glucose – post prandial', 'diabetes', { match: [/post ?prandial/, /^ppbs$/, /^glucose.*pp$/] }),
  C('glucose_random', 'Glucose – random', 'diabetes', { match: [/^random (blood )?(glucose|sugar)/, /^rbs$/] }),
  C('hba1c', 'HbA1c', 'diabetes', { match: [/^hba1?c/, /glycosylated h(a)?emoglobin/, /glycated h(a)?emoglobin/] }),
  C('eag', 'Estimated average glucose', 'diabetes', { match: [/estimated average glucose/, /^eag$/] }),
  C('microalbumin', 'Microalbumin – urine', 'diabetes', { match: [/^micro ?albumin(?!.*ratio)/] }),
  C('uacr', 'Microalbumin / creatinine ratio', 'diabetes', { match: [/micro ?albumin.*ratio/, /^uacr$/, /albumin.*creatinine ratio/] }),

  // --- lipids --------------------------------------------------------------
  C('chol_total', 'Cholesterol – total', 'lipid', { match: [/^(total )?cholesterol([\s-]*(–|-)?\s*total)?$/, /^cholesterol total/, /^serum cholesterol/] }),
  C('triglycerides', 'Triglycerides', 'lipid', { match: [/^tri ?glyceride/, /^tg$/] }),
  C('hdl', 'Cholesterol – HDL', 'lipid', { match: [/^hdl/, /cholesterol[\s-]*(–|-)?\s*hdl/, /high density lipo/] }),
  C('ldl', 'Cholesterol – LDL', 'lipid', { match: [/^ldl(?!.*ratio)(?!.*hdl)/, /cholesterol[\s-]*(–|-)?\s*ldl/, /low density lipo/] }),
  C('vldl', 'Cholesterol – VLDL', 'lipid', { match: [/^vldl/, /cholesterol[\s-]*(–|-)?\s*vldl/, /very low density/] }),
  C('non_hdl', 'Non-HDL cholesterol', 'lipid', { match: [/^non[\s-]?hdl/] }),
  C('chol_hdl_ratio', 'Cholesterol : HDL ratio', 'lipid', { match: [/^(total )?chol(esterol)?\s*[:/]\s*hdl/, /^tc\s*\/\s*hdl/, /total chol.*hdl.*ratio/] }),
  C('ldl_hdl_ratio', 'LDL : HDL ratio', 'lipid', { match: [/^ldl[\s-]?c?\s*(chol)?\s*[:/]\s*hdl/, /ldl.*hdl.*ratio/] }),
  C('trig_hdl_ratio', 'Triglyceride : HDL ratio', 'lipid', { match: [/^trig\w*\s*\/\s*hdl/, /triglyceride.*hdl.*ratio/] }),

  // --- liver ---------------------------------------------------------------
  C('bilirubin_total', 'Bilirubin – total', 'liver', { match: [/^(serum )?bilirubin[\s-]*(–|-)?\s*total$/, /^total bilirubin/] }),
  C('bilirubin_direct', 'Bilirubin – direct', 'liver', { match: [/bilirubin[\s-]*(–|-)?\s*direct/, /^direct bilirubin/, /conjugated bilirubin/] }),
  C('bilirubin_indirect', 'Bilirubin – indirect', 'liver', { match: [/bilirubin[\s-]*(–|-)?\s*indirect/, /^indirect bilirubin/, /unconjugated bilirubin/] }),
  C('protein_total', 'Protein – total', 'liver', { match: [/^(total )?proteins?([\s,-]*\(?total\)?)?$/, /^proteins? \(total\)$/] }),
  C('albumin', 'Albumin', 'liver', { match: [/^(serum )?albumin$/] }),
  C('globulin', 'Globulin', 'liver', { match: [/^globulin$/] }),
  C('ag_ratio', 'A / G ratio', 'liver', { match: [/^a\s*\/\s*g ratio/, /alb\w*\s*\/\s*globulin ratio/, /albumin\s*\/?\s*globulin ratio/] }),
  C('sgot', 'SGOT (AST)', 'liver', { match: [/^sgot/, /^ast\b/, /aspartate (amino)?transaminase/, /aspartate aminotransferase/] }),
  C('sgpt', 'SGPT (ALT)', 'liver', { match: [/^sgpt/, /^alt\b/, /alanine (amino)?transaminase/, /alanine aminotransferase/] }),
  C('alp', 'Alkaline phosphatase', 'liver', { match: [/alkaline phosphatase/, /^alp$/] }),
  C('ggt', 'GGT', 'liver', { match: [/gamma[\s-]?glutamyl/, /^ggt$/, /^ggtp$/] }),
  C('amylase', 'Amylase', 'liver', { match: [/^amylase/] }),
  C('lipase', 'Lipase', 'liver', { match: [/^lipase/] }),

  // --- kidney --------------------------------------------------------------
  C('bun', 'Blood urea nitrogen', 'kidney', { match: [/^bun\b/, /^(blood )?urea nitrogen/] }),
  C('urea', 'Urea', 'kidney', { match: [/^(serum |blood )?urea$/] }),
  C('creatinine', 'Creatinine', 'kidney', { specimen: 'blood', match: [/^(serum )?creatinine$/, /^creatinine$/] }),
  C('uric_acid', 'Uric acid', 'kidney', { match: [/^(serum )?uric acid$/] }),
  C('sodium', 'Sodium', 'kidney', { match: [/^(serum )?sodium/, /^na\+?$/] }),
  C('potassium', 'Potassium', 'kidney', { match: [/^(serum )?potassium/, /^k\+?$/] }),
  C('chloride', 'Chloride', 'kidney', { match: [/^(serum )?chloride/, /^cl-?$/] }),
  C('bicarbonate', 'Bicarbonate', 'kidney', { match: [/bicarbonate/, /^hco3/] }),
  C('bun_creat_ratio', 'BUN / creatinine ratio', 'kidney', { match: [/bun\s*\/\s*creat/, /urea.*creatinine ratio/] }),
  C('egfr', 'eGFR', 'kidney', { match: [/^e?gfr/, /glomerular filtration/] }),

  // --- thyroid -------------------------------------------------------------
  C('free_t3', 'Free T3', 'thyroid', { match: [/^free\s*t3/, /^ft3$/, /triiodothyronine.*free/] }),
  C('free_t4', 'Free T4', 'thyroid', { match: [/^free\s*t4/, /^ft4$/, /thyroxine.*free/] }),
  C('t3', 'T3, total', 'thyroid', { match: [/^t3\b/, /^(serum )?t3[\s,-]/, /^total t3/, /triiodothyronine/] }),
  C('t4', 'T4, total', 'thyroid', { match: [/^t4\b/, /^(serum )?t4[\s,-]/, /^total t4/, /thyroxine/] }),
  C('tsh', 'TSH', 'thyroid', { match: [/^tsh/, /thyroid stimulating/] }),

  // --- iron ----------------------------------------------------------------
  C('iron_serum', 'Iron – serum', 'iron', { match: [/^(serum )?iron$/, /^iron[\s-]*serum/] }),
  C('ferritin', 'Ferritin', 'iron', { match: [/^(serum )?ferritin/] }),
  C('tibc', 'TIBC', 'iron', { match: [/^tibc$/, /total iron binding/] }),
  C('uibc', 'UIBC', 'iron', { match: [/^uibc$/, /unsaturated iron binding/] }),
  C('transferrin_sat', 'Transferrin saturation', 'iron', { match: [/transferrin sat/, /^tsat$/] }),

  // --- vitamins & bone -----------------------------------------------------
  C('vitamin_d', 'Vitamin D (25-OH)', 'bone', { match: [/vitamin\s*d\b/, /25[\s-]?oh/, /cholecalciferol/] }),
  C('calcium', 'Calcium', 'bone', { match: [/^calcium$/, /^total calcium/] }),
  C('calcium_adj', 'Adjusted calcium', 'bone', { match: [/^(adjusted|corrected) calcium/] }),
  C('phosphorus', 'Phosphorus', 'bone', { match: [/^(serum )?phosphor/] }),
  C('vitamin_b12', 'Vitamin B12', 'vitamins', { match: [/vitamin\s*b[\s-]?12/, /cobalamin/] }),
  C('vitamin_b9', 'Vitamin B9 (folate)', 'vitamins', { match: [/vitamin\s*b[\s-]?9/, /^folate$/, /folic acid/] }),

  C('insulin_fasting', 'Insulin – fasting', 'diabetes', { match: [/^insulin[\s-]*\(?fasting\)?/, /^fasting insulin/] }),
  C('apo_a1', 'Apolipoprotein A-1', 'lipid', { match: [/^apo(lipoprotein)?\s*-?\s*a\s*-?\s*1?$/] }),
  C('apo_b', 'Apolipoprotein B', 'lipid', { match: [/^apo(lipoprotein)?\s*-?\s*b$/] }),
  C('ige_total', 'Total IgE', 'other', { match: [/^total ige$/, /^ige total$/] }),
  C('homocysteine', 'Homocysteine', 'other', { match: [/^homocyst(e|i)ene?/, /^homocysteine/] }),
  C('c_peptide', 'C-peptide', 'diabetes', { match: [/^c\s*-?\s*peptide/] }),
  C('lpa', 'Lipoprotein (a)', 'lipid', { match: [/^lipoprotein\s*\(a\)/, /^lp\s*\(a\)/] }),
  C('fructosamine', 'Fructosamine', 'diabetes', { match: [/^fructosamine/] }),

  // --- urine ---------------------------------------------------------------
  C('urine_ph', 'pH', 'urine', { specimen: 'urine', match: [/^ph$/, /^ph\s*\(/] }),
  C('specific_gravity', 'Specific gravity', 'urine', { match: [/^specific gravity/, /^sp\.?\s*gravity/] }),
  C('urine_protein', 'Protein', 'urine', { specimen: 'urine', match: [/^protein\s*\(error/, /^urine protein/] }),
  C('urine_glucose', 'Glucose', 'urine', { specimen: 'urine', match: [/^urine glucose/, /^glucose \(random\)$/] }),
  C('pus_cells', 'Pus cells', 'urine', { match: [/^pus cells/, /^leu[ck]ocytes?\s*\(urine/] }),
  C('urine_rbc', 'Red blood cells', 'urine', { specimen: 'urine', match: [/^red blood cells?$/, /^rbcs?$/] }),
  C('epithelial_cells', 'Epithelial cells', 'urine', { match: [/^epithelial cell/] }),
  C('urine_appearance', 'Appearance', 'urine', { match: [/^appearance$/] }),
  C('urine_colour', 'Colour', 'urine', { match: [/^colou?r$/] }),
  C('urine_bilirubin', 'Bilirubin', 'urine', { specimen: 'urine', match: [/^bilirubin$/] }),
  C('urine_nitrite', 'Nitrite', 'urine', { match: [/^nitrites?$/] }),
  C('urine_ketones', 'Ketones', 'urine', { match: [/^ketones?$/, /^ketone bodies$/] }),
  C('bile_salt', 'Bile salts', 'urine', { match: [/^bile salts?$/] }),
  C('bile_pigment', 'Bile pigments', 'urine', { match: [/^bile pigments?$/] }),
  C('urobilinogen', 'Urobilinogen', 'urine', { match: [/^urobilinogen/] }),
  C('leucocyte_esterase', 'Leucocyte esterase', 'urine', { match: [/^leu[ck]ocytes?\s*\(?esterase/] }),
  C('yeast', 'Yeast', 'urine', { match: [/^yeast/] }),
  C('bacteria', 'Bacteria', 'urine', { match: [/^bacteria/] }),
  C('amorphous', 'Amorphous material', 'urine', { match: [/^amorphous/] }),
  C('urine_casts', 'Casts', 'urine', { match: [/casts?$/] }),
  C('urine_crystals', 'Crystals', 'urine', { match: [/crystals?$/, /^calcium phosphate$/] }),
]

export const PANELS = {
  cbc: 'Complete Blood Count',
  dlc: 'Differential Leucocyte Count',
  alc: 'Absolute Leucocyte Count',
  inflammatory: 'Inflammatory Markers',
  diabetes: 'Diabetes Profile',
  lipid: 'Lipid Profile',
  liver: 'Liver Function Test',
  kidney: 'Kidney Function Test',
  thyroid: 'Thyroid Function Test',
  iron: 'Iron Studies',
  vitamins: 'Vitamin Profile',
  bone: 'Calcium & Bone Health',
  urine: 'Urine Routine & Microscopy',
  other: 'Other Tests',
}

/** Strips method/specimen parentheticals the labs append to the analyte name. */
export function canonicalize(rawName) {
  return String(rawName)
    .toLowerCase()
    // "(Direct)" / "(Indirect)" qualify the analyte (direct vs indirect
    // bilirubin) — unparenthesise them so the method-strip below cannot eat
    // them and silently merge two different tests.
    .replace(/\((in)?direct\)/g, ' $1direct ')
    .replace(/\((?:[^)]*?(?:ise|eclia|cmia|hplc|impedence|impedance|hydrodynamic|flowcytometry|enzymatic|calculated|urease|gldh|refractometry|photometry|colorimetric|turbidimetr|nephelometr|microscopy|derived|slshemoglobin|cyanomethemoglobin|mixed indicator|griess|diazonium|error of ph)[^)]*)\)/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    // Labs append the assay method bare, often stacked two deep ("Neutrophils
    // Percentage Flow Cytometry"), so strip trailing methods until none remain.
    .replace(/(\s*[-,]?\s*\b(?:flow\s*cytometry|cph\s*detection|protein\s*error\s*of\s*ph|legal'?s?\s*test|spectrophotometry|photometry|colou?rimetric|turbidimetr\w*|nephelometr\w*|refractometry|microscopy|calculated|derived|enzymatic|impedanc?e|impedence|percentage|kinetic|uricase|urease|biuret|jaffe|hplc|eclia|cmia|clia|elisa|(?:in)?direct\s*ise|ise|griess|diazonium)\b\s*)+$/g, '')
    // …then the specimen the method left behind ("Albumin - Serum Photometry").
    .replace(/\s*[-,]?\s*\b(serum|plasma|whole\s*blood|urine)\b\s*$/g, '')
    .replace(/^(serum|plasma|whole blood|urine)\s+/g, '')
    .replace(/\b(test|levels?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const UNIT_IS_URINE = /hpf|lpf/i

/**
 * Labs write the analyte and its abbreviation together — "Hematocrit (PCV)",
 * "Mean Corpuscular Hemoglobin (MCH)". Either half alone is a valid name, so
 * both are offered to the matcher.
 */
function variants(n) {
  const out = [n]
  const m = n.match(/^(.*?)\s*[\[(]([a-z0-9%\s-]{2,10})[\])]\s*$/)
  if (m) {
    if (m[1].trim()) out.push(m[1].trim())
    out.push(m[2].trim())
  }
  return out
}

export function lookup(rawName, unit = '') {
  const n = canonicalize(rawName)
  if (!n) return null
  const cands = variants(n)
  const urineUnit = UNIT_IS_URINE.test(unit)
  for (const entry of CATALOG) {
    if (!cands.some((c) => entry.match?.some((re) => re.test(c)))) continue
    // Specimen guard: "RBC 4.31 million/cmm" and "RBC 5 /HPF" are different tests.
    if (entry.specimen === 'blood' && urineUnit) continue
    if (entry.specimen === 'urine' && unit && !urineUnit) continue
    return entry
  }
  return null
}
