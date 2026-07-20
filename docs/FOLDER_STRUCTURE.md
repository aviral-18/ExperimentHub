# Folder Structure

```
Experiment/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md          # system design, data flow, engines, diagrams
│   ├── DATABASE.md              # ER diagram + schema reference
│   ├── API.md                   # endpoint reference
│   ├── DEPLOYMENT.md            # setup, Postgres, Docker, production
│   └── FOLDER_STRUCTURE.md      # this file
│
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py              # FastAPI app: routers, CORS, table create, auto-seed
│       ├── seed.py              # demo workspace (10 experiments, all decision types)
│       │
│       ├── core/
│       │   ├── config.py        # pydantic-settings configuration
│       │   └── security.py      # password hashing + JWT
│       │
│       ├── database/
│       │   └── session.py       # engine, SessionLocal, Base, get_db dependency
│       │
│       ├── models/              # SQLAlchemy 2.0 ORM (one entity per file)
│       │   ├── user.py
│       │   ├── experiment.py
│       │   ├── variant.py
│       │   ├── metric.py
│       │   ├── simulation.py    # SimulationRun, VariantMetricResult, SegmentResult
│       │   ├── result.py        # StatisticalResult, DecisionType
│       │   └── report.py
│       │
│       ├── schemas/             # Pydantic request/response contracts
│       │   ├── auth.py
│       │   ├── experiment.py
│       │   └── results.py
│       │
│       ├── statistics/          # pure computation — no web/db knowledge
│       │   ├── tests.py         # two-proportion z-test, Welch's t-test
│       │   ├── effect_size.py   # Cohen's d / h
│       │   ├── power.py         # power, MDE, sample size (statsmodels + fallback)
│       │   └── engine.py        # analyze_metric → full result + plain-English text
│       │
│       ├── simulation/
│       │   ├── segments.py      # segment mix + latent propensity model
│       │   └── engine.py        # vectorised 100k-user simulation
│       │
│       ├── services/            # orchestration & business logic
│       │   ├── analysis_service.py   # run pipeline + persist
│       │   ├── decision_engine.py    # launch recommendation
│       │   ├── ai_analyst.py         # executive narrative (+ optional Claude)
│       │   ├── experiment_service.py # create / duplicate / status
│       │   └── dashboard_service.py  # portfolio KPIs
│       │
│       ├── api/
│       │   ├── deps.py          # current-user dependency
│       │   └── routes/          # auth, experiments, analysis, dashboard, catalog, reports
│       │
│       └── utils/
│           ├── metrics_catalog.py    # 18-metric catalog (single source of truth)
│           └── templates.py          # 10 experiment templates
│
└── frontend/
    ├── index.html
    ├── vite.config.ts           # dev proxy + build chunking
    ├── tailwind.config.js       # dark-enterprise theme tokens
    └── src/
        ├── main.tsx             # providers: Query, Router, Auth, Toaster
        ├── App.tsx              # routes + protected shell + ErrorBoundary
        ├── index.css            # design tokens (CSS variables), glass utilities
        │
        ├── components/
        │   ├── ui/              # design system: button, card, badge, input, tabs, dialog, menu, misc
        │   ├── charts/          # TrendChart, ConfidenceIntervalChart, DistributionChart,
        │   │                    #   FunnelChart, SegmentChart, ComparisonChart, DonutChart, Sparkline
        │   ├── layout/          # Sidebar, AppShell
        │   ├── common/          # StatCard, ExperimentCard, Badges, PageHeader, EmptyState, ErrorBoundary
        │   └── experiment/      # detail tabs: Overview, Statistics, Segments, Insights, Decision, ResultHero
        │
        ├── pages/               # Login, Dashboard, Experiments, CreateExperiment,
        │                        #   ExperimentDetail, Compare, MetricsGuide
        ├── hooks/               # useAuth, queries (TanStack Query)
        ├── services/            # api (axios) + endpoints (typed)
        ├── lib/                 # utils, format, decisions (palette), exports (PDF/Excel/CSV)
        └── types/               # shared domain types
```

## Conventions

- **No monolithic files** — one ORM entity, one chart, one page per file.
- **Pure analytics** — `statistics/` and `simulation/` never import FastAPI or SQLAlchemy.
- **Single source of truth** — metric definitions live once in `utils/metrics_catalog.py` and are consumed by the simulation, statistics, API and frontend.
- **Typed end-to-end** — Pydantic on the backend, TypeScript types mirroring them on the frontend.
