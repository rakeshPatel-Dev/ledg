import { LegalDocument } from "@/components/common/legal-document";
import privacyPolicy from "@/data/privacy.json";

export default function PrivacyPolicyPage() {
  return <LegalDocument data={privacyPolicy} />;
}