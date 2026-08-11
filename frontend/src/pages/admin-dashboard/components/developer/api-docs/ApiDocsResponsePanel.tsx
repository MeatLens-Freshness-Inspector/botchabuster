import React, { useState } from "react";
import { Check, Clipboard, Clock3, Code2, Copy, Download, FileText, HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";
import type { ApiDocsResponse } from "./response";

type ApiDocsResponsePanelProps = {
  response: ApiDocsResponse | null;
  isSending: boolean;
  executionError: string | null;
  curlCommand: string;
};

function statusClasses(status: number): string {
  if (status >= 200 && status < 300) return "border-fresh/40 bg-fresh/10 text-fresh";
  if (status >= 300 && status < 400) return "border-warning/40 bg-warning/10 text-warning";
  return "border-destructive/40 bg-destructive/10 text-destructive";
}

export function ApiDocsResponsePanel({ response, isSending, executionError, curlCommand }: ApiDocsResponsePanelProps) {
  const [activeView, setActiveView] = useState<"body" | "headers">("body");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    if (!value || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const download = () => {
    if (!response?.binaryBody) return;
    const href = URL.createObjectURL(response.binaryBody);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = response.fileName ?? "api-response.bin";
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="font-display text-lg">Response</CardTitle>
            <CardDescription className="text-xs">The latest response from the selected operation.</CardDescription>
          </div>
          {response ? (
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className={cn("rounded-md border px-2 py-1 font-semibold", statusClasses(response.status))}>{response.status}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{response.elapsedMs} ms</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><HardDrive className="h-3.5 w-3.5" />{response.sizeBytes} B</span>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {isSending ? (
          <div className="flex min-h-40 items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending request...
          </div>
        ) : null}

        {executionError ? (
          <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{executionError}</div>
        ) : null}

        {!isSending && !response && !executionError ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
            Send a request to inspect its response.
          </div>
        ) : null}

        {!isSending && response ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 rounded-xl border border-border/70 bg-background/45 p-1">
                <Button type="button" size="sm" variant={activeView === "body" ? "secondary" : "ghost"} onClick={() => setActiveView("body")}>
                  <FileText className="h-3.5 w-3.5" />Body
                </Button>
                <Button type="button" size="sm" variant={activeView === "headers" ? "secondary" : "ghost"} onClick={() => setActiveView("headers")}>
                  <Code2 className="h-3.5 w-3.5" />Headers
                </Button>
              </div>
              {activeView === "body" && response.bodyKind !== "blob" ? (
                <Button type="button" variant="outline" size="sm" aria-label="Copy response body" onClick={() => void copy("body", response.displayBody)}>
                  {copied === "body" ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                  {copied === "body" ? "Copied" : "Copy body"}
                </Button>
              ) : null}
              {activeView === "body" && response.bodyKind === "blob" ? (
                <Button type="button" variant="outline" size="sm" aria-label="Download response" onClick={download}>
                  <Download className="h-3.5 w-3.5" />Download response
                </Button>
              ) : null}
            </div>
            {activeView === "body" ? (
              response.bodyKind === "blob" ? (
                <div aria-label="Response body" className="flex min-h-44 items-center justify-center rounded-2xl border border-border/70 bg-background/70 p-6 text-center font-mono text-xs text-muted-foreground">
                  {response.displayBody}
                </div>
              ) : (
                <pre aria-label="Response body" className="min-h-44 max-h-[28rem] overflow-auto rounded-2xl border border-border/70 bg-background/70 p-3 font-mono text-xs leading-5 text-foreground">
                  {response.displayBody || "(empty response body)"}
                </pre>
              )
            ) : (
              <div aria-label="Response headers" className="max-h-[28rem] overflow-auto rounded-2xl border border-border/70 bg-background/70 p-3 font-mono text-xs">
                {Object.entries(response.headers).map(([name, value]) => (
                  <div key={name} className="grid grid-cols-[minmax(7rem,0.35fr)_1fr] gap-3 border-b border-border/50 py-2 last:border-0">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="break-all">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {curlCommand ? (
          <div className="space-y-2 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">cURL</p>
              <Button type="button" variant="outline" size="sm" aria-label="Copy cURL" onClick={() => void copy("curl", curlCommand)}>
                {copied === "curl" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "curl" ? "Copied" : "Copy cURL"}
              </Button>
            </div>
            <pre className="max-h-28 overflow-auto rounded-2xl border border-border/70 bg-background/70 p-3 font-mono text-[11px] leading-5">{curlCommand}</pre>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
