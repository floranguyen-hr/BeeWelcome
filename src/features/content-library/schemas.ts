import { z } from "zod";

export const contentTypeSchema = z.enum([
  "text",
  "image",
  "video",
  "file_link",
  "task",
  "quiz_form",
]);

export const audienceScopeSchema = z.enum([
  "company",
  "office",
  "department",
  "position",
  "group",
  "employee",
]);

const quizBodySchema = z
  .object({
    kind: z.literal("quiz"),
    prompt: z.string().trim().min(1).max(4000),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(10),
    answer_index: z.number().int().min(0).max(9),
    passing_score: z.number().min(0).max(1).optional(),
  })
  .superRefine((body, context) => {
    if (body.answer_index >= body.options.length) {
      context.addIssue({
        code: "custom",
        path: ["answer_index"],
        message: "Answer index must point to one of the options.",
      });
    }
  });

const formFieldSchema = z
  .object({
    name: z.string().trim().regex(/^[a-z][a-z0-9_]{0,39}$/),
    label: z.string().trim().min(1).max(160),
    type: z.enum(["text", "choice"]),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(120)).min(2).max(12).optional(),
  })
  .superRefine((field, context) => {
    if (field.type === "choice" && !field.options) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Choice fields need options.",
      });
    }
  });

const formBodySchema = z.object({
  kind: z.literal("form"),
  prompt: z.string().trim().min(1).max(4000),
  fields: z.array(formFieldSchema).min(1).max(12),
});

export const structuredQuizFormBodySchema = z.discriminatedUnion("kind", [
  quizBodySchema,
  formBodySchema,
]);

export const contentFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug chỉ dùng chữ thường, số và dấu gạch nối."),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).default(""),
    category: z.string().trim().min(1).max(80).default("general"),
    content_type: contentTypeSchema,
    scope_type: audienceScopeSchema.default("company"),
    scope_value: z.string().trim().max(160).nullable().default(null),
    body_text: z.string().trim().min(1).max(20000),
    change_note: z.string().trim().max(1000).default(""),
  })
  .superRefine((input, context) => {
    if (input.scope_type !== "company" && !input.scope_value) {
      context.addIssue({
        code: "custom",
        path: ["scope_value"],
        message: "Phạm vi này cần có giá trị audience.",
      });
    }
    if (
      ["image", "video", "file_link"].includes(input.content_type) &&
      !isHttpUrl(input.body_text)
    ) {
      context.addIssue({
        code: "custom",
        path: ["body_text"],
        message: "Loại nội dung này cần URL bắt đầu bằng http:// hoặc https://.",
      });
    }
    if (
      input.content_type === "quiz_form" &&
      input.body_text.trimStart().startsWith("{")
    ) {
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(input.body_text);
      } catch {
        context.addIssue({
          code: "custom",
          path: ["body_text"],
          message: "Quiz/form configuration must be valid JSON.",
        });
        return;
      }
      const parsed = structuredQuizFormBodySchema.safeParse(parsedBody);
      if (!parsed.success) {
        context.addIssue({
          code: "custom",
          path: ["body_text"],
          message: "Use a valid quiz or form configuration.",
        });
      }
    }
  });

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function contentPayload(input: z.infer<typeof contentFormSchema>) {
  let body: Record<string, unknown>;
  if (["image", "video", "file_link"].includes(input.content_type)) {
    body = { url: input.body_text };
  } else if (input.content_type === "task") {
    body = { instructions: input.body_text };
  } else if (input.content_type === "quiz_form") {
    try {
      const structured = JSON.parse(input.body_text);
      const parsed = structuredQuizFormBodySchema.safeParse(structured);
      body = parsed.success ? parsed.data : { prompt: input.body_text };
    } catch {
      body = { prompt: input.body_text };
    }
  } else {
    body = { text: input.body_text };
  }

  return {
    slug: input.slug,
    title: input.title,
    description: input.description,
    category: input.category,
    content_type: input.content_type,
    scope_type: input.scope_type,
    scope_value: input.scope_type === "company" ? null : input.scope_value,
    body,
  };
}
