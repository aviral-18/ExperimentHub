# Database

Normalised relational schema managed by SQLAlchemy 2.0. Runs on **SQLite** out of the box and on **PostgreSQL** by pointing `DATABASE_URL` at Postgres — the models are identical.

## ER diagram

```mermaid
erDiagram
    USERS ||--o{ EXPERIMENTS : owns
    EXPERIMENTS ||--o{ VARIANTS : has
    EXPERIMENTS ||--o{ METRIC_DEFINITIONS : tracks
    EXPERIMENTS ||--o{ SIMULATION_RUNS : "run in"
    EXPERIMENTS ||--o{ STATISTICAL_RESULTS : produces
    EXPERIMENTS ||--o| REPORTS : summarised_by
    SIMULATION_RUNS ||--o{ VARIANT_METRIC_RESULTS : aggregates
    SIMULATION_RUNS ||--o{ SEGMENT_RESULTS : slices

    USERS {
        int id PK
        string email UK
        string full_name
        string role
        string hashed_password
        datetime created_at
    }
    EXPERIMENTS {
        int id PK
        int owner_id FK
        string name
        string key
        string area
        enum status
        string primary_metric_key
        float traffic_allocation
        float control_split
        float expected_lift_pct
        float confidence_level
        float power
        int duration_days
        int total_users
        datetime created_at
        datetime launched_at
    }
    VARIANTS {
        int id PK
        int experiment_id FK
        string name
        enum role
        float true_effect_pct
    }
    METRIC_DEFINITIONS {
        int id PK
        int experiment_id FK
        string key
        string label
        string unit
        enum metric_type
        enum goal
        bool is_primary
    }
    SIMULATION_RUNS {
        int id PK
        int experiment_id FK
        int seed
        int n_users
        enum status
        int duration_ms
        json daily_series
        json funnel
        datetime created_at
    }
    VARIANT_METRIC_RESULTS {
        int id PK
        int run_id FK
        string variant_role
        string metric_key
        int n
        float mean
        float std
        float total
        int successes
        json histogram
    }
    SEGMENT_RESULTS {
        int id PK
        int run_id FK
        string dimension
        string segment
        string metric_key
        float control_mean
        float treatment_mean
        float lift_pct
        float p_value
        bool significant
    }
    STATISTICAL_RESULTS {
        int id PK
        int experiment_id FK
        int run_id FK
        string metric_key
        bool is_primary
        float control_value
        float treatment_value
        float relative_lift_pct
        string test_name
        float p_value
        float ci_low
        float ci_high
        float effect_size
        float achieved_power
        bool significant
    }
    REPORTS {
        int id PK
        int experiment_id FK
        string decision
        float confidence_score
        string headline
        text summary
        string generated_by
        json sections
    }
```

## Table reference

| Table | Purpose | Notable columns |
|---|---|---|
| `users` | Account that owns experiments | `email` (unique), `hashed_password` (pbkdf2_sha256) |
| `experiments` | The central design entity | `status` (draft/running/completed/archived), `primary_metric_key`, design params (`confidence_level`, `power`, `control_split`…) |
| `variants` | Control & treatment arms | `role` (control/treatment), `true_effect_pct` (ground truth the simulator applies) |
| `metric_definitions` | Metrics tracked by an experiment | `metric_type` (proportion/mean), `goal` (increase/decrease), `is_primary` |
| `simulation_runs` | One execution of the pipeline | `seed`, `n_users`, `daily_series` (JSON), `funnel` (JSON) |
| `variant_metric_results` | Aggregated per (variant, metric) | `n`, `mean`, `std`, `successes`, `histogram` (JSON) |
| `segment_results` | Per-segment slice of the primary metric | `dimension`, `segment`, `lift_pct`, `p_value`, `significant` |
| `statistical_results` | Test output per metric | `test_name`, `p_value`, `ci_low/high`, `effect_size`, `achieved_power` |
| `reports` | Executive analysis + decision | `decision`, `confidence_score`, `sections` (JSON narrative + factors) |

## Design notes

- **Aggregates, not raw events.** A run generates 100k+ synthetic users in memory; only aggregates (`variant_metric_results`, `segment_results`) and the run metadata are persisted. Storing raw rows would bloat the DB and mirror no real platform.
- **JSON columns** (`daily_series`, `funnel`, `histogram`, `sections`) hold flexible nested payloads that are read as a unit and never queried by their internals — a good fit for JSON on both SQLite and Postgres.
- **Cascades.** Deleting an experiment cascades to its variants, metrics, runs (and their child aggregates), statistical results and report.
- **Idempotent re-runs.** Re-running an experiment clears the previous run's artefacts first, so results never accumulate stale rows.
