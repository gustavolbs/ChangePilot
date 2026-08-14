import z from "zod";
import { defineTool } from "../generation/tool-calling.js";

export const GetChangeEvidenceInputSchema = z.object({
  path: z.string().min(1),
});

export type GetChangeEvidenceInput = z.infer<
  typeof GetChangeEvidenceInputSchema
>;

export const getChangeEvidence = defineTool({
  name: "get_change_evidence",
  description: "Returns evidence about a changed repository file.",
  inputSchema: GetChangeEvidenceInputSchema,
  async execute(input) {
    return input.path;
  },
});
