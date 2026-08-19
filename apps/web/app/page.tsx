"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUp,
  CheckCircle2,
  GitPullRequest,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useReducer, useRef, useState } from "react";

import {
  calculateClientLatency,
  getReviewStreamErrorMessage,
  initialReviewGenerationState,
  readReviewStream,
  reduceReviewGeneration,
} from "@/lib/review-stream";

export default function Home() {
  const [{ status, output, error }, dispatch] = useReducer(
    reduceReviewGeneration,
    initialReviewGenerationState,
  );
  const [changeDescription, setChangeDescription] = useState<string>("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = async () => {
    const requestStartedAtMs = performance.now();
    let firstTokenAtMs: number | null = null;
    let lastTokenAtMs: number | null = null;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    dispatch({ type: "start" });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reviews/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeDescription,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        // Erro ocorrido antes do streaming começar.
        throw new Error("An error occurred before streaming.");
      }

      if (!response.body) {
        throw new Error("The response does not contain a stream.");
      }

      await readReviewStream(response, (event) => {
        const eventReceivedAtMs = performance.now();

        if (event.type === "text-delta") {
          firstTokenAtMs ??= eventReceivedAtMs;
          lastTokenAtMs = eventReceivedAtMs;
        }

        if (event.type === "finished") {
          const latency = calculateClientLatency({
            requestStartedAtMs,
            firstTokenAtMs,
            lastTokenAtMs,
            finishedAtMs: eventReceivedAtMs,
          });

          console.info(
            JSON.stringify({
              event: "ui.latency",
              feature: "change-review",
              requestId: event.requestId,
              finishReason: event.finishReason,
              latency,
            }),
          );
        }

        dispatch(event);
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        dispatch({ type: "cancelled" });
        return;
      }

      dispatch({
        type: "error",
        code: "unknown",
        message: getReviewStreamErrorMessage(error),
        retryable: false,
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const stopGeneration = () => {
    dispatch({ type: "cancelled" });
    abortControllerRef.current?.abort();
  };

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-48 left-1/2 size-136 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 size-80 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[72px_72px] opacity-[0.12] mask-[linear-gradient(to_bottom,black,transparent_72%)]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <a
          href="#"
          aria-label="ChangePilot home"
          className="group flex items-center gap-2.5"
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_30px_-8px_var(--primary)] transition-transform duration-300 group-hover:-rotate-6">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="font-heading text-lg font-extrabold tracking-[-0.035em]">
            ChangePilot<span className="text-primary">.ai</span>
          </span>
        </a>

        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-xl"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-40" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          {status}
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pt-20">
        <section className="flex w-full max-w-3xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI-powered change review
          </div>

          <h1 className="max-w-3xl text-balance font-heading text-4xl font-extrabold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Ship every change with
            <span className="block bg-linear-to-r from-primary via-emerald-300 to-primary bg-clip-text text-transparent">
              clarity and confidence.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Describe what is changing and get a focused review of risks,
            dependencies, and the next actions your team should take.
          </p>
        </section>

        <section
          aria-labelledby="change-description-label"
          className="mt-10 w-full max-w-2xl sm:mt-12"
        >
          <div className="rounded-[1.75rem] border border-border/80 bg-card/75 p-2 shadow-[0_24px_80px_-36px_color-mix(in_oklch,var(--primary)_38%,transparent)] backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label
                  id="change-description-label"
                  htmlFor="change-description"
                  className="text-sm font-semibold tracking-[-0.01em]"
                >
                  What is changing?
                </label>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Add as much context as possible
                </span>
              </div>

              <Textarea
                id="change-description"
                className="min-h-36 rounded-xl border-0 bg-transparent p-0 text-[0.95rem] leading-6 shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 sm:min-h-40"
                onChange={(e) => setChangeDescription(e.target.value)}
                placeholder="e.g. We're replacing our checkout provider, migrating saved payment methods, and changing the refund flow..."
                value={changeDescription}
              />

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/70 pt-4">
                <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground sm:text-xs">
                  <ShieldCheck
                    className="size-3.5 text-primary"
                    aria-hidden="true"
                  />
                  Your context stays private
                </div>

                {status === "streaming" ? (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="h-10 rounded-xl px-4"
                    onClick={stopGeneration}
                  >
                    Stop review
                  </Button>
                ) : (
                  <Button
                    disabled={!changeDescription.trim()}
                    size="lg"
                    className="h-10 rounded-xl px-4 shadow-[0_10px_30px_-12px_var(--primary)]"
                    onClick={fetchData}
                  >
                    Review change
                    <ArrowUp
                      data-icon="inline-end"
                      className="size-4"
                      aria-hidden="true"
                    />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {output && (
            <pre
              aria-live="polite"
              className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card/80 p-4 text-xs leading-5 text-muted-foreground whitespace-pre-wrap wrap-break-word"
            >
              {output}
            </pre>
          )}
          {error && (
            <pre
              role="alert"
              className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card/80 p-4 text-xs leading-5 text-destructive"
            >
              {error}
            </pre>
          )}
        </section>

        <section
          aria-label="ChangePilot benefits"
          className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3"
        >
          <div className="flex items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-border/60 hover:bg-card/40">
            <GitPullRequest
              className="size-4 text-primary"
              aria-hidden="true"
            />
            Change-aware
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-border/60 hover:bg-card/40">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Risk-focused
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-border/60 hover:bg-card/40">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            Actionable output
          </div>
        </section>
      </main>
    </div>
  );
}
