import z from "zod";
import { defineTool } from "../generation/tool-calling.js";

export const GetChangeEvidenceInputSchema = z.object({
  path: z.string().min(1),
});

export type GetChangeEvidenceInput = z.infer<
  typeof GetChangeEvidenceInputSchema
>;

const evidenceByPath = new Map([
  [
    "src/auth/session.ts",
    {
      path: "src/auth/session.ts",
      change: "Session expiration changed from 24 hours to 30 days.",
      testsChanged: false,
    },
  ],
]);

export const getChangeEvidence = defineTool({
  name: "get_change_evidence",
  description: "Returns evidence about a changed repository file.",
  inputSchema: GetChangeEvidenceInputSchema,
  async execute(input) {
    return JSON.stringify(evidenceByPath.get(input.path) ?? null);
  },
});
