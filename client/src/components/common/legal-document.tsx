import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Trash2,
  FileText,
  Calendar,
  ExternalLink,
  Info,
  AlertCircle,
  Shield,
  Database,
  Users,
  Globe,
  Smartphone,
  Server,
  Code,
  Scale,
  Gavel,
  Send,
  Clock,
} from "lucide-react";

import AppLogo from "@/components/common/app-logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeInStagger, FadeInItem } from "@/components/common/page-transition";
import { cn } from "@/lib/utils";
import type { LegalDocumentData, LegalSection } from "@/types/legal";

interface LegalDocumentProps {
  data: LegalDocumentData;
}

const SECTION_ICON_MAP: Record<string, typeof CheckCircle2> = {
  "how-to-delete": Mail,
  "what-happens-next": Clock,
  "what-gets-deleted": Trash2,
  exceptions: AlertCircle,
  introduction: Info,
  "information-we-collect": Database,
  "how-we-use-information": Server,
  "social-authentication": Users,
  "how-we-share-information": Globe,
  "data-retention": Calendar,
  "data-security": Shield,
  "your-rights": ShieldCheck,
  "third-party-services": ExternalLink,
  "childrens-privacy": Users,
  changes: FileText,
  acceptance: Scale,
  "description-of-service": Smartphone,
  accounts: Users,
  "user-data": Database,
  "acceptable-use": Gavel,
  "ai-features": Code,
  "financial-disclaimer": AlertCircle,
  "accuracy-of-user-data": CheckCircle2,
  availability: Server,
  termination: Trash2,
  "disclaimer-of-warranties": Shield,
  "limitation-of-liability": Shield,
  "governing-law": Scale,
  contact: Mail,
};

const DEFAULT_ICON = FileText;

const SectionIcon = ({ id }: { id: string }) => {
  const Icon = SECTION_ICON_MAP[id] ?? DEFAULT_ICON;
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
      <Icon className="size-5" />
    </span>
  );
};

const SectionBody = ({ section }: { section: LegalSection }) => {
  if (
    !section.body?.length &&
    !section.bullets?.length &&
    !section.checks?.length &&
    !section.contactEmail
  ) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3.5">
      {section.body?.map((paragraph, index) => (
        <p
          key={index}
          className={cn(
            "text-sm leading-relaxed text-muted-foreground",
            index === 0 && "font-medium text-foreground/80"
          )}
        >
          {paragraph}
        </p>
      ))}

      {section.bullets?.length && (
        <ul className="mt-3 space-y-2.5">
          {section.bullets.map((bullet, index) => (
            <li
              key={index}
              className="group flex items-start gap-3.5 text-sm text-muted-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60 transition-colors group-hover:bg-primary" />
              <span className="leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {section.checks?.length && (
        <ul className="mt-3 space-y-2.5">
          {section.checks.map((check, index) => (
            <li
              key={index}
              className="group flex items-start gap-3.5 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-emerald-500 transition-transform group-hover:scale-110" />
              <span className="leading-relaxed">{check}</span>
            </li>
          ))}
        </ul>
      )}

      {section.contactEmail && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/5 px-5 py-3.5 ring-1 ring-primary/10">
          <Mail className="size-4.5 text-primary/70" />
          <p className="text-sm font-medium text-foreground">{section.contactEmail}</p>
        </div>
      )}
    </div>
  );
};

const SectionCard = ({ section }: { section: LegalSection }) => {
  return (
    <Card className="group rounded-4xl border-border/50 bg-card/50 p-7 shadow-sm transition-all duration-300 hover:border-primary/20 hover:bg-card/80 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <SectionIcon id={section.id} />
        <h2 className="flex-1 pt-0.5 text-base font-semibold tracking-tight text-foreground">
          {section.heading}
        </h2>
      </div>

      <SectionBody section={section} />
    </Card>
  );
};

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    aria-label="Go back"
    onClick={onClick}
    className="rounded-full bg-card/60 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-md"
  >
    <ArrowLeft className="size-4.5" />
  </Button>
);

const DocumentHeader = ({
  title,
  updatedAt,
}: {
  title: string;
  updatedAt: string;
}) => {
  return (
    <header className="space-y-4 flex items-center flex-col gap-2 text-center">

      <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground">
        {title}
      </h1>

      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        <Calendar className="size-3.5" />
        <span>Updated {updatedAt}</span>
      </div>
    </header>
  );
};

const DeletionRequestCard = ({
  contactEmail,
  deletionSubject,
}: {
  contactEmail: string;
  deletionSubject: string;
}) => {
  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent(deletionSubject)}`;

  return (
    <Card className="relative overflow-hidden rounded-4xl border-primary/30 bg-linear-to-br from-primary/5 via-primary/3 to-transparent p-8 shadow-xl shadow-primary/5">
      <div className="absolute -right-20 -top-20 size-56 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 size-56 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <span className="flex size-20 items-center justify-center rounded-3xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl shadow-primary/30 ring-4 ring-primary/10">
          <Send className="size-9" />
        </span>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Request Data Deletion</h3>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Use the subject{" "}
            <strong className="text-foreground">"{deletionSubject}"</strong> from your
            registered email address.
          </p>
        </div>

        <a href={mailtoHref} className="w-full">
          <Button
            size="lg"
            className="w-full rounded-full bg-linear-to-r from-primary to-primary/80 text-base font-semibold shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/50"
          >
            <Mail className="mr-2.5 size-4.5" />
            Email {contactEmail}
          </Button>
        </a>

        <p className="text-[0.65rem] text-muted-foreground/60">
          We&apos;ll respond within 48 hours
        </p>
      </div>
    </Card>
  );
};

export const LegalDocument = ({ data }: LegalDocumentProps) => {
  const navigate = useNavigate();
  const showDeletionCard = Boolean(data.contactEmail && data.deletionSubject);

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <BackButton onClick={() => navigate(-1)} />
        <AppLogo className="size-11 rounded-2xl shadow-lg" imgClassName="size-6" />
        <span className="w-11" aria-hidden="true" />
      </div>

      <FadeInStagger className="mt-8 flex flex-col gap-6">
        <FadeInItem>
          <DocumentHeader
            title={data.title}
            updatedAt={data.updatedAt}
          />
        </FadeInItem>

        <FadeInItem>
          <div className="flex flex-col gap-4">
            {data.sections.map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>
        </FadeInItem>

        {showDeletionCard && data.contactEmail && data.deletionSubject && (
          <FadeInItem>
            <DeletionRequestCard
              contactEmail={data.contactEmail}
              deletionSubject={data.deletionSubject}
            />
          </FadeInItem>
        )}

        <FadeInItem>
          <div className="mt-4 space-y-1 text-center">
            <p className="text-[0.65rem] text-muted-foreground/40">
              Last reviewed: {data.updatedAt}
            </p>
            {data.contactEmail && (
              <p className="text-[0.65rem] text-muted-foreground/40">
                Questions? Contact us at {data.contactEmail}
              </p>
            )}
          </div>
        </FadeInItem>
      </FadeInStagger>
    </div>
  );
};