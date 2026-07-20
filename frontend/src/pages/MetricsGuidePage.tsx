import { BookOpen, Percent, Sigma, Ruler, Zap, Target, Users, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { useMetrics } from "@/hooks/queries";
import { formatMetric } from "@/lib/format";

const METHODS = [
  {
    icon: Percent,
    title: "Two-proportion z-test",
    body: "Compares two rates (conversion, CTR, retention). Uses a pooled standard error under the null that both proportions are equal; the confidence interval uses the unpooled SE. This is the correct test for binary 'did it happen?' metrics.",
  },
  {
    icon: Sigma,
    title: "Welch's two-sample t-test",
    body: "Compares two means (AOV, revenue, session length). Welch's variant doesn't assume equal variances — the safe default for real experiment data where the treatment can change spread as well as centre.",
  },
  {
    icon: Ruler,
    title: "Confidence interval",
    body: "The range of plausible true effects. A 95% CI means: if we repeated the experiment many times, 95% of such intervals would contain the true effect. If it crosses zero, the result is not significant. The CI — not the point estimate — is the honest summary.",
  },
  {
    icon: Target,
    title: "p-value",
    body: "The probability of seeing an effect at least this large if the variants were truly identical. p < 0.05 (at 95% confidence) means the result is unlikely to be pure noise. It is NOT the probability that the treatment works.",
  },
  {
    icon: Zap,
    title: "Effect size (Cohen's d / h)",
    body: "Magnitude of the effect independent of sample size. Significance says 'is there an effect?'; effect size says 'is it big enough to matter?'. A huge sample can make a trivial change significant yet meaningless.",
  },
  {
    icon: Users,
    title: "Statistical power & MDE",
    body: "Power is the chance of detecting a true effect (convention: ≥80%). The Minimum Detectable Effect is the smallest lift the test could reliably catch at a given sample size. A non-significant, under-powered result is inconclusive — not negative.",
  },
  {
    icon: Target,
    title: "Sample size estimation",
    body: "Before launching, we compute how many users per arm are needed to detect the expected lift at the target power and confidence. Under-powering wastes traffic; over-powering delays decisions.",
  },
  {
    icon: ShieldAlert,
    title: "Sample Ratio Mismatch (SRM)",
    body: "A chi-square check that the observed traffic split matches the intended one. A failing SRM signals a broken experiment (randomisation or logging bug) and invalidates every downstream number — the first thing a seasoned analyst checks.",
  },
];

const CATEGORY_ORDER = ["Growth", "Revenue", "Retention", "Engagement", "Operations"];

export default function MetricsGuidePage() {
  const { data: metrics } = useMetrics();

  const grouped = (metrics ?? []).reduce((acc, m) => {
    (acc[m.category] ||= []).push(m);
    return acc;
  }, {} as Record<string, typeof metrics>);

  const categories = Object.keys(grouped).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  );

  return (
    <div>
      <PageHeader
        eyebrow="Reference"
        title="Metrics & Methods Guide"
        description="Every metric this platform tracks, and the statistical methods behind the analysis — explained in plain English."
      />

      {/* Methods */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Sigma className="size-4 text-primary" /> Statistical Methods
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {METHODS.map((m) => (
            <Card key={m.title} hover>
              <CardContent className="flex gap-4 py-5">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <m.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Metric catalog */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <BookOpen className="size-4 text-primary" /> Metric Catalog
        </h2>
        {!metrics ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat}>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{cat}</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {grouped[cat]!.map((m) => (
                    <Card key={m.key} hover>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{m.label}</CardTitle>
                          <Badge variant={m.metric_type === "proportion" ? "info" : "default"}>
                            {m.metric_type === "proportion" ? "z-test" : "t-test"}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          Baseline {formatMetric(m.unit, m.baseline)} · higher is {m.goal === "increase" ? "better" : "worse"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
