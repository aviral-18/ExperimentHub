# 🧪 ExperimentOS — Product Experimentation & A/B Testing Platform

> An internal-grade experimentation platform that takes a product idea through the **complete A/B testing lifecycle** — design → simulate 100k+ users → run statistically correct analysis → generate an AI executive report → make a launch decision.

Built to mirror the experimentation tooling used by teams at **Eternal (Zomato), Swiggy, Uber, Airbnb, Meta, Amazon & Google**, and to be explainable end-to-end in a Product Analyst / Data Scientist / PM interview.

<p align="center">
  <img alt="stack" src="https://img.shields.io/badge/frontend-React%20·%20TypeScript%20·%20Vite-7c6cff" />
  <img alt="stack" src="https://img.shields.io/badge/backend-FastAPI%20·%20Python%203.12-22c6e6" />
  <img alt="stats" src="https://img.shields.io/badge/stats-NumPy%20·%20SciPy%20·%20statsmodels-3fcf8e" />
  <img alt="db" src="https://img.shields.io/badge/db-SQLAlchemy%20·%20SQLite%2FPostgres-f0a63a" />
</p>

---

## ✨ What it does

The app simulates the full lifecycle of an experiment:

```
Dashboard → Create Experiment → Configure Metrics → Generate Synthetic Users
  → Run Simulation → Statistical Analysis → AI Insights → Launch Recommendation → Executive Report
```

Every number is **computed, never faked**: a NumPy simulation generates heterogeneous user behaviour, SciPy/statsmodels run the correct hypothesis tests, and a rule-based decision engine turns the statistics + business context into one of five recommendations (**Launch / Iterate / Rollback / Stop / Inconclusive**).

### Highlights

| Area | What's inside |
|---|---|
| **Simulation engine** | 100k+ vectorised synthetic users, per-segment heterogeneity, a coherent behavioural funnel, and treatment effects that propagate realistically across correlated metrics. Runs in ~200ms. |
| **Statistics engine** | Two-proportion z-test, Welch's two-sample t-test, confidence intervals, Cohen's d/h effect sizes, power analysis, minimum detectable effect, sample-size estimation, and a Sample-Ratio-Mismatch (SRM) check. Every result is explained in plain English. |
| **Launch Decision Engine** | Combines significance, power, effect size, projected revenue and **guardrail metrics** into a weighted recommendation + a 0–100 confidence score. |
| **AI Product Analyst** | Generates an executive report (summary, why it happened, business impact, biases, confounders, risk, next experiments, PM-interview observations). Deterministic by default, with optional Anthropic Claude polishing. |
| **Segment analysis** | Per-segment lift across device, user type, membership, city, and age — surfacing heterogeneous treatment effects and Simpson's-paradox traps. |
| **Visualisations** | Metric trends, conversion funnel, confidence-interval forest plot, sampling distributions, segment diverging bars, decision mix, KPI cards — all with a colour-blind-validated palette. |
| **Exports** | Executive **PDF**, **Excel** workbook, and server-generated **CSV**. |

---

## 🖥️ Tech stack

**Frontend** — React 18 · TypeScript · Vite · TailwindCSS · Framer Motion · TanStack Query · React Hook Form · Zod · Recharts
**Backend** — FastAPI · Python 3.12 · SQLAlchemy 2.0 · Pydantic v2 · JWT (PyJWT)
**Analytics** — NumPy · Pandas · SciPy · statsmodels
**Database** — SQLite by default (zero-config), PostgreSQL-ready via `DATABASE_URL`

---

## 🚀 Quick start

You need **Python 3.11+** and **Node 18+**.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

# Run the API (auto-creates the DB and seeds a demo workspace on first boot)
uvicorn app.main:app --reload --port 8010
```

The API is now at **http://127.0.0.1:8010** — interactive docs at **/docs**.

> The default port is **8010** (8000 is often taken). If you change it, set `VITE_API_TARGET` for the frontend (see below).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` → `http://127.0.0.1:8010`.
To point at a different backend: `VITE_API_TARGET=http://127.0.0.1:8000 npm run dev`.

### 3. Log in

A demo workspace with 10 pre-analysed experiments is seeded automatically:

```
Email:    demo@experimentos.io
Password: demo1234
```

Or click **“Explore the demo workspace”** on the login screen.

---

## 📊 The statistics (why it's correct)

