import { z } from "zod";
import { audienceScopeSchema } from "@/features/content-library/schemas";

export const templateFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).default(""),
    scope_type: audienceScopeSchema.default("company"),
    scope_value: z.string().trim().max(160).nullable().default(null),
  })
  .superRefine((input, context) => {
    if (input.scope_type !== "company" && !input.scope_value) {
      context.addIssue({
        code: "custom",
        path: ["scope_value"],
        message: "Phạm vi này cần có giá trị audience.",
      });
    }
  });

export const milestoneFormSchema = z.object({
  template_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  sequence: z.number().int().min(0).max(100),
  available_offset_days: z.number().int().min(0).max(3650),
});

export const templateItemFormSchema = z.object({
  milestone_id: z.string().uuid(),
  content_id: z.string().uuid(),
  sequence: z.number().int().min(0).max(1000),
  is_required: z.boolean(),
  available_offset_days: z.number().int().min(0).max(3650),
  due_offset_days: z.number().int().min(0).max(3650).nullable(),
  completion_rule: z.enum([
    "manual_self_confirmation",
    "form_submission",
    "quiz_participation",
    "quiz_pass_required",
    "content_acknowledgement",
    "admin_completion",
  ]),
  include_in_progress: z.boolean(),
});

export const milestoneUpdateSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  available_offset_days: z.number().int().min(0).max(3650),
});

export const milestoneCommandSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  direction: z.enum(["up", "down"]).optional(),
});

export const templateItemUpdateSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  is_required: z.boolean(),
  available_offset_days: z.number().int().min(0).max(3650),
  due_offset_days: z.number().int().min(0).max(3650).nullable(),
  completion_rule: z.enum([
    "manual_self_confirmation",
    "form_submission",
    "quiz_participation",
    "quiz_pass_required",
    "content_acknowledgement",
    "admin_completion",
  ]),
  include_in_progress: z.boolean(),
});

export const templateItemCommandSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  direction: z.enum(["up", "down"]).optional(),
});

export const templateUpdateApplySchema = z.object({
  template_id: z.string().uuid(),
  journey_id: z.string().uuid(),
  expected_to_version: z.coerce.number().int().min(1).max(10000),
});

export function templatePayload(
  input: z.infer<typeof templateFormSchema>,
) {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    scope_type: input.scope_type,
    scope_value: input.scope_type === "company" ? null : input.scope_value,
  };
}
