// Domain types mirroring the backend Pydantic schemas.

export type Decision = "launch" | "iterate" | "rollback" | "stop" | "inconclusive";
export type ExperimentStatus = "draft" | "running" | "completed" | "archived";
export type MetricType = "proportion" | "mean";
export type MetricGoal = "increase" | "decrease";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MetricSpec {
  key: string;
  label: string;
  unit: string;
  metric_type: MetricType;
  goal: MetricGoal;
  baseline: number;
  description: string;
  category: string;
}

export interface ExperimentTemplate {
  id: string;
  name: string;
  area: string;
  icon: string;
  primary_metric_key: string;
  secondary_metric_keys: string[];
  control_name: string;
  treatment_name: string;
  hypothesis: string;
  business_objective: string;
  success_criteria: string;
  suggested_effect_pct: number;
}

export interface Variant {
  id: number;
  name: string;
  role: "control" | "treatment";
  description: string;
}

export interface Metric {
  id: number;
  key: string;
  label: string;
  unit: string;
  metric_type: MetricType;
  goal: MetricGoal;
  is_primary: boolean;
}

export interface ExperimentSummary {
  id: number;
  name: string;
  key: string;
  area: string;
  status: ExperimentStatus;
  primary_metric_key: string;
  expected_lift_pct: number;
  total_users: number;
  duration_days: number;
  created_at: string;
  updated_at: string;
  decision?: Decision | null;
  primary_lift_pct?: number | null;
  significant?: boolean | null;
  has_results?: boolean;
}

export interface ExperimentDetail extends ExperimentSummary {
  description: string;
  hypothesis: string;
  business_objective: string;
  success_criteria: string;
  traffic_allocation: number;
  control_split: number;
  confidence_level: number;
  power: number;
  launched_at: string | null;
  variants: Variant[];
  metrics: Metric[];
  has_results: boolean;
}

export interface ExperimentCreatePayload {
  name: string;
  description: string;
  hypothesis: string;
  business_objective: string;
  success_criteria: string;
  area: string;
  primary_metric_key: string;
  secondary_metric_keys: string[];
  control_name: string;
  treatment_name: string;
  treatment_true_effect_pct: number;
  traffic_allocation: number;
  control_split: number;
  expected_lift_pct: number;
  confidence_level: number;
  power: number;
  duration_days: number;
  total_users: number;
}

export interface StatResult {
  metric_key: string;
  metric_type: MetricType;
  is_primary: boolean;
  control_value: number;
  treatment_value: number;
  absolute_diff: number;
  relative_lift_pct: number;
  test_name: string;
  statistic: number;
  p_value: number;
  ci_low: number;
  ci_high: number;
  ci_level: number;
  effect_size: number;
  effect_label: string;
  achieved_power: number;
  mde_abs: number;
  required_sample_per_arm: number;
  significant: boolean;
}

export interface SegmentResult {
  dimension: string;
  segment: string;
  metric_key: string;
  control_n: number;
  control_mean: number;
  treatment_n: number;
  treatment_mean: number;
  lift_pct: number;
  p_value: number;
  significant: boolean;
}

export interface VariantMetric {
  variant_role: "control" | "treatment";
  metric_key: string;
  n: number;
  mean: number;
  std: number;
  total: number;
  successes: number;
  histogram: { bins?: number[]; counts?: number[] };
}

export interface DecisionFactor {
  label: string;
  value: string;
  status: "positive" | "neutral" | "negative";
  detail: string;
  weight: number;
}

export interface Report {
  decision: Decision;
  confidence_score: number;
  headline: string;
  summary: string;
  generated_by: string;
  sections: {
    why_it_won?: string;
    business_impact?: string;
    revenue?: string;
    biases?: string;
    confounders?: string;
    risk?: string;
    recommendation?: string;
    next_experiments?: string[];
    pm_observations?: string[];
    winner?: string;
    srm_failed?: boolean;
    decision_factors?: DecisionFactor[];
    projected_annual_revenue?: number;
  };
}

export interface SimulationRun {
  id: number;
  seed: number;
  n_users: number;
  status: string;
  duration_ms: number;
  daily_series: {
    days?: number[];
    control?: number[];
    treatment?: number[];
    metric_key?: string;
  };
  funnel: {
    control?: { stage: string; count: number }[];
    treatment?: { stage: string; count: number }[];
  };
}

export interface AnalysisResponse {
  experiment_id: number;
  run: SimulationRun;
  report: Report;
  primary_metric_key: string;
  statistical_results: StatResult[];
  segments: SegmentResult[];
  variant_metrics: VariantMetric[];
}

export interface DashboardData {
  totals: {
    total_experiments: number;
    active_experiments: number;
    running_experiments: number;
    completed_experiments: number;
    draft_experiments: number;
    archived_experiments: number;
    successful_launches: number;
    average_lift_pct: number;
    win_rate_pct: number;
    revenue_impact: number;
  };
  recent_experiments: {
    id: number;
    name: string;
    area: string;
    status: ExperimentStatus;
    primary_metric_key: string;
    lift_pct: number | null;
    significant: boolean | null;
    decision: Decision | null;
    updated_at: string;
  }[];
  decision_distribution: Record<string, number>;
  area_summary: { area: string; avg_lift: number; count: number }[];
}
