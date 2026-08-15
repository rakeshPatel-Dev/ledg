import { createContext, useContext, useState, type ReactNode } from "react";
import type { Space, Transaction, TransactionInput } from "@ledg/shared";

interface TransactionFormState {
  open: boolean;
  editing?: Transaction | null;
  preselectedSpaceId?: string;
}

interface TransactionFormContextValue {
  formState: TransactionFormState;
  openCreate: (preselectedSpaceId?: string) => void;
  openEdit: (transaction: Transaction, spaceId: string) => void;
  closeForm: () => void;
  defaultInput: (spaces: Space[]) => TransactionInput;
}

const TransactionFormContext = createContext<
  TransactionFormContextValue | undefined
>(undefined);

export function TransactionFormProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [formState, setFormState] = useState<TransactionFormState>({
    open: false,
  });

  const openCreate = (preselectedSpaceId?: string) => {
    setFormState({ open: true, editing: null, preselectedSpaceId });
  };

  const openEdit = (transaction: Transaction, spaceId: string) => {
    setFormState({ open: true, editing: transaction, preselectedSpaceId: spaceId });
  };

  const closeForm = () => setFormState((s) => ({ ...s, open: false }));

  const defaultInput = (spaces: Space[]): TransactionInput => {
    const preferred =
      spaces.find((s) => s.type === "personal") ?? spaces[0];
    const now = new Date();
    return {
      category: "Food",
      type: "expense",
      amount: 0,
      note: "",
      date: now.toISOString(),
      tags: [],
      paymentMethod: preferred?.type === "business" ? "card" : "cash",
    };
  };

  return (
    <TransactionFormContext.Provider
      value={{ formState, openCreate, openEdit, closeForm, defaultInput }}
    >
      {children}
    </TransactionFormContext.Provider>
  );
}

export function useTransactionForm() {
  const ctx = useContext(TransactionFormContext);
  if (!ctx) {
    throw new Error(
      "useTransactionForm must be used within TransactionFormProvider"
    );
  }
  return ctx;
}
