import Verify2FAForm from "@/components/verify-2fa-form";

export default async function Verify2FAPage(props: { searchParams: Promise<Record<string, string>> }) {
  return <Verify2FAForm email={(await props.searchParams).email || ""} />;
}
