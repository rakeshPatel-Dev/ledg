import { LegalDocument } from "@/components/common/legal-document";
import dataDeletion from "@/data/data-deletion.json";

export default function DataDeletionPage() {
  return <LegalDocument data={dataDeletion} />;
}