This is the part interviewers probe. Every method lives in [`backend/app/statistics/`](backend/app/statistics/) and is documented inline.

- **Rate metrics** (conversion, CTR, retention) → **two-proportion z-test**. The test statistic uses the *pooled* SE (valid under H₀); the confidence interval uses the *unpooled* SE.
- **Continuous metrics** (AOV, revenue, session length) → **Welch's two-sample t-test** (does not assume equal variances — the correct default).
- **Effect size** — Cohen's *h* (proportions) and Cohen's *d* (means), with qualitative bands. Significance ≠ importance.
- **Power & MDE** — achieved power (statsmodels, with a stable normal-approximation fallback) and the minimum detectable effect at the design's sample size. Used to tell a *well-powered null* (→ Stop) from an *under-powered null* (→ Iterate).
- **SRM check** — a chi-square test that the observed traffic split matches the intended one; a failing SRM invalidates the experiment.

Full write-ups: **/metrics** page in the app, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🧠 The simulation & decision engines

- **Simulation** ([`backend/app/simulation/`](backend/app/simulation/)) — draws segment labels, computes per-user latent propensities via segment multipliers, applies the treatment's *true* effect with per-user heterogeneity, then **samples** observed events (clicks, orders, revenue…). Aggregates are persisted; raw events are computed in memory and discarded (the production aggregation pattern).
- **Decision engine** ([`backend/app/services/decision_engine.py`](backend/app/services/decision_engine.py)) — a transparent decision tree over significance / power / materiality / guardrails, plus a projected-annual-revenue extrapolation and a weighted confidence score.

---

## 🗂️ Project structure

```
Experiment/
├── backend/
│   └── app/
│       ├── api/routes/        # auth, experiments, analysis, dashboard, catalog, reports
│       ├── core/              # config + JWT security
│       ├── database/          # engine + session
│       ├── models/            # SQLAlchemy ORM (users, experiments, variants, metrics, runs, results, reports)
│       ├── schemas/           # Pydantic request/response models
│       ├── simulation/        # synthetic-user engine + segments
│       ├── statistics/        # tests, intervals, power, effect size, orchestration
│       ├── services/          # analysis orchestration, decision engine, AI analyst, dashboard
│       ├── utils/             # metric catalog + experiment templates
│       ├── seed.py            # demo workspace
│       └── main.py            # FastAPI app
└── frontend/
    └── src/
        ├── components/        # ui/ (design system), charts/, layout/, common/, experiment/ (tabs)
        ├── pages/             # Login, Dashboard, Experiments, Create, Detail, Compare, MetricsGuide
        ├── hooks/             # auth + TanStack Query hooks
        ├── services/          # axios client + typed endpoints
        ├── lib/               # utils, formatting, decisions/palette, exports (PDF/Excel/CSV)
        └── types/             # shared domain types
```

More detail in [`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md).

---

## 📚 Documentation

| Doc | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, data flow, statistical & decision logic, sequence diagram |
| [`docs/DATABASE.md`](docs/DATABASE.md) | ER diagram + full schema |
| [`docs/API.md`](docs/API.md) | Every endpoint with request/response shapes |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Local setup, PostgreSQL, Docker, production notes |
| [`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md) | Annotated file tree |

---

## 💬 Interview talking points

- **“Significance vs effect size”** — the app reports both, and the AI analyst explicitly flags the “significant but negligible” trap.
- **“Well-powered null vs under-powered null”** — the decision engine uses the *design* MDE (not misleading post-hoc power) to separate *Stop* from *Iterate*.
- **“Guardrail metrics”** — a conversion win that tanks revenue or retention is downgraded, not launched.
- **“Heterogeneous treatment effects”** — segment analysis reveals where a change works, and warns about Simpson's paradox.
- **“SRM”** — the first data-quality check a seasoned analyst runs.

---

## 🔭 Future improvements

- Sequential testing / always-valid p-values (mSPRT) to allow safe peeking
- CUPED variance reduction for higher power at the same traffic
- Bayesian decision framework (probability-to-beat-control, expected loss)
- Multi-armed bandits for adaptive allocation
- Real event ingestion + a warehouse (BigQuery/Snowflake) behind the aggregates
- Multi-variant (A/B/n) experiments and interaction detection

---

## 📄 License

MIT — built as a portfolio project.
