# Lab Report Classifier UI

A care-provider dashboard for the **rule-based document classifier** in
`aihealth-server` (`lib/services/document_classification`). It shows each
patient's uploaded documents sorted by the classifier: lab reports (with
multi-label panel subtypes), radiology, other documents, and anything the
sweep hasn't stamped yet — including the per-document evidence trail
(anchors matched, result lines, confidence, engine version).

## How it works

- Sign in with a care-provider account
  (`POST /v1/auth/care-provider/email-login`).
- Search patients (`GET /care-providers/patients?search=`).
- Fetch all their documents
  (`GET /care-providers/patients/{id}/documents`) — the response includes
  the `classification` field stamped by
  `scripts/classify_patient_documents.py --write`; no extra backend
  endpoints are needed.
- Filtering by doc type / panel happens client-side on that field.

Requests go to the relative path `/api/…`, proxied by Vite to the backend
— the browser stays same-origin, so **no CORS change is ever needed
server-side**.

## Run

```bash
npm install
npm run dev            # http://localhost:5181, proxies to https://api.aihealth.clinic
AIH_API=http://localhost:8000 npm run dev   # point at a local backend instead
```

## Notes

- Documents without a `classification` field show as "Not classified yet"
  with a hint to run the sweep.
- Panel counts are multi-label: one health-package PDF can carry CBC +
  LFT + lipid + thyroid at once, so panel counts can exceed the
  lab-report total.
- The auth token lives in sessionStorage and clears when the tab closes.
