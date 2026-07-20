import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  catalogApi,
  dashboardApi,
  experimentApi,
} from "@/services/endpoints";
import type { ExperimentCreatePayload } from "@/types";

export const qk = {
  dashboard: ["dashboard"] as const,
  metrics: ["catalog", "metrics"] as const,
  templates: ["catalog", "templates"] as const,
  segments: ["catalog", "segments"] as const,
  experiments: (filters?: object) => ["experiments", filters ?? {}] as const,
  experiment: (id: number) => ["experiment", id] as const,
  analysis: (id: number) => ["analysis", id] as const,
};

export const useDashboard = () =>
  useQuery({ queryKey: qk.dashboard, queryFn: dashboardApi.get });

export const useMetrics = () =>
  useQuery({ queryKey: qk.metrics, queryFn: catalogApi.metrics, staleTime: Infinity });

export const useTemplates = () =>
  useQuery({ queryKey: qk.templates, queryFn: catalogApi.templates, staleTime: Infinity });

export const useSegments = () =>
  useQuery({ queryKey: qk.segments, queryFn: catalogApi.segments, staleTime: Infinity });

export const useExperiments = (filters?: {
  status?: string;
  search?: string;
  area?: string;
  sort?: string;
}) =>
  useQuery({
    queryKey: qk.experiments(filters),
    queryFn: () => experimentApi.list(filters),
  });

export const useExperiment = (id: number) =>
  useQuery({
    queryKey: qk.experiment(id),
    queryFn: () => experimentApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });

export const useAnalysis = (id: number, enabled = true) =>
  useQuery({
    queryKey: qk.analysis(id),
    queryFn: () => experimentApi.analysis(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
    retry: false,
  });

export function useCreateExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExperimentCreatePayload) => experimentApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiments"] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useRunExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, seed }: { id: number; seed?: number }) => experimentApi.run(id, seed),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.analysis(vars.id) });
      qc.invalidateQueries({ queryKey: qk.experiment(vars.id) });
      qc.invalidateQueries({ queryKey: ["experiments"] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useMutateExperiment() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["experiments"] });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };
  return {
    duplicate: useMutation({
      mutationFn: (id: number) => experimentApi.duplicate(id),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => experimentApi.remove(id),
      onSuccess: invalidate,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: number; status: string }) =>
        experimentApi.setStatus(id, status),
      onSuccess: (_d, vars) => {
        invalidate();
        qc.invalidateQueries({ queryKey: qk.experiment(vars.id) });
      },
    }),
  };
}
