"use client";

import { useState } from "react";
import { archiveTemplate } from "@/features/template-builder/actions";

export function ArchiveTemplateButton({ templateId }: { templateId: string }) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={archiveTemplate}
      onSubmit={(event) => {
        if (!window.confirm("Lưu trữ template này? Template sẽ không dùng được cho phân công mới.")) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      <input name="id" type="hidden" value={templateId} />
      <button disabled={pending} type="submit">
        {pending ? "Đang lưu trữ…" : "Lưu trữ template"}
      </button>
    </form>
  );
}
