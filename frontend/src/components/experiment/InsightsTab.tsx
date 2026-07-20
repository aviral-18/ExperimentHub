import { motion } from "framer-motion";
import {
  Sparkles,
  Trophy,
  IndianRupee,
  AlertTriangle,
  Shuffle,
  ShieldAlert,
  Lightbulb,
  GraduationCap,
  ScrollText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Report } from "@/types";

/** Lightweight inline markdown (bold + emphasis) for narrative prose. */
function RichText({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground font-semibold'>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em class='text-foreground/90'>$1</em>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const SECTIONS: { key: keyof Report["sections"]; title: string; icon: React.ElementType }[] = [
  { key: "why_it_won", title: "Why this happened", icon: Trophy },
  { key: "business_impact", title: "Business impact", icon: IndianRupee },
  { key: "revenue", title: "Revenue implications", icon: IndianRupee },
  { key: "biases", title: "Potential biases", icon: AlertTriangle },
  { key: "confounders", title: "Confounding variables", icon: Shuffle },
  { key: "risk", title: "Risk assessment", icon: ShieldAlert },
];

export function InsightsTab({ report }: { report: Report }) {
  const s = report.sections;

  return (
    <div className="space-y-6">
      {/* AI summary hero */}
      <Card className="overflow-hidden border-primary/25">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-accent/5 to-transparent px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-primary" /> AI Product Analyst
            </div>
            <Badge variant={report.generated_by === "anthropic" ? "default" : "secondary"}>
              {report.generated_by === "anthropic" ? "Claude-generated" : "Analyst engine"}
            </Badge>
          </div>
        </div>
        <CardContent className="pt-5">
          <p className="text-[15px] leading-relaxed text-foreground/90">
            <RichText text={report.summary} />
          </p>
        </CardContent>
      </Card>

      {/* Narrative grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SECTIONS.filter((sec) => s[sec.key]).map((sec, i) => (
          <motion.div
            key={sec.key as string}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <sec.icon className="size-4 text-primary" /> {sec.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <RichText text={s[sec.key] as string} />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* PM observations */}
      {s.pm_observations?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" /> PM Interview Observations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.pm_observations.map((obs, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border bg-surface/40 p-3.5">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  <RichText text={obs} />
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Next experiments */}
      {s.next_experiments?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-primary" /> Suggested Next Experiments
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {s.next_experiments.map((idea, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border p-3.5 transition-colors hover:border-primary/40">
                <ScrollText className="mt-0.5 size-4 shrink-0 text-accent" />
                <p className="text-sm leading-relaxed text-muted-foreground">{idea}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
