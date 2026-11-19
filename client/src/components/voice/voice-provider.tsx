import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { VoiceDraft } from "@ledg/shared";

import { useTransactionForm } from "@/lib/transaction-form";

import { VoiceSheet } from "./voice-sheet";

interface VoiceContextValue {
  open: boolean;
  openVoice: () => void;
  closeVoice: () => void;
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { openWithDraft } = useTransactionForm();

  const openVoice = useCallback(() => setOpen(true), []);
  const closeVoice = useCallback(() => setOpen(false), []);

  const handleEditDraft = useCallback(
    (draft: VoiceDraft) => {
      setOpen(false);
      // Let the voice sheet finish closing before the form sheet opens, so the
      // two drawers don't fight over focus and the backdrop.
      window.setTimeout(() => openWithDraft(draft), 180);
    },
    [openWithDraft]
  );

  const value = useMemo(
    () => ({ open, openVoice, closeVoice }),
    [open, openVoice, closeVoice]
  );

  return (
    <VoiceContext.Provider value={value}>
      {children}
      <VoiceSheet open={open} onClose={closeVoice} onEditDraft={handleEditDraft} />
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceContextValue {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within VoiceProvider");
  }
  return context;
}
