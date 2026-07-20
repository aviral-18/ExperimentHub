import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Check,
  Loader2,
  FlaskConical,
  Rocket,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/misc";
import { useMetrics, useTemplates, useCreateExperiment, useRunExperiment } from "@/hooks/queries";
import { apiErrorMessage } from "@/services/api";
import { formatCompact } from "@/lib/format";
import type { ExperimentTemplate } from "@/types";

const schema = z.object({
  name: z.string().min(3, "Give it a descriptive name"),
  area: z.string().min(1),
  hypothesis: z.string().optional().default(""),
  business_objective: z.string().optional().default(""),
  success_criteria: z.string().optional().default(""),
  primary_metric_key: z.string().min(1),
  control_name: z.string().min(1),
  treatment_name: z.string().min(1),
  treatment_true_effect_pct: z.coerce.number().min(-50).max(50),
  traffic_allocation: z.coerce.number().min(0.05).max(1),
  control_split: z.coerce.number().min(0.1).max(0.9),
  expected_lift_pct: z.coerce.number().min(0.5).max(100),
  confidence_level: z.coerce.number().min(0.8).max(0.99),
  power: z.coerce.number().min(0.5).max(0.99),
  duration_days: z.coerce.number().int().min(1).max(120),
  total_users: z.coerce.number().int().min(2000).max(2_000_000),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  name: "",
  area: "Checkout",
  hypothesis: "",
  business_objective: "",
  success_criteria: "",
  primary_metric_key: "conversion_rate",
  control_name: "Control",
  treatment_name: "Treatment",
  treatment_true_effect_pct: 5,
  traffic_allocation: 1,
  control_split: 0.5,
  expected_lift_pct: 5,
  confidence_level: 0.95,
  power: 0.8,
  duration_days: 14,
  total_users: 100000,
};

export default function CreateExperimentPage() {
  const navigate = useNavigate();
  const { data: templates } = useTemplates();
  const { data: metrics } = useMetrics();
  const createMut = useCreateExperiment();
  const runMut = useRunExperiment();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [runNow, setRunNow] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  const values = watch();
  const secondary = watch("primary_metric_key");
  const [secondaryKeys, setSecondaryKeys] = useState<string[]>([]);

  function applyTemplate(t: ExperimentTemplate) {
    setSelectedTemplate(t.id);
    reset({
      ...DEFAULTS,
      name: t.name,
      area: t.area,
      hypothesis: t.hypothesis,
      business_objective: t.business_objective,
      success_criteria: t.success_criteria,
      primary_metric_key: t.primary_metric_key,
      control_name: t.control_name,
      treatment_name: t.treatment_name,
      treatment_true_effect_pct: t.suggested_effect_pct,
      expected_lift_pct: Math.abs(t.suggested_effect_pct),
    });
    setSecondaryKeys(t.secondary_metric_keys);
  }

  function toggleSecondary(key: string) {
    setSecondaryKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function onSubmit(v: FormValues) {
    try {
      const payload = {
        ...v,
        description: v.hypothesis,
        secondary_metric_keys: secondaryKeys.filter((k) => k !== v.primary_metric_key),
      };
      const exp = await createMut.mutateAsync(payload);
      toast.success("Experiment created");
      if (runNow) {
        toast.promise(runMut.mutateAsync({ id: exp.id }), {
          loading: "Simulating 100k users & analysing…",
          success: "Analysis ready",
          error: (e) => apiErrorMessage(e),
        });
      }
      navigate(`/experiments/${exp.id}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not create experiment"));
    }
  }

  const primaryMetric = metrics?.find((m) => m.key === values.primary_metric_key);
  const perArm = Math.round((values.total_users * (runNow ? 1 : 1)) / 2);

  return (
    <div>
      <PageHeader
        eyebrow="New Experiment"
        title="Design an Experiment"
        description="Start from a proven template or configure from scratch. Every field maps to a real experimentation decision."
      />

      {/* Template gallery */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Wand2 className="size-4 text-primary" /> Start from a template
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {templates?.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className={`group rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 ${
                selectedTemplate === t.id
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-surface/40 hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <FlaskConical className={`size-4 ${selectedTemplate === t.id ? "text-primary" : "text-muted-foreground"}`} />
                {selectedTemplate === t.id && <Check className="size-4 text-primary" />}
              </div>
              <div className="mt-2 text-xs font-semibold leading-tight">{t.name}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{t.area}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main config */}
        <div className="space-y-6 lg:col-span-2">
          {/* Definition */}
          <Card>
            <CardHeader>
              <CardTitle>Definition</CardTitle>
              <CardDescription>What are you testing and why?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Experiment name" error={errors.name?.message}>
                <Input {...register("name")} placeholder="e.g. New Checkout Flow" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Product area">
                  <Select {...register("area")}>
                    {["Checkout", "Growth", "Discovery", "Homepage", "Search", "Pricing", "Payments", "Menu"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Expected lift (MDE %)" hint="The smallest lift you care about detecting.">
                  <Input type="number" step="0.5" {...register("expected_lift_pct")} />
                </Field>
              </div>
              <Field label="Hypothesis" hint="If we change X, then metric Y will improve because Z.">
                <Textarea {...register("hypothesis")} placeholder="If we simplify checkout to a single page, checkout conversion will increase because we remove friction." />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Business objective">
                  <Textarea {...register("business_objective")} className="min-h-[70px]" />
                </Field>
                <Field label="Success criteria">
                  <Textarea {...register("success_criteria")} className="min-h-[70px]" />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>Control (baseline) vs treatment (the change).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Control name">
                  <Input {...register("control_name")} />
                </Field>
                <Field label="Treatment name">
                  <Input {...register("treatment_name")} />
                </Field>
              </div>
              <Field
                label={`Simulated true effect: ${values.treatment_true_effect_pct > 0 ? "+" : ""}${values.treatment_true_effect_pct}%`}
                hint="The ground-truth effect the simulator applies to the treatment — what your analysis will try to discover. Set negative to model a regression."
              >
                <input
                  type="range"
                  min={-20}
                  max={20}
                  step={0.5}
                  {...register("treatment_true_effect_pct")}
                  className="w-full accent-[hsl(var(--primary))]"
                />
              </Field>
            </CardContent>
          </Card>

          {/* Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>Pick the primary decision metric and supporting/guardrail metrics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Primary metric">
                <Select {...register("primary_metric_key")}>
                  {metrics?.map((m) => (
                    <option key={m.key} value={m.key}>{m.label} ({m.category})</option>
                  ))}
                </Select>
              </Field>
              {primaryMetric && (
                <p className="rounded-lg border border-border bg-surface/40 p-3 text-xs text-muted-foreground">
                  <Info className="mr-1 inline size-3.5 text-primary" />
                  {primaryMetric.description} Analysed with a{" "}
                  <span className="font-medium text-foreground">
                    {primaryMetric.metric_type === "proportion" ? "two-proportion z-test" : "two-sample t-test"}
                  </span>.
                </p>
              )}
              <div>
                <Label>Secondary & guardrail metrics</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {metrics
                    ?.filter((m) => m.key !== secondary)
                    .map((m) => {
                      const on = secondaryKeys.includes(m.key);
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => toggleSecondary(m.key)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            on
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                          }`}
                        >
                          {on && <Check className="mr-1 inline size-3" />}
                          {m.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Design */}
          <Card>
            <CardHeader>
              <CardTitle>Statistical Design</CardTitle>
              <CardDescription>Traffic, duration and the rigor of the test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Confidence level">
                  <Select {...register("confidence_level")}>
                    <option value={0.9}>90%</option>
                    <option value={0.95}>95%</option>
                    <option value={0.99}>99%</option>
                  </Select>
                </Field>
                <Field label="Target power">
                  <Select {...register("power")}>
                    <option value={0.8}>80%</option>
                    <option value={0.9}>90%</option>
                    <option value={0.95}>95%</option>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Total users">
                  <Select {...register("total_users")}>
                    <option value={20000}>20,000</option>
                    <option value={50000}>50,000</option>
                    <option value={100000}>100,000</option>
                    <option value={200000}>200,000</option>
                    <option value={500000}>500,000</option>
                  </Select>
                </Field>
                <Field label="Duration (days)">
                  <Input type="number" {...register("duration_days")} />
                </Field>
              </div>
              <Field label={`Control / Treatment split: ${Math.round(values.control_split * 100)}% / ${Math.round((1 - values.control_split) * 100)}%`}>
                <input type="range" min={0.1} max={0.9} step={0.05} {...register("control_split")} className="w-full accent-[hsl(var(--primary))]" />
              </Field>
              <Field label={`Traffic allocation: ${Math.round(values.traffic_allocation * 100)}% of eligible users`}>
                <input type="range" min={0.05} max={1} step={0.05} {...register("traffic_allocation")} className="w-full accent-[hsl(var(--primary))]" />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Sticky summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-gradient-to-br from-primary/10 to-accent/5 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" /> Design Summary
                </div>
              </div>
              <CardContent className="space-y-3 pt-5 text-sm">
                <SummaryRow label="Primary metric" value={primaryMetric?.label ?? "—"} />
                <SummaryRow label="Secondary metrics" value={`${secondaryKeys.length} selected`} />
                <SummaryRow label="Users per arm" value={`~${formatCompact(perArm)}`} />
                <SummaryRow label="Confidence" value={`${Math.round(values.confidence_level * 100)}%`} />
                <SummaryRow label="Power target" value={`${Math.round(values.power * 100)}%`} />
                <SummaryRow label="Duration" value={`${values.duration_days} days`} />
                <div className="rounded-lg border border-border bg-surface/40 p-3 text-xs text-muted-foreground">
                  <Info className="mr-1 inline size-3.5 text-primary" />
                  The engine simulates {formatCompact(values.total_users)} heterogeneous users, computes the correct
                  statistical test, and produces a launch recommendation.
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-3">
                  <input type="checkbox" checked={runNow} onChange={(e) => setRunNow(e.target.checked)} className="size-4 accent-[hsl(var(--primary))]" />
                  <span className="text-sm">
                    <span className="font-medium">Run analysis immediately</span>
                    <span className="block text-xs text-muted-foreground">Simulate & analyse right after creating.</span>
                  </span>
                </label>

                <Button type="submit" className="w-full" disabled={createMut.isPending}>
                  {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                  Create Experiment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {hint && (
          <Tooltip content={<span className="max-w-[240px] block">{hint}</span>}>
            <Info className="size-3.5 text-muted-foreground/70" />
          </Tooltip>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tnum">{value}</span>
    </div>
  );
}
