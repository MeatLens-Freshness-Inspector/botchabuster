import React, { useMemo, useState } from "react";
import { AlertTriangle, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import type {
  ApiDocsEditorValues,
  ApiDocsOperation,
  ApiDocsParameterLocation,
} from "./types";

export type ApiDocsRequestPanelProps = {
  operation: ApiDocsOperation;
  editorValues: ApiDocsEditorValues;
  isSending: boolean;
  executionError: string | null;
  pendingDeleteConfirmation: boolean;
  onParameterChange: (location: ApiDocsParameterLocation, name: string, value: string) => void;
  onHeaderChange: (name: string, value: string) => void;
  onRemoveHeader: (name: string) => void;
  onBodyChange: (body: string | Record<string, string>) => void;
  onFileChange: (name: string, file: File | null) => void;
  onReset: () => void;
  onSend: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

const METHOD_CLASSES: Record<ApiDocsOperation["method"], string> = {
  GET: "border-fresh/40 bg-fresh/10 text-fresh",
  POST: "border-primary/40 bg-primary/10 text-primary",
  PUT: "border-warning/40 bg-warning/10 text-warning",
  PATCH: "border-warning/40 bg-warning/10 text-warning",
  DELETE: "border-destructive/40 bg-destructive/10 text-destructive",
};

function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function ApiDocsRequestPanel({
  operation,
  editorValues,
  isSending,
  executionError,
  pendingDeleteConfirmation,
  onParameterChange,
  onHeaderChange,
  onRemoveHeader,
  onBodyChange,
  onFileChange,
  onReset,
  onSend,
  onConfirmDelete,
  onCancelDelete,
}: ApiDocsRequestPanelProps) {
  const [newHeaderName, setNewHeaderName] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const bodyRecord = typeof editorValues.body === "string" ? {} : editorValues.body;
  const jsonBody = typeof editorValues.body === "string" ? editorValues.body : JSON.stringify(editorValues.body, null, 2);
  const jsonIsValid = operation.body.mode !== "json" || isValidJson(jsonBody);
  const pathParameters = operation.parameters.filter((parameter) => parameter.location === "path");
  const queryParameters = operation.parameters.filter((parameter) => parameter.location === "query");

  const bodyHint = useMemo(() => {
    if (operation.body.mode === "none") return "This operation does not declare a request body.";
    if (operation.body.mode === "json") return "Edit the JSON payload before sending.";
    if (operation.body.mode === "urlencoded") return "Fields are sent as application/x-www-form-urlencoded.";
    return "Fields are sent as multipart/form-data; the browser sets the boundary.";
  }, [operation.body.mode]);

  const addHeader = () => {
    const name = newHeaderName.trim();
    if (!name) return;
    onHeaderChange(name, newHeaderValue);
    setNewHeaderName("");
    setNewHeaderValue("");
  };

  const updateBodyField = (name: string, value: string) => {
    onBodyChange({ ...bodyRecord, [name]: value });
  };

  return (
    <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
      <CardHeader className="space-y-3 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md border px-2 py-1 font-mono text-xs font-bold", METHOD_CLASSES[operation.method])}>
            {operation.method}
          </span>
          <code className="min-w-0 break-all font-mono text-sm font-semibold">{operation.path}</code>
          <Badge variant="outline" className="ml-auto font-mono text-[10px]">{operation.permission}</Badge>
        </div>
        <div>
          <CardTitle className="font-display text-lg">{operation.summary}</CardTitle>
          <CardDescription className="mt-1 text-xs">{operation.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        {executionError ? (
          <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {executionError}
          </div>
        ) : null}

        {pathParameters.length || queryParameters.length ? (
          <section className="space-y-3" aria-labelledby="api-docs-parameters-heading">
            <div>
              <h3 id="api-docs-parameters-heading" className="font-display text-sm font-semibold">Parameters</h3>
              <p className="text-xs text-muted-foreground">Values are encoded into the request path or query string.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...pathParameters, ...queryParameters].map((parameter) => (
                <div key={`${parameter.location}-${parameter.name}`} className="space-y-1.5">
                  <Label htmlFor={`api-docs-${parameter.location}-${parameter.name}`} className="text-xs">
                    {parameter.location === "path" ? "Path" : "Query"} parameter {parameter.name}{parameter.required ? " *" : ""}
                  </Label>
                  <Input
                    id={`api-docs-${parameter.location}-${parameter.name}`}
                    aria-label={`${parameter.location === "path" ? "Path" : "Query"} parameter ${parameter.name}`}
                    value={parameter.location === "path" ? editorValues.path[parameter.name] ?? "" : editorValues.query[parameter.name] ?? ""}
                    placeholder={parameter.defaultValue ?? parameter.name}
                    onChange={(event) => onParameterChange(parameter.location, parameter.name, event.target.value)}
                    className="h-9 rounded-xl font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">{parameter.description}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3" aria-labelledby="api-docs-headers-heading">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 id="api-docs-headers-heading" className="font-display text-sm font-semibold">Headers</h3>
              <p className="text-xs text-muted-foreground">Authorization and CSRF headers are managed by the app session.</p>
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(editorValues.headers).map(([name, value]) => (
              <div key={name} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input value={name} disabled aria-label={`Header name ${name}`} className="h-9 rounded-xl font-mono text-xs" />
                <Input value={value} aria-label={`Header value ${name}`} onChange={(event) => onHeaderChange(name, event.target.value)} className="h-9 rounded-xl font-mono text-xs" />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove header ${name}`} onClick={() => onRemoveHeader(name)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input value={newHeaderName} aria-label="New header name" placeholder="Header name" onChange={(event) => setNewHeaderName(event.target.value)} className="h-9 rounded-xl font-mono text-xs" />
              <Input value={newHeaderValue} aria-label="New header value" placeholder="Value" onChange={(event) => setNewHeaderValue(event.target.value)} className="h-9 rounded-xl font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" aria-label="Add header" onClick={addHeader}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="api-docs-body-heading">
          <div>
            <h3 id="api-docs-body-heading" className="font-display text-sm font-semibold">Request body</h3>
            <p className="text-xs text-muted-foreground">{bodyHint}</p>
          </div>
          {operation.body.mode === "none" ? (
            <div className="rounded-2xl border border-dashed border-border/70 p-3 font-mono text-xs text-muted-foreground">No body</div>
          ) : operation.body.mode === "json" ? (
            <div className="space-y-1.5">
              <Textarea
                aria-label="JSON request body"
                value={jsonBody}
                onChange={(event) => onBodyChange(event.target.value)}
                className={cn("min-h-36 rounded-2xl font-mono text-xs", !jsonIsValid && "border-destructive")}
              />
              {!jsonIsValid ? <p className="text-xs text-destructive">Request body must be valid JSON.</p> : null}
            </div>
          ) : (
            <div className="space-y-3">
              {operation.body.fields.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={`api-docs-body-${field.name}`} className="text-xs">{field.label}{field.required ? " *" : ""}</Label>
                  {field.kind === "file" ? (
                    <Input id={`api-docs-body-${field.name}`} type="file" accept={field.accept} onChange={(event) => onFileChange(field.name, event.target.files?.[0] ?? null)} className="rounded-xl text-xs" />
                  ) : (
                    <Input id={`api-docs-body-${field.name}`} value={bodyRecord[field.name] ?? ""} onChange={(event) => updateBodyField(field.name, event.target.value)} className="h-9 rounded-xl font-mono text-xs" />
                  )}
                  <p className="text-[11px] text-muted-foreground">{field.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onReset} disabled={isSending}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button type="button" className="rounded-xl" onClick={onSend} disabled={isSending || !jsonIsValid}>
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>

        {pendingDeleteConfirmation ? (
          <div role="alertdialog" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-3">
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>This DELETE request changes server data. Confirm before sending.</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onCancelDelete}>Cancel</Button>
              <Button type="button" variant="destructive" size="sm" onClick={onConfirmDelete}>Confirm DELETE</Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
