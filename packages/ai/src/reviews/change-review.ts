import z from "zod";

export const ChangeReviewSchema = z.object({
  summary: z.string().min(1),
  verdict: z.enum(["approve", "request-changes", "insufficient-evidence"]),
  findings: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      description: z.string().min(1),
      evidence: z.string().min(1),
    }),
  ),
});

export type ChangeReview = z.infer<typeof ChangeReviewSchema>;
