import { TransactionForm } from "@/components/transactions/transaction-form";
import { useSpaces } from "@/lib/queries";

export function TransactionFormBridge() {
  const { data: spaces } = useSpaces();
  return <TransactionForm spaces={spaces ?? []} />;
}
