import EditServicePageClient from "./page.client";

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  return <EditServicePageClient params={params} />;
}
