import { useRef, useState } from "react";
import {
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import type { Transaction } from "@ledg/shared";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { TransactionItem } from "./transaction-item";

interface SwipeableTransactionItemProps {
  transaction: Transaction;
  currency?: string;
  onClick?: () => void;
  onRequestDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function SwipeableTransactionItem({
  transaction,
  currency,
  onClick,
  onRequestDelete,
  canEdit = true,
  canDelete = true,
}: SwipeableTransactionItemProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const dragged = useRef(false);
  const deleteOpacity = useTransform(x, [0, 16], [0, 1]);
  const [actionsOpen, setActionsOpen] = useState(false);

  const canOpenActions = canEdit || canDelete;

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {canDelete && (
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute inset-0 flex items-center rounded-3xl bg-destructive"
        >
          <span className="ml-5 flex size-10 items-center justify-center rounded-2xl text-destructive-foreground">
            <Trash2 className="size-5" />
          </span>
        </motion.div>
      )}

      <motion.div
        style={{ x }}
        animate={controls}
        drag={canDelete ? "x" : false}
        dragConstraints={{ left: 0, right: 88 }}
        dragElastic={{ left: 0, right: 0.15 }}
        dragMomentum={false}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 56 || info.velocity.x > 500) {
            onRequestDelete();
          }
          controls.start({
            x: 0,
            transition: { type: "spring", stiffness: 400, damping: 30 },
          });
          window.setTimeout(() => {
            dragged.current = false;
          }, 100);
        }}
      >
        <div className="relative">
          <TransactionItem
            transaction={transaction}
            currency={currency}
            className={canOpenActions ? "pr-12" : undefined}
            onClick={() => {
              if (dragged.current) return;
              onClick?.();
            }}
            onRequestDelete={canDelete ? onRequestDelete : undefined}
          />

          {/* Visible alternative to the swipe gesture. */}
          {canOpenActions ? (
            <button
              type="button"
              aria-label={`Actions for ${
                transaction.note || transaction.category
              }`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setActionsOpen(true)}
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-0.5 after:content-[''] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-4" />
            </button>
          ) : null}
        </div>
      </motion.div>

      <Sheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title="Transaction actions"
        description={transaction.note || transaction.category}
      >
        <div className="flex flex-col gap-3 pt-2">
          {canEdit && onClick ? (
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start rounded-full"
              onClick={() => {
                setActionsOpen(false);
                onClick();
              }}
            >
              <Pencil className="size-4" />
              Edit transaction
            </Button>
          ) : null}

          {canDelete ? (
            <Button
              variant="destructive-solid"
              size="lg"
              className="w-full justify-start rounded-full"
              onClick={() => {
                setActionsOpen(false);
                onRequestDelete();
              }}
            >
              <Trash2 className="size-4" />
              Delete transaction
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="lg"
            className="w-full rounded-full"
            onClick={() => setActionsOpen(false)}
          >
            <X className="size-4" />
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
