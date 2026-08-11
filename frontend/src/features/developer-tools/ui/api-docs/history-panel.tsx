import React from "react";
import { Clock3, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import type { ApiDocsHistoryEntry } from "@/features/developer-tools";

type ApiDocsHistoryPanelProps = {
  entries: ApiDocsHistoryEntry[];
  onReplay: (entry: ApiDocsHistoryEntry) => void;
  onClear: () => void;
};

function getPath(entry: ApiDocsHistoryEntry): string {
  try {
    return new URL(entry.url).pathname;
  } catch {
    return entry.url;
  }
}

export function ApiDocsHistoryPanel({ entries, onReplay, onClear }: ApiDocsHistoryPanelProps) {
  return (
    <Card className="rounded-3xl border-border/70 bg-card/95">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="font-display text-lg">Request history</CardTitle>
          <CardDescription className="text-xs">Recent requests stay in this browser and exclude auth tokens.</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" aria-label="Clear request history" onClick={onClear} disabled={entries.length === 0}>
          <Trash2 className="h-3.5 w-3.5" />Clear
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No requests recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const path = getPath(entry);
              return (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/45 p-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className={cn("font-semibold", entry.status && entry.status >= 400 ? "text-destructive" : "text-fresh")}>{entry.method}</span>
                      <span className="truncate" title={path}>{path}</span>
                      {entry.status !== null ? <span className="text-muted-foreground">{entry.status}</span> : null}
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" />{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" aria-label={`Replay ${entry.method} ${path}`} onClick={() => onReplay(entry)}>
                    <RotateCcw className="h-3.5 w-3.5" />Replay
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
