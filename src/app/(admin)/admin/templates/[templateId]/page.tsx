import { TemplateDetailPage } from "@/features/template-builder/template-detail-page";
import { requireRole } from "@/features/auth/session";

type Props = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    published?: string;
    draft?: string;
    removed?: string;
    milestone?: string;
    item?: string;
  }>;
};

export default async function TemplateDetailRoute({ params, searchParams }: Props) {
  await requireRole("hr_admin");
  const { templateId } = await params;
  return <TemplateDetailPage templateId={templateId} searchParams={searchParams} />;
}
