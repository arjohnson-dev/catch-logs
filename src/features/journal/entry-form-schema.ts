import { z } from "zod";

export const journalEntrySchema = z.object({
  fishType: z.string().trim().min(1, "Fish type is required"),
  length: z.number().positive("Length must be greater than 0").optional(),
  weight: z.number().positive("Weight must be greater than 0").optional(),
  lure: z.string().optional(),
  bait: z.string().optional(),
  drag: z.number().min(0).max(1).optional(),
  rodLength: z.string().optional(),
  rodPower: z.string().optional(),
  rodAction: z.string().optional(),
  lineType: z.string().optional(),
  lineTest: z.string().optional(),
  bobberFloat: z.string().optional(),
  weightOz: z.string().optional(),
  leaderMaterial: z.string().optional(),
  leaderLength: z.string().optional(),
  notes: z.string().optional(),
  dateTime: z.string().trim().min(1, "Date and time are required"),
});

export type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;
