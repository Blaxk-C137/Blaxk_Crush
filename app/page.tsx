import Link from "next/link";
import {
  ArrowRight,
  EyeOff,
  FileText,
  Link2,
  ScanFace,
  UserCheck,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Hero } from "@/components/landing/hero";
import { ScrollFade } from "@/components/effects/scroll-fade";
import { TickerBand } from "@/components/effects/ticker-band";
import { AuroraText } from "@/components/magic/aurora-text";
import { NumberTicker } from "@/components/magic/number-ticker";
import { Particles } from "@/components/magic/particles";
import { RetroGrid } from "@/components/magic/retro-grid";
import { ShineBorder } from "@/components/magic/shine-border";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur-md">
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

const FEATURES = [
  {
    icon: EyeOff,
    title: "Anonymous by default",
    body: "Candidates apply without an account. You see their cover letter and character first — name, photo, and contact details stay sealed until review.",
    shine: false,
  },
  {
    icon: ScanFace,
    title: "Controlled, one-way reveal",
    body: "You decide when identity enters the picture. Revealing an applicant is permanent and one-way — the pacing is entirely yours.",
    shine: true,
  },
  {
    icon: Link2,
    title: "Link-only distribution",
    body: "Every position has a private application portal. There is no browse feed and no discovery — share the link exactly where you want it.",
    shine: false,
  },
];

function Features() {
  return (
    <section className="relative bg-muted/40 py-24">
      <div className="container">
        <ScrollFade className="text-center">
          <h2 data-reveal className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for{" "}
            <span className="font-display italic font-normal">
              intentional
            </span>{" "}
            hiring
          </h2>
          <p data-reveal className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Everything about the pipeline is deliberate — from anonymity to
            the permanent reveal.
          </p>
        </ScrollFade>

        <ScrollFade className="mt-14 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} data-reveal className="h-full">
              <Card className="relative h-full overflow-hidden bg-background transition-shadow duration-300 hover:shadow-lg hover:shadow-indigo-500/5">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                    <f.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="pt-3 text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </CardContent>
                {f.shine && (
                  <ShineBorder
                    shineColor={["#4f46e5", "#a5b4fc", "#0ea5e9"]}
                    duration={10}
                  />
                )}
              </Card>
            </div>
          ))}
        </ScrollFade>
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
    <section id="how-it-works" className="scroll-mt-20 py-24">
      <div className="container">
        <ScrollFade className="text-center">
          <h2 data-reveal className="text-3xl font-semibold tracking-tight sm:text-4xl">
            The <span className="font-display italic font-normal">process</span>
          </h2>
        </ScrollFade>

        <ScrollFade className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} data-reveal className="relative">
              <div className="flex items-center gap-4">
                <span className="bg-gradient-to-br from-indigo-500 to-indigo-300 bg-clip-text font-display text-2xl italic text-transparent">
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
          ))}
        </ScrollFade>

        <ScrollFade className="mt-20">
          <div
            data-reveal
            className="relative grid grid-cols-1 overflow-hidden rounded-xl border bg-primary text-primary-foreground sm:grid-cols-3"
          >
            {[
              { value: 0, label: "swipes involved" },
              { value: 1, label: "link per position" },
              { value: 100, suffix: "%", label: "anonymous until you review" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 border-b border-white/10 px-6 py-10 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <span className="font-display text-5xl italic">
                  <NumberTicker value={stat.value} />
                  {stat.suffix ?? ""}
                </span>
                <span className="text-sm text-primary-foreground/70">
                  {stat.label}
                </span>
              </div>
            ))}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(500px_200px_at_50%_120%,rgba(129,140,248,0.5),transparent_70%)]"
            />
          </div>
        </ScrollFade>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t py-28">
      <RetroGrid angle={62} className="opacity-40" />
      <Particles
        className="absolute inset-0"
        quantity={40}
        color="#818cf8"
        refresh={false}
      />
      <div className="container relative flex flex-col items-center text-center">
        <ScrollFade>
          <h2
            data-reveal
            className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            The position is{" "}
            <span className="font-display italic font-normal">
              <AuroraText speed={0.7}>open.</AuroraText>
            </span>{" "}
            Are you accepting applications?
          </h2>
          <p data-reveal className="mt-5 max-w-lg text-muted-foreground">
            Set up your first position in under three minutes. Candidates are
            already out there.
          </p>
          <div data-reveal className="mt-9">
            <Link href="/auth/login">
              <ShimmerButton className="h-11 px-9 text-sm font-medium">
                Open a new position
                <ArrowRight className="ml-2 h-4 w-4" />
              </ShimmerButton>
            </Link>
          </div>
        </ScrollFade>
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
    <main className="flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <Hero />
      <TickerBand />
      <Features />
      <HowItWorks />
      <ClosingCta />
      <SiteFooter />
    </main>
  );
}
