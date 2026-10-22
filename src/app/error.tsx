"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <main className="page-shell">
          <section className="card stack" role="alert">
            <h1>Chưa tải được dữ liệu</h1>
            <p>
              Kết nối có thể tạm thời không sẵn sàng. Thử tải lại trang sau.
            </p>
            <button onClick={() => reset()} type="button">
              Thử lại
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
