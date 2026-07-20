# API Reference

Base URL: `http://127.0.0.1:8010/api/v1`
Interactive docs (Swagger UI): `http://127.0.0.1:8010/docs`

All endpoints except `/auth/*` and `/catalog/*` require a bearer token:
`Authorization: Bearer <access_token>`.

---

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/auth/register` | `{ email, full_name, password, role? }` | `{ access_token, token_type, user }` |
| `POST` | `/auth/login` | form: `username`(email), `password` (OAuth2) | `{ access_token, token_type, user }` |
| `POST` | `/auth/login/json` | `{ email, password }` | `{ access_token, token_type, user }` |
| `GET` | `/auth/me` | — | `{ id, email, full_name, role }` |

```bash
curl -X POST http://127.0.0.1:8010/api/v1/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@experimentos.io","password":"demo1234"}'
```

---

## Catalog (reference data, public)

| Method | Path | Returns |
|---|---|---|
| `GET` | `/catalog/metrics` | 18 metric specs `{ key, label, unit, metric_type, goal, baseline, description, category }` |
| `GET` | `/catalog/templates` | 10 experiment templates |
| `GET` | `/catalog/segments` | segment dimensions `{ dim: { label, values[] } }` |

---

## Dashboard

| Method | Path | Returns |
|---|---|---|
| `GET` | `/dashboard` | `{ totals, recent_experiments[], decision_distribution, area_summary[] }` |

---

## Experiments

| Method | Path | Notes |
|---|---|---|
| `GET` | `/experiments` | Query: `status`, `area`, `search`, `sort` (`recent`\|`name`\|`lift`). Returns summaries enriched with `decision`, `primary_lift_pct`, `significant`, `has_results`. |
| `POST` | `/experiments` | Create. Body = `ExperimentCreate` (see below). Returns `ExperimentDetail`. |
| `GET` | `/experiments/{id}` | Full detail incl. variants + metrics. |
| `PATCH` | `/experiments/{id}` | Partial update of design fields. |
| `DELETE` | `/experiments/{id}` | `204`. Cascades to all results. |
| `POST` | `/experiments/{id}/duplicate` | Clone the design as a fresh draft. |
| `POST` | `/experiments/{id}/status?status=` | Set `draft`\|`running`\|`completed`\|`archived`. |

### `ExperimentCreate` body

```jsonc
{
  "name": "New Checkout Flow",
  "description": "", "hypothesis": "", "business_objective": "", "success_criteria": "",
  "area": "Checkout",
  "primary_metric_key": "checkout_conversion",
  "secondary_metric_keys": ["conversion_rate", "aov", "arpu"],
  "control_name": "Current Checkout",
  "treatment_name": "Redesigned Checkout",
  "treatment_true_effect_pct": 6.0,   // ground truth the simulator applies
  "traffic_allocation": 1.0,          // 0–1 of eligible traffic
  "control_split": 0.5,               // share to control
  "expected_lift_pct": 5.0,           // MDE the PM is powering for
  "confidence_level": 0.95,
  "power": 0.8,
  "duration_days": 14,
  "total_users": 100000
}
```

---

## Analysis

| Method | Path | Notes |
|---|---|---|
| `POST` | `/experiments/{id}/run?seed=` | Runs simulation → statistics → decision → narrative, persists everything, returns `AnalysisResponse`. |
| `GET` | `/experiments/{id}/analysis` | Fetch the latest `AnalysisResponse`. `404` if not run yet. |

### `AnalysisResponse` shape

```jsonc
{
  "experiment_id": 1,
  "primary_metric_key": "checkout_conversion",
  "run": { "id", "seed", "n_users", "duration_ms", "daily_series", "funnel" },
  "report": {
    "decision": "launch",
    "confidence_score": 84.0,
    "headline": "...",
    "summary": "...",
    "generated_by": "rule-engine",
    "sections": { "why_it_won", "business_impact", "risk", "biases", "confounders",
                  "recommendation", "next_experiments": [], "pm_observations": [],
                  "decision_factors": [], "projected_annual_revenue": 0 }
  },
  "statistical_results": [ { "metric_key", "control_value", "treatment_value",
      "relative_lift_pct", "test_name", "p_value", "ci_low", "ci_high",
      "effect_size", "effect_label", "achieved_power", "significant", ... } ],
  "segments": [ { "dimension", "segment", "control_mean", "treatment_mean",
      "lift_pct", "p_value", "significant" } ],
  "variant_metrics": [ { "variant_role", "metric_key", "n", "mean", "std",
      "successes", "histogram" } ]
}
```

---

## Reports / export

| Method | Path | Returns |
|---|---|---|
| `GET` | `/experiments/{id}/export.csv` | `text/csv` attachment of all statistical results. |

> Excel (`.xlsx`) and executive PDF are generated **client-side** (`frontend/src/lib/exports.ts`) from the `AnalysisResponse`.

---

## System

| Method | Path | Returns |
|---|---|---|
| `GET` | `/health` | `{ status, app, version }` |
| `GET` | `/api/v1/health` | `{ status }` |
