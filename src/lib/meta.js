/**
 * Display metadata for the backend classifier's vocabulary
 * (lib/services/document_classification in aihealth-server).
 *
 * Doc-type colors were validated as a categorical palette in this
 * display order (adjacent-pair CVD separation passes); every use also
 * carries a text label, never color alone.
 */

export const DOC_TYPES = [
  { key: 'lab_report', label: 'Lab reports', color: '#15803d', tint: '#e7f4ec' },
  { key: 'radiology', label: 'Radiology', color: '#1d4ed8', tint: '#e8eefc' },
  { key: 'unclassified', label: 'Unclassified', color: '#b45309', tint: '#f9efe2' },
  { key: 'other', label: 'Other', color: '#7e22ce', tint: '#f3eafa' },
]

export const DOC_TYPE_BY_KEY = Object.fromEntries(DOC_TYPES.map((d) => [d.key, d]))

// Pseudo-type for documents the sweep has not stamped yet.
export const UNSWEPT = { key: 'unswept', label: 'Not swept', color: '#52525b', tint: '#f0f0f1' }

export const PANELS = [
  { key: 'cbc', label: 'CBC / Hematology' },
  { key: 'metabolic_bmp_cmp', label: 'Metabolic (BMP/CMP)' },
  { key: 'lft', label: 'Liver (LFT)' },
  { key: 'kft', label: 'Kidney (KFT/RFT)' },
  { key: 'lipid', label: 'Lipid profile' },
  { key: 'hba1c_glucose', label: 'HbA1c / Glucose' },
  { key: 'thyroid', label: 'Thyroid (TFT)' },
  { key: 'coagulation', label: 'Coagulation' },
  { key: 'cardiac', label: 'Cardiac markers' },
  { key: 'immunology_serology', label: 'Immunology / Serology' },
  { key: 'urinalysis', label: 'Urinalysis' },
  { key: 'micro_culture_sensitivity', label: 'Culture & Sensitivity' },
  { key: 'surgical_pathology', label: 'Surgical pathology' },
  { key: 'cytopathology', label: 'Cytopathology' },
  { key: 'molecular_pcr', label: 'Molecular / PCR' },
  { key: 'other_lab', label: 'Other lab' },
]

export const PANEL_BY_KEY = Object.fromEntries(PANELS.map((p) => [p.key, p]))

export const FAMILY_LABELS = {
  quantitative: 'Quantitative',
  semi_quantitative: 'Semi-quantitative',
  narrative: 'Narrative',
  mixed: 'Mixed',
}

export const docTypeOf = (doc) => doc.classification?.doc_type || 'unswept'

export const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? String(iso)
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
