"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signInSchema } from "@/lib/validation/auth";

type LoginFormProps = {
  enabled: boolean;
};

export function LoginForm({ enabled }: LoginFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setMessage(
        parsed.error.issues[0]?.message ?? "Thông tin đăng nhập chưa hợp lệ.",
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Chưa cấu hình dịch vụ đăng nhập.");
      return;
    }

    setPending(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.user) {
      setPending(false);
      setMessage(
        "Không đăng nhập được. Hãy kiểm tra thông tin hoặc liên hệ quản trị viên.",
      );
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile?.is_active) {
      await supabase.auth.signOut();
      setPending(false);
      setMessage("Tài khoản chưa được cấp quyền truy cập ứng dụng.");
      return;
    }

    router.replace(profile.role === "hr_admin" ? "/admin/dashboard" : "/roadmap");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="field">
        <span>Email</span>
        <input
          autoComplete="username"
          disabled={!enabled || pending}
          name="email"
          required
          type="email"
        />
      </label>
      <label className="field">
        <span>Mật khẩu</span>
        <input
          autoComplete="current-password"
          disabled={!enabled || pending}
          name="password"
          required
          type="password"
        />
      </label>
      {message && (
        <p className="error-text" role="alert">
          {message}
        </p>
      )}
      <button disabled={!enabled || pending} type="submit">
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
