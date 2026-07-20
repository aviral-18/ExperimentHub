import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FlaskConical,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/services/api";

const HIGHLIGHTS = [
  { icon: FlaskConical, title: "Full experiment lifecycle", text: "Design → simulate 100k users → analyse → decide." },
  { icon: BarChart3, title: "Statistically correct", text: "t-tests, z-tests, CIs, power & effect size — done right." },
  { icon: Sparkles, title: "AI Product Analyst", text: "Auto-generated executive analysis for every test." },
  { icon: ShieldCheck, title: "Guardrail-aware decisions", text: "Launch calls that respect revenue & retention." },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "demo@experimentos.io",
    password: "demo1234",
    full_name: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register({ email: form.email, password: form.password, full_name: form.full_name });
      }
      toast.success(mode === "login" ? "Welcome back!" : "Account created");
      navigate("/");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Authentication failed"));
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin() {
    setLoading(true);
    try {
      await login("demo@experimentos.io", "demo1234");
      navigate("/");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Marketing panel */}
      <div className="relative hidden overflow-hidden border-r border-border bg-surface/40 lg:block">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -left-20 top-1/4 size-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-10 bottom-10 size-80 rounded-full bg-accent/15 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <FlaskConical className="size-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold">ExperimentOS</div>
              <div className="text-xs text-muted-foreground">Product Experimentation Platform</div>
            </div>
          </div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-md text-4xl font-bold leading-[1.1] tracking-tight"
            >
              Decide what to launch with{" "}
              <span className="text-gradient">statistical confidence</span>.
            </motion.h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              The internal A/B testing platform that simulates the full experiment lifecycle — from
              hypothesis to executive launch recommendation.
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-2 gap-4">
              {HIGHLIGHTS.map((h, i) => (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                  className="rounded-xl border border-border bg-card/50 p-4"
                >
                  <h.icon className="size-5 text-primary" />
                  <div className="mt-2 text-sm font-semibold">{h.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{h.text}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Trusted patterns from Eternal · Uber · Airbnb · Meta · Amazon experimentation teams.
          </div>
        </div>
      </div>

      {/* Auth form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <FlaskConical className="size-6 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Access your experimentation workspace."
              : "Start running statistically sound experiments."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Aarav Sharma"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <Button variant="secondary" className="mt-3 w-full" onClick={demoLogin} disabled={loading}>
            <Sparkles className="size-4" /> Explore the demo workspace
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              className="font-medium text-primary hover:underline"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
