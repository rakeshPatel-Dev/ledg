import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Space, Transaction, TransactionInput, VoiceDraft } from "@ledg/shared";

interface TransactionFormState {
  open: boolean;
  editing?: Transaction | null;
  preselectedSpaceId?: string;
  lockSpace?: boolean;
  /** Prefill produced by the voice assistant. Cleared by normal openCreate. */
  draft?: VoiceDraft | null;
}

interface TransactionFormContextValue {
  formState: TransactionFormState;
  openCreate: (preselectedSpaceId?: string, lockSpace?: boolean) => void;
  openWithDraft: (draft: VoiceDraft) => void;
  openEdit: (transaction: Transaction, spaceId: string, lockSpace?: boolean) => void;
  closeForm: () => void;
  defaultInput: (spaces: Space[]) => TransactionInput;
}

const TransactionFormContext = createContext<TransactionFormContextValue | undefined>(
  undefined
);

export function TransactionFormProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<TransactionFormState>({
    open: false,
  });

  const openCreate = (preselectedSpaceId?: string, lockSpace = false) => {
    setFormState({
      open: true,
      editing: null,
      preselectedSpaceId,
      lockSpace,
      draft: null,
    });
  };

  const openWithDraft = (draft: VoiceDraft) => {
    setFormState({
      open: true,
      editing: null,
      preselectedSpaceId: draft.spaceId ?? undefined,
      lockSpace: false,
      draft,
    });
  };

  const openEdit = (transaction: Transaction, spaceId: string, lockSpace = false) => {
    // Dues-linked entries are owned by the due. Send the user to the source of
    // truth instead of opening an edit form the server would reject.
    if (transaction.source === "dues") {
      navigate(
        transaction.dueId ? `/dues?due=${encodeURIComponent(transaction.dueId)}` : "/dues"
      );
      return;
    }

    setFormState({
      open: true,
      editing: transaction,
      preselectedSpaceId: spaceId,
      lockSpace,
      draft: null,
    });
  };

  const closeForm = () => setFormState((s) => ({ ...s, open: false }));

  const defaultInput = (spaces: Space[]): TransactionInput => {
    const preferred = spaces.find((s) => s.type === "personal") ?? spaces[0];
    const now = new Date();
    return {
      category: "Food",
      type: "expense",
      amount: 0,
      note: "",
      date: now.toISOString(),
      paymentMethod: preferred?.type === "business" ? "card" : "cash",
      source: "manual",
    };
  };

  return (
    <TransactionFormContext.Provider
      value={{
        formState,
        openCreate,
        openWithDraft,
        openEdit,
        closeForm,
        defaultInput,
      }}
    >
      {children}
    </TransactionFormContext.Provider>
  );
}

export function useTransactionForm() {
  const ctx = useContext(TransactionFormContext);
  if (!ctx) {
    throw new Error("useTransactionForm must be used within TransactionFormProvider");
  }
  return ctx;
}
