# Lab Report Classifier

A care-provider dashboard for patient documents in `aihealth-server`. It reads
the classification the backend stamps on every document
(`lib/services/document_classification`), then charts the lab results inside the
documents it identifies as lab reports.

## Three views

- **Trends** — every analyte with at least two dated results, pooled across all
  of a patient's lab reports. Flagged analytes first, then furthest outside
  their interval, then most-moved. The shaded band is the reference interval
  from the most recent report.
- **Reports** — one report at a time: results against their reference intervals,
  searchable, filterable by panel, panel or table layout.
- **Documents** — the classifier's own output: doc-type counts, multi-label
  panel distribution, and the per-document evidence trail (anchors matched,
  confidence, engine version).

## Where the numbers come from

Two independent layers, deliberately:

1. **Document type** comes from the backend. The engine classifies from the full
   `text_raw` at upload — which the documents endpoint strips from list
   responses — so the server has seen more of the document than this client
   ever will, and its verdict wins (`docKind` in `src/lib/buildDataset.js`).
   A content heuristic (`classify` in `src/lib/parseReport.js`) is the fallback
   for documents the sweep has not stamped yet, so nothing disappears from the
   UI while a backfill is pending.

2. **Analyte values** are recovered client-side. The stored documents hold
   LLM-extracted *text*, not structured results, so every value is parsed by
   pattern (`parseReport.js`), folded onto canonical analytes across labs
   (`testCatalog.js`), and assembled into the render shape (`buildDataset.js`).
   A row appears only when both a value and a reference interval parse —
   nothing is estimated. Low/normal/high is derived at render time from
   value + interval, never stored, so correcting an interval re-flags every
   historical report.

The value parser, catalog, status logic, and trend components are shared with
the `labreport_dash` project.

## Run

```bash
npm install
npm run dev            # http://localhost:5181, proxies to https://api.aihealth.clinic
AIH_API=http://localhost:8000 npm run dev   # point at a local backend instead
```

Requests go to the relative path `/api/…`, proxied by Vite to the backend — the
browser stays same-origin, so **no CORS change is ever needed server-side**.

## Notes

- New uploads are classified in the ingest flow, before the document reaches
  Mongo. Documents that predate that are stamped by the backfill sweep
  (`scripts/classify_patient_documents.py --write`); until it runs they show as
  "not classified by the backend yet" and fall back to the content heuristic.
- Panel counts are multi-label: one health-package PDF can carry CBC + LFT +
  lipid + thyroid at once, so panel counts can exceed the lab-report total.
- The documents endpoint returns `summary_text` only, and many labs summarise
  just the abnormals — reports built that way are marked "Summary only" and
  may be partial.
- Trends need the same analyte on two dated reports. A patient with one report
  gets a note and a link to the report, not an empty grid.
- The auth token lives in sessionStorage and clears when the tab closes.
