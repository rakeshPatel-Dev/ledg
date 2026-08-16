import { Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";

interface InsightsCardProps {
  insights: string[];
}

export function InsightsCard({ insights }: InsightsCardProps) {
  if (insights.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Quick Insights
      </h2>
      <div className="flex flex-col gap-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="flex items-start gap-3 rounded-3xl p-4">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lightbulb className="size-4" />
              </span>
              <p className="text-sm leading-snug text-foreground">{insight}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
