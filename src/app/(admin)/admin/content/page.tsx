import { ContentLibraryPage } from "@/features/content-library/library-page";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    error?: string;
    created?: string;
    published?: string;
    archived?: string;
  }>;
};

export default function ContentRoute(props: Props) {
  return <ContentLibraryPage searchParams={props.searchParams} />;
}
