"use client";

import { useState } from "react";
import { archiveContent } from "@/features/content-library/actions";

export function ArchiveContentButton({ contentId }: { contentId: string }) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={archiveContent}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Lưu trữ nội dung? Lịch sử được giữ lại và nội dung không dùng cho giao template mới.",
          )
        ) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      <input name="id" type="hidden" value={contentId} />
      <button disabled={pending} type="submit">
        {pending ? "Đang lưu trữ…" : "Lưu trữ"}
      </button>
    </form>
  );
}
