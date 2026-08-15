export interface LegalSection {
  id: string;
  heading: string;
  body?: string[];
  bullets?: string[];
  checks?: string[];
  contactEmail?: string;
}

export interface LegalDocumentData {
  title: string;
  updatedAt: string;
  description: string;
  contactEmail?: string;
  deletionSubject?: string;
  sections: LegalSection[];
}