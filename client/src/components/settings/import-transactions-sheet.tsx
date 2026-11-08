import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { ImportResult } from "@ledg/shared";

import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpaces, useImportTransactions, useUndoImport } from "@/lib/queries";
import { parseImportFile, type ParsedImport } from "@/lib/import";
import { localDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ImportTransactionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Destination = "file" | "single";

const MAX_ERRORS_SHOWN = 6;

function dateRangeLabel(parsed: ParsedImport): string {
  if (!parsed.dateFrom || !parsed.dateTo) return "No dated rows";
  const from = localDateKey(parsed.dateFrom);
  const to = localDateKey(parsed.dateTo);
  return from === to ? from : `${from} → ${to}`;
}

export function ImportTransactionsSheet({
  open,
  onOpenChange,
}: ImportTransactionsSheetProps) {
  const spacesQuery = useSpaces();
  const spaces = spacesQuery.data ?? [];
  const importTransactions = useImportTransactions();
  const undoImport = useUndoImport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [destination, setDestination] = useState<Destination>("single");
  const [targetSpaceId, setTargetSpaceId] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Default the single-space picker once spaces are available.
  useEffect(() => {
    const list = spacesQuery.data;
    if (!targetSpaceId && list && list.length > 0) {
      setTargetSpaceId(list[0].id);
    }
  }, [spacesQuery.data, targetSpaceId]);

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setParseError(null);
    setResult(null);
    setSkipDuplicates(true);
    setDestination("single");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setParseError(null);
    setResult(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const next = parseImportFile(text, file.name);
      setParsed(next);
      setDestination(next.hasSpaceInfo ? "file" : "single");
      if (next.rows.length === 0) {
        setParseError("No importable rows were found in this file");
      }
    } catch (error) {
      setParsed(null);
      setParseError(error instanceof Error ? error.message : "Could not read this file");
    }
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;

    if (destination === "single" && !targetSpaceId) {
      toast.error("Choose a destination space");
      return;
    }

    try {
      const response = await importTransactions.mutateAsync({
        transactions: parsed.rows,
        skipDuplicates,
        createSpaces: destination === "file",
        ...(destination === "single" ? { targetSpaceId } : {}),
      });
      setResult(response);

      const undoIds = response.importedIds ?? [];
      const message = `Imported ${response.imported} transaction${
        response.imported === 1 ? "" : "s"
      }`;

      if (undoIds.length > 0) {
        toast.success(message, {
          duration: 10000,
          action: {
            label: "Undo",
            onClick: () => {
              undoImport.mutate(undoIds, {
                onSuccess: (result) => {
                  toast.success(
                    `Undid import: ${result.deleted} transaction${
                      result.deleted === 1 ? "" : "s"
                    } removed`
                  );
                  handleOpenChange(false);
                },
                onError: (error) => {
                  toast.error(
                    error instanceof Error ? error.message : "Could not undo import"
                  );
                },
              });
            },
          },
        });
      } else {
        toast.success(message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  };

  const handleUndo = () => {
    const undoIds = result?.importedIds ?? [];
    if (undoIds.length === 0) return;
    undoImport.mutate(undoIds, {
      onSuccess: (result) => {
        toast.success(
          `Undid import: ${result.deleted} transaction${
            result.deleted === 1 ? "" : "s"
          } removed`
        );
        handleOpenChange(false);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not undo import");
      },
    });
  };

  const canImport =
    Boolean(parsed && parsed.rows.length > 0) &&
    !importTransactions.isPending &&
    (destination === "file" || Boolean(targetSpaceId));

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Import transactions"
      description="Bring in a Ledg backup or a spreadsheet of transactions."
    >
      <div className="flex flex-col gap-4 pt-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {result ? (
          <ImportResultView
            result={result}
            onDone={() => handleOpenChange(false)}
            onAgain={reset}
            onUndo={handleUndo}
            undoing={undoImport.isPending}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-3xl border border-dashed border-border/70 bg-muted/30 px-6 py-8 text-center transition-colors hover:bg-muted/50"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="size-5" />
              </span>
              <span className="text-sm font-semibold">
                {fileName ?? "Choose a CSV or JSON file"}
              </span>
              <span className="text-xs text-muted-foreground">
                CSV needs at least Date, Type, Category and Amount columns.
              </span>
            </button>

            {parseError && (
              <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {parsed && (
              <>
                <div className="rounded-3xl border border-border/60 bg-card p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FileSpreadsheet className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {parsed.rows.length} transaction
                        {parsed.rows.length === 1 ? "" : "s"} ready
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {parsed.format.toUpperCase()} · {dateRangeLabel(parsed)}
                      </p>
                    </div>
                  </div>

                  {parsed.spaces.length > 0 && (
                    <p className="mt-3 truncate text-xs text-muted-foreground">
                      Spaces: {parsed.spaces.slice(0, 3).join(", ")}
                      {parsed.spaces.length > 3
                        ? ` +${parsed.spaces.length - 3} more`
                        : ""}
                    </p>
                  )}

                  {parsed.errors.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <p className="font-semibold">
                        {parsed.errors.length} row
                        {parsed.errors.length === 1 ? "" : "s"} will be skipped
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {parsed.errors.slice(0, MAX_ERRORS_SHOWN).map((error) => (
                          <li key={`${error.row}-${error.message}`}>
                            Row {error.row}: {error.message}
                          </li>
                        ))}
                      </ul>
                      {parsed.errors.length > MAX_ERRORS_SHOWN && (
                        <p className="mt-1">
                          +{parsed.errors.length - MAX_ERRORS_SHOWN} more
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {parsed.hasSpaceInfo && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Destination
                    </span>
                    <Segmented<Destination>
                      value={destination}
                      onChange={setDestination}
                      options={[
                        { value: "file", label: "Match file" },
                        { value: "single", label: "One space" },
                      ]}
                    />
                  </div>
                )}

                {destination === "single" && (
                  <Select value={targetSpaceId} onValueChange={setTargetSpaceId}>
                    <SelectTrigger aria-label="Destination space">
                      <SelectValue placeholder="Choose a space" />
                    </SelectTrigger>
                    <SelectContent>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {destination === "file" && (
                  <p className="text-xs text-muted-foreground">
                    Rows go to the space named in the file. Missing spaces are created, up
                    to the 10-space limit.
                  </p>
                )}

                <button
                  type="button"
                  role="switch"
                  aria-checked={skipDuplicates}
                  onClick={() => setSkipDuplicates((value) => !value)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-left"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">Skip duplicates</span>
                    <span className="block text-xs text-muted-foreground">
                      Ignore rows that match an existing transaction
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                      skipDuplicates ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-5 rounded-full bg-white shadow transition-transform",
                        skipDuplicates ? "translate-x-[22px]" : "translate-x-0.5"
                      )}
                    />
                  </span>
                </button>

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    size="lg"
                    className="w-full rounded-full text-base font-semibold"
                    onClick={handleImport}
                    disabled={!canImport}
                  >
                    {importTransactions.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Importing…
                      </>
                    ) : (
                      `Import ${parsed.rows.length} transaction${
                        parsed.rows.length === 1 ? "" : "s"
                      }`
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-full text-base font-semibold"
                    onClick={reset}
                    disabled={importTransactions.isPending}
                  >
                    <X className="size-4 mr-2" />
                    Choose a different file
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

function ImportResultView({
  result,
  onDone,
  onAgain,
  onUndo,
  undoing,
}: {
  result: ImportResult;
  onDone: () => void;
  onAgain: () => void;
  onUndo: () => void;
  undoing: boolean;
}) {
  const total = result.imported + result.skipped + result.failed;
  const canUndo = (result.importedIds?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-border/60 bg-card px-6 py-7 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="text-lg font-bold">
          {result.imported} of {total} imported
        </p>
        <p className="text-sm text-muted-foreground">
          {result.skipped} skipped
          {result.failed > 0 ? ` · ${result.failed} failed` : ""}
          {result.spacesCreated > 0
            ? ` · ${result.spacesCreated} space${
                result.spacesCreated === 1 ? "" : "s"
              } created`
            : ""}
        </p>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p className="font-semibold">Some rows were not imported</p>
          <ul className="mt-1 space-y-0.5">
            {result.errors.slice(0, MAX_ERRORS_SHOWN).map((error) => (
              <li key={`${error.index}-${error.message}`}>
                {error.index >= 0 ? `Row ${error.index + 1}: ` : ""}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {canUndo && (
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full text-base font-semibold"
            onClick={onUndo}
            disabled={undoing}
          >
            {undoing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Undoing…
              </>
            ) : (
              <>
                <RotateCcw className="size-4" />
                Undo import
              </>
            )}
          </Button>
        )}
        <Button
          size="lg"
          className="w-full rounded-full text-base font-semibold"
          onClick={onDone}
        >
          Done
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full rounded-full text-base font-semibold"
          onClick={onAgain}
        >
          Import another file
        </Button>
      </div>
    </div>
  );
}
