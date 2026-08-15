import { useRef } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { Transaction } from "@ledg/shared";

import { TransactionItem } from "./transaction-item";

interface SwipeableTransactionItemProps {
  transaction: Transaction;
  currency?: string;
  onClick?: () => void;
  onRequestDelete: () => void;
}

export function SwipeableTransactionItem({
  transaction,
  currency,
  onClick,
  onRequestDelete,
}: SwipeableTransactionItemProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const dragged = useRef(false);
  const deleteOpacity = useTransform(x, [0, 16], [0, 1]);

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 flex items-center rounded-3xl bg-destructive"
      >
        <span className="ml-5 flex size-10 items-center justify-center rounded-2xl text-destructive-foreground">
          <Trash2 className="size-5" />
        </span>
      </motion.div>

      <motion.div
        style={{ x }}
        animate={controls}
        drag="x"
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
        <TransactionItem
          transaction={transaction}
          currency={currency}
          onClick={() => {
            if (dragged.current) return;
            onClick?.();
          }}
        />
      </motion.div>
    </div>
  );
}
