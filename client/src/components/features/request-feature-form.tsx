import { useState } from "react";
import { useForm, ValidationError } from "@formspree/react";
import { Loader2, Send, CheckCircle2, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const FORM_ID = "moealgza";

const CATEGORIES = [
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "feedback", label: "General Feedback" },
  { value: "support", label: "Support" },
  { value: "other", label: "Other" },
];

export function RequestFeatureForm() {
  const [state, handleSubmit, reset] = useForm(FORM_ID);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("feature");

  if (state.succeeded) {
    return (
      <Card className="flex flex-col items-center gap-4 rounded-4xl p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-success/15 text-success">
          <CheckCircle2 className="size-8" />
        </span>
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight">Thanks for reaching out!</h3>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">
            Your request has been submitted. We&apos;ll review it and get back to you if needed.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => {
            setName("");
            setCategory("feature");
            reset();
          }}
        >
          Send another request
        </Button>
      </Card>
    );
  }

  return (
    <Card className="rounded-4xl p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold tracking-tight">Request a Feature</h3>
            <p className="text-xs text-muted-foreground">
              Have an idea or found an issue? Let us know.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feat-name" className="px-1 text-xs font-semibold text-muted-foreground">
            Name
          </label>
          <Input
            id="feat-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
          <ValidationError field="name" errors={state.errors} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feat-email" className="px-1 text-xs font-semibold text-muted-foreground">
            Email
          </label>
          <Input
            id="feat-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            required
          />
          <ValidationError field="email" errors={state.errors} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feat-category" className="px-1 text-xs font-semibold text-muted-foreground">
            Category
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="feat-category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent side="bottom">
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feat-message" className="px-1 text-xs font-semibold text-muted-foreground">
            Message
          </label>
          <textarea
            id="feat-message"
            name="message"
            required
            rows={4}
            placeholder="Tell us what you'd like to see…"
            className={cn(
              "w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            )}
          />
          <ValidationError field="message" errors={state.errors} />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={state.submitting}
          className="mt-1 w-full rounded-full text-base font-semibold"
        >
          {state.submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="size-4" />
              Send Request
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}