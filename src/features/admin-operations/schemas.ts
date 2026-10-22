import { z } from "zod";

export const assignJourneySchema = z.object({
  employee_id: z.string().uuid(),
  template_id: z.string().uuid(),
  start_date: z.iso.date(),
});

export const manageActivitySchema = z.object({
  activity_id: z.string().uuid(),
  action: z.enum(["complete", "waive", "reopen"]),
  note: z.string().trim().min(3).max(500),
});

export const supportContactSchema = z
  .object({
    id: z.string().uuid().optional(),
    display_name: z.string().trim().min(1).max(120),
    support_role: z.string().trim().min(1).max(120),
    scope_type: z.enum([
      "company",
      "office",
      "department",
      "position",
      "group",
      "employee",
    ]),
    scope_value: z.string().trim().max(160).nullable(),
    contact_email: z.union([z.email(), z.literal("")]).transform((value) => value || null),
    contact_phone: z.string().trim().max(80).transform((value) => value || null),
    contact_url: z
      .union([z.url({ protocol: /^https?$/ }), z.literal("")])
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.scope_type === "company" && value.scope_value) {
      context.addIssue({
        code: "custom",
        path: ["scope_value"],
        message: "Phạm vi toàn công ty không nhận giá trị cụ thể.",
      });
    }
    if (value.scope_type !== "company" && !value.scope_value) {
      context.addIssue({
        code: "custom",
        path: ["scope_value"],
        message: "Phạm vi này cần có giá trị.",
      });
    }
    if (!value.contact_email && !value.contact_phone && !value.contact_url) {
      context.addIssue({
        code: "custom",
        path: ["contact_email"],
        message: "Cần cung cấp ít nhất một kênh liên hệ.",
      });
    }
  });
