import { LegalDocument } from "@/components/common/legal-document";
import termsOfService from "@/data/terms.json";

export default function TermsOfServicePage() {
  return <LegalDocument data={termsOfService} />;
}