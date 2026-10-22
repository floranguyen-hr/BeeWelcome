import { TemplateListPage } from "@/features/template-builder/template-list-page";

type Props = {
  searchParams: Promise<{
    status?: string;
    error?: string;
    archived?: string;
  }>;
};

export default function TemplatesRoute(props: Props) {
  return <TemplateListPage searchParams={props.searchParams} />;
}
