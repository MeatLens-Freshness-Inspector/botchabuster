import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ApiDocsCategory, ApiDocsOperation } from "./types";

type ApiDocsCategoryNavProps = {
  categories: ApiDocsCategory[];
  operations: ApiDocsOperation[];
  selectedOperationId: string;
  onSelectOperation: (operationId: string) => void;
};

const METHOD_CLASSES: Record<ApiDocsOperation["method"], string> = {
  GET: "border-fresh/40 bg-fresh/10 text-fresh",
  POST: "border-primary/40 bg-primary/10 text-primary",
  PUT: "border-warning/40 bg-warning/10 text-warning",
  PATCH: "border-warning/40 bg-warning/10 text-warning",
  DELETE: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function ApiDocsCategoryNav({
  categories,
  operations,
  selectedOperationId,
  onSelectOperation,
}: ApiDocsCategoryNavProps) {
  return (
    <nav aria-label="API documentation categories" className="min-w-0 space-y-2">
      {categories.map((category) => {
        const categoryOperations = operations.filter((operation) => operation.categoryId === category.id);
        return (
          <section key={category.id} className="rounded-2xl border border-border/70 bg-background/45 p-2">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <h3 className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {category.label}
                </h3>
              </div>
              <span className="rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                {categoryOperations.length}
              </span>
            </div>
            <div className="space-y-1">
              {categoryOperations.map((operation) => (
                <button
                  key={operation.id}
                  type="button"
                  data-operation-id={operation.id}
                  aria-pressed={selectedOperationId === operation.id}
                  onClick={() => onSelectOperation(operation.id)}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 rounded-xl border px-2 py-2 text-left transition-colors",
                    selectedOperationId === operation.id
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <span className={cn("w-14 shrink-0 rounded-md border px-1 py-0.5 text-center font-mono text-[10px] font-semibold", METHOD_CLASSES[operation.method])}>
                    {operation.method}
                  </span>
                  <span className="min-w-0 truncate font-mono text-[11px]" title={operation.path}>
                    {operation.path}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </nav>
  );
}
