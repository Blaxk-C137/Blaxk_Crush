import Link from "next/link";
import {
  ArrowRight,
  EyeOff,
  FileText,
  Link2,
  ScanFace,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { AnimatedShinyText } from "@/components/magic/animated-shiny-text";
import { BlurFade } from "@/components/magic/blur-fade";
import { BorderBeam } from "@/components/magic/border-beam";
import { DotPattern } from "@/components/magic/dot-pattern";
import { NumberTicker } from "@/components/magic/number-ticker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { cn } from "@/lib/utils";

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Sign in to your account</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/auth/login">Post a position</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(560px_circle_at_center,white,transparent)]"
        )}
      />
      <div className="container relative flex flex-col items-center py-24 text-center sm:py-32">
        <BlurFade delay={0.05}>
          <div className="rounded-full border bg-background/60 px-4 py-1.5 text-xs font-medium uppercase tracking-widest shadow-sm">
            <AnimatedShinyText className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Professional partner acquisition
            </AnimatedShinyText>
          </div>
        </BlurFade>

        <BlurFade delay={0.15}>
          <h1 className="mt-6 max-w-3xl text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Hire your next great{" "}
            <span className="text-gradient bg-gradient-to-r from-brand to-indigo-400">
              relationship.
            </span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.25}>
          <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            Post a position, share your application portal, and review
            candidates on your own terms. No feeds. No swiping. Just a clean
            pipeline.
          </p>
        </BlurFade>

        <BlurFade delay={0.35}>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/auth/login">
              <ShimmerButton className="h-11 px-8 text-sm font-medium">
                Post a position
                <ArrowRight className="ml-2 h-4 w-4" />
              </ShimmerButton>
            </Link>
            <Button variant="outline" size="lg" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: EyeOff,
    title: "Anonymous by default",
    body: "Candidates apply without an account. You see their cover letter and character first — name, photo, and contact details stay sealed until review.",
    beam: false,
  },
  {
    icon: ScanFace,
    title: "Controlled, one-way reveal",
    body: "You decide when identity enters the picture. Revealing an applicant is permanent and one-way — the pacing is entirely yours.",
    beam: true,
  },
  {
    icon: Link2,
    title: "Link-only distribution",
    body: "Every position has a private application portal. There is no browse feed and no discovery — share the link exactly where you want it.",
    beam: false,
  },
];

function Features() {
  return (
    <section className="border-y bg-muted/40 py-20">
      <div className="container">
        <BlurFade>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Built for intentional hiring
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Everything about the pipeline is deliberate — from anonymity to
            the permanent reveal.
          </p>
        </BlurFade>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <BlurFade key={f.title} delay={0.1 * (i + 1)} inView>
              <Card className="relative h-full overflow-hidden bg-background">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                    <f.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="pt-3 text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </CardContent>
                {f.beam && <BorderBeam size={160} duration={12} />}
              </Card>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: FileText,
    step: "01",
    title: "Post a position",
    body: "Describe the role in your own words — key requirements, preferred qualifications, compensation package.",
  },
  {
    icon: Link2,
    step: "02",
    title: "Share your application portal",
    body: "Drop the link in your bio, group chats, or DMs. Candidates apply in under two minutes, no account required.",
  },
  {
    icon: UserCheck,
    step: "03",
    title: "Review candidates",
    body: "Shortlist, reject, or reveal — one decision at a time, entirely at your pace.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container">
        <BlurFade>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            How it works
          </h2>
        </BlurFade>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <BlurFade key={s.step} delay={0.1 * (i + 1)} inView>
              <div className="relative">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-brand">
                    {s.step}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background shadow-sm">
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.2} inView>
          <div className="mt-20 grid grid-cols-1 overflow-hidden rounded-xl border bg-primary text-primary-foreground sm:grid-cols-3">
            {[
              { value: 0, label: "swipes involved" },
              { value: 1, label: "link per position" },
              { value: 100, suffix: "%", label: "anonymous until you review" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 border-b border-white/10 px-6 py-10 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <span className="text-4xl font-bold">
                  <NumberTicker value={stat.value} />
                  {stat.suffix ?? ""}
                </span>
                <span className="text-sm text-primary-foreground/70">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </BlurFade>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="border-t bg-muted/40 py-20">
      <div className="container flex flex-col items-center text-center">
        <BlurFade inView>
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            The position is open. Are you accepting applications?
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Set up your first position in under three minutes.
          </p>
          <div className="mt-8">
            <Link href="/auth/login">
              <ShimmerButton className="h-11 px-8 text-sm font-medium">
                Open a new position
                <ArrowRight className="ml-2 h-4 w-4" />
              </ShimmerButton>
            </Link>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t py-10">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <Wordmark />
        <p>Professional partner acquisition. For entertainment purposes.</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <Hero />
      <Features />
      <HowItWorks />
      <ClosingCta />
      <SiteFooter />
    </main>
  );
}
