import { api } from "./api";
import type {
  AnalysisResponse,
  AuthToken,
  DashboardData,
  ExperimentCreatePayload,
  ExperimentDetail,
  ExperimentSummary,
  ExperimentTemplate,
  MetricSpec,
  User,
} from "@/types";

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthToken>("/auth/login/json", { email, password }).then((r) => r.data),
  register: (payload: { email: string; full_name: string; password: string; role?: string }) =>
    api.post<AuthToken>("/auth/register", payload).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};

// --- Catalog ---
export const catalogApi = {
  metrics: () => api.get<MetricSpec[]>("/catalog/metrics").then((r) => r.data),
  templates: () => api.get<ExperimentTemplate[]>("/catalog/templates").then((r) => r.data),
  segments: () =>
    api
      .get<Record<string, { label: string; values: string[] }>>("/catalog/segments")
      .then((r) => r.data),
};

// --- Dashboard ---
export const dashboardApi = {
  get: () => api.get<DashboardData>("/dashboard").then((r) => r.data),
};

// --- Experiments ---
export const experimentApi = {
  list: (params?: { status?: string; search?: string; area?: string; sort?: string }) =>
    api.get<ExperimentSummary[]>("/experiments", { params }).then((r) => r.data),
  get: (id: number) => api.get<ExperimentDetail>(`/experiments/${id}`).then((r) => r.data),
  create: (payload: ExperimentCreatePayload) =>
    api.post<ExperimentDetail>("/experiments", payload).then((r) => r.data),
  update: (id: number, payload: Partial<ExperimentCreatePayload>) =>
    api.patch<ExperimentDetail>(`/experiments/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/experiments/${id}`).then((r) => r.data),
  duplicate: (id: number) =>
    api.post<ExperimentDetail>(`/experiments/${id}/duplicate`).then((r) => r.data),
  setStatus: (id: number, status: string) =>
    api
      .post<ExperimentDetail>(`/experiments/${id}/status`, null, { params: { status } })
      .then((r) => r.data),
  run: (id: number, seed?: number) =>
    api
      .post<AnalysisResponse>(`/experiments/${id}/run`, null, { params: { seed } })
      .then((r) => r.data),
  analysis: (id: number) =>
    api.get<AnalysisResponse>(`/experiments/${id}/analysis`).then((r) => r.data),
  exportCsvUrl: (id: number) => `/api/v1/experiments/${id}/export.csv`,
};
