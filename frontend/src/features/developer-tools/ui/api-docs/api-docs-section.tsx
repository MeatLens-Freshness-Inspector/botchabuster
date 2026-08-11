import React from "react";
import { Braces, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/shared/api/base-url";
import { ApiDocsCategoryNav } from "./category-nav";
import { ApiDocsHistoryPanel } from "./history-panel";
import { ApiDocsRequestPanel } from "./request-panel";
import { ApiDocsResponsePanel } from "./response-panel";
import { useApiDocs } from "../../model/use-api-docs";

export function ApiDocsSection() {
  const apiDocs = useApiDocs();

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-[0_18px_50px_-38px_rgba(0,0,0,0.8)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <Braces className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold tracking-tight">API Docs</p>
              <p className="text-xs text-muted-foreground">Swagger-style reference with an authenticated request workbench.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/55 px-3 py-2 font-mono text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-fresh" />
            <span className="truncate" title={API_BASE_URL}>{API_BASE_URL}</span>
            <span className="text-foreground">{apiDocs.operations.length} operations</span>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
        <aside className="api-docs-category-rail min-w-0 rounded-3xl border border-border/70 bg-card/35 p-2 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.8)] xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto xl:pr-2">
          <ApiDocsCategoryNav
            categories={apiDocs.categories}
            operations={apiDocs.operations}
            selectedOperationId={apiDocs.selectedOperation.id}
            onSelectOperation={apiDocs.selectOperation}
          />
        </aside>

        <div className="min-w-0 space-y-4">
          <ApiDocsRequestPanel
            operation={apiDocs.selectedOperation}
            editorValues={apiDocs.editorValues}
            isSending={apiDocs.isSending}
            executionError={apiDocs.executionError}
            pendingDeleteConfirmation={apiDocs.pendingDeleteConfirmation}
            onParameterChange={apiDocs.setParameterValue}
            onHeaderChange={apiDocs.setHeaderValue}
            onRemoveHeader={apiDocs.removeHeader}
            onBodyChange={apiDocs.setBodyValue}
            onFileChange={apiDocs.setFileValue}
            onReset={apiDocs.reset}
            onSend={() => { void apiDocs.send(); }}
            onConfirmDelete={() => { void apiDocs.confirmDelete(); }}
            onCancelDelete={apiDocs.cancelDelete}
          />
          <ApiDocsResponsePanel
            response={apiDocs.response}
            isSending={apiDocs.isSending}
            executionError={apiDocs.executionError}
            curlCommand={apiDocs.curlCommand}
          />
          <ApiDocsHistoryPanel
            entries={apiDocs.history}
            onReplay={apiDocs.replay}
            onClear={apiDocs.clearHistory}
          />
        </div>
      </div>
    </div>
  );
}
