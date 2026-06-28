import {
  ArrowRight,
  Eye,
  GitBranch,
  Share2,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "WauxAiStudio — Build tools as visual node chains",
  description:
    "Compose tools as a top-to-bottom chain of input, logic, and output nodes with a live, interactive preview. No backend required.",
};

/**
 * Public marketing landing page. Describes the product and routes visitors into
 * the studio (`/studio`) or sign-in (`/login`). Reachable while logged out —
 * the session proxy whitelists `/`.
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- header --- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b-2 border-foreground bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-display text-lg font-bold">WauxAiStudio</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/studio">
              Open studio
              <ArrowRight />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ hero --- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b-2 border-foreground">
      <GridDecor />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col items-start gap-6">
          <span className="nb-surface inline-flex items-center gap-2 bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
            <span className="size-2 animate-pulse rounded-full bg-foreground" />
            No-code tool builder
          </span>

          <h1 className="font-display text-5xl font-bold leading-[1.04] sm:text-6xl">
            Build tools as visual node chains.
          </h1>

          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            WauxAiStudio lets you compose tools as a top-to-bottom chain of
            input, logic, and output nodes — with a live, interactive preview.
            No backend, no boilerplate.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-base">
              <Link href="/studio">
                Start building
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-7 text-base"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <NodeChain />
      </div>
    </section>
  );
}

/** The three product nodes, rendered as a connected vertical chain. */
function NodeChain() {
  const nodes = [
    { label: "Text input", marker: "bg-ring", rotate: "-1.5deg" },
    { label: "Transform with AI", marker: "bg-primary", rotate: "1.5deg" },
    { label: "Live preview", marker: "bg-chart-4", rotate: "-1deg" },
  ] as const;

  return (
    <div
      className="relative mx-auto hidden w-full max-w-xs flex-col items-center gap-5 lg:flex"
      aria-hidden
    >
      {/* Continuous spine behind the cards. Cards have an opaque bg, so the line
          only shows through the gaps — the per-card rotation can't break it. */}
      <span className="absolute inset-y-6 left-1/2 z-0 w-0.5 -translate-x-1/2 bg-foreground" />

      {nodes.map((node) => (
        <div
          key={node.label}
          className="node-card nb-surface relative z-10 flex w-full items-center gap-3 bg-card px-4 py-3.5"
          style={{ "--r": node.rotate } as CSSProperties}
        >
          <span
            className={cn(
              "size-3.5 shrink-0 border-2 border-foreground",
              node.marker,
            )}
          />
          <span className="font-display text-sm font-bold">{node.label}</span>
          <span className="ml-auto flex gap-1">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- features --- */

const FEATURES = [
  {
    icon: Workflow,
    accent: "bg-chart-3",
    title: "Node-chain editor",
    body: "Drag input, logic, and output nodes into a clear top-to-bottom flow. Every tool reads like a recipe.",
  },
  {
    icon: Eye,
    accent: "bg-chart-4",
    title: "Live preview",
    body: "See results as you build. The preview pane runs your chain instantly on every change — no deploy step.",
  },
  {
    icon: Sparkles,
    accent: "bg-chart-5",
    title: "AI-powered nodes",
    body: "Drop in AI transform nodes with your own key. Summarize, classify, rewrite, or generate inside any chain.",
  },
  {
    icon: Zap,
    accent: "bg-chart-1",
    title: "No backend required",
    body: "Tools run in the browser. Bring an API key when you need one — there is nothing to host or maintain.",
  },
  {
    icon: Share2,
    accent: "bg-chart-2",
    title: "Share with a link",
    body: "Publish any tool as a public share link. Anyone can use it — no account, no setup on their side.",
  },
  {
    icon: GitBranch,
    accent: "bg-ring",
    title: "17+ node types",
    body: "Inputs, logic, website and site-proxy nodes, and more — composed into whatever workflow you need.",
  },
] as const;

function Features() {
  return (
    <section className="border-b-2 border-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mb-12 flex flex-col gap-3">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Everything you need to ship a tool.
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            From the first input to the shared link, WauxAiStudio keeps the
            whole loop in one place.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, accent, title, body }) => (
            <article
              key={title}
              className="nb-surface flex flex-col gap-3 bg-card p-6"
            >
              <span
                className={cn(
                  "inline-flex size-11 items-center justify-center border-2 border-foreground",
                  accent,
                )}
              >
                <Icon className="size-5 text-foreground" />
              </span>
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- how-it-works -- */

const STEPS = [
  {
    n: "01",
    title: "Add an input",
    body: "Start the chain with text, a number, a file, or a website to pull data from.",
  },
  {
    n: "02",
    title: "Chain your logic",
    body: "Stack transform, AI, and logic nodes. Each node feeds the next, top to bottom.",
  },
  {
    n: "03",
    title: "Preview & share",
    body: "Watch it run live, then publish a share link so anyone can use your tool.",
  },
] as const;

function HowItWorks() {
  return (
    <section className="border-b-2 border-foreground bg-secondary">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="mb-12 font-display text-3xl font-bold sm:text-4xl">
          Three steps from idea to tool.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="nb-surface flex flex-col gap-3 bg-card p-6"
            >
              <span className="font-display text-4xl font-bold text-primary">
                {step.n}
              </span>
              <h3 className="font-display text-lg font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- cta band --- */

function CtaBand() {
  return (
    <section className="border-b-2 border-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="nb-surface-lg flex flex-col items-center gap-6 bg-primary px-8 py-14 text-center text-primary-foreground">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Build your first tool in minutes.
          </h2>
          <p className="max-w-xl text-primary-foreground/90">
            Open the studio and start chaining nodes. No install, no setup.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-12 px-7 text-base"
          >
            <Link href="/studio">
              Open the studio
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- footer --- */

function SiteFooter() {
  return (
    <footer className="bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="font-display text-sm font-bold">WauxAiStudio</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Build tools as visual node chains.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ decor -- */

/**
 * Animated hero backdrop: a slowly panning dotted grid with a few brutalist
 * shapes drifting over it. Pure decoration — pointer-events off, aria-hidden,
 * and frozen by the global `prefers-reduced-motion` rule.
 */
function GridDecor() {
  const shapes = [
    {
      className: "left-[8%] top-[18%] size-16 bg-primary",
      rot: "-12deg",
      dur: "11s",
      delay: "0s",
    },
    {
      className: "right-[12%] top-[12%] size-10 rounded-full bg-chart-4",
      rot: "0deg",
      dur: "9s",
      delay: "1.2s",
    },
    {
      className: "left-[22%] bottom-[14%] size-12 bg-ring",
      rot: "18deg",
      dur: "13s",
      delay: "0.6s",
    },
    {
      className: "right-[18%] bottom-[20%] size-14 rounded-full bg-chart-3",
      rot: "0deg",
      dur: "10s",
      delay: "2s",
    },
    {
      className: "right-[32%] top-[44%] size-8 bg-chart-5",
      rot: "24deg",
      dur: "8s",
      delay: "0.3s",
    },
  ] as const;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Panning dotted grid. */}
      <div
        className="animate-grid-pan absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(var(--foreground) 1.2px, transparent 1.2px)",
          backgroundSize: "26px 26px",
        }}
      />
      {/* Drifting brutalist shapes. */}
      {shapes.map((s, i) => (
        <span
          key={i}
          className={cn(
            "animate-float absolute border-2 border-foreground opacity-20",
            s.className,
          )}
          style={
            {
              "--nb-float-rot": s.rot,
              "--nb-float-dur": s.dur,
              "--nb-float-delay": s.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
