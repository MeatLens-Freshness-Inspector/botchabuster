export type ApiDocsCategoryId =
  | "auth"
  | "analysis"
  | "access-codes"
  | "inspections"
  | "profiles"
  | "stats"
  | "upload"
  | "chat"
  | "market-locations"
  | "audit-logs"
  | "developer-options"
  | "developer-dashboard"
  | "user-chat";

export type ApiDocsHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiDocsParameterLocation = "path" | "query";
export type ApiDocsPermission = "Public" | "Authenticated" | "Self or admin" | "Admin" | "Developer";
export type ApiDocsResponseKind = "json" | "text" | "blob" | "empty";

export interface ApiDocsCategory {
  id: ApiDocsCategoryId;
  label: string;
  routePrefix: string;
}

export interface ApiDocsParameter {
  name: string;
  location: ApiDocsParameterLocation;
  required: boolean;
  description: string;
  defaultValue?: string;
}

export interface ApiDocsBodyField {
  name: string;
  label: string;
  description: string;
  required: boolean;
  kind: "text" | "file";
  defaultValue?: string;
  accept?: string;
}

export type ApiDocsBody =
  | {
      mode: "none";
      contentType: null;
    }
  | {
      mode: "json";
      contentType: "application/json";
      defaultValue: string;
    }
  | {
      mode: "urlencoded";
      contentType: "application/x-www-form-urlencoded";
      fields: ApiDocsBodyField[];
    }
  | {
      mode: "form-data";
      contentType: "multipart/form-data";
      fields: ApiDocsBodyField[];
    };

export interface ApiDocsOperation {
  id: string;
  categoryId: ApiDocsCategoryId;
  method: ApiDocsHttpMethod;
  path: string;
  summary: string;
  description: string;
  permission: ApiDocsPermission;
  parameters: ApiDocsParameter[];
  body: ApiDocsBody;
  responseKind: ApiDocsResponseKind;
  responseContentType: string;
}

export interface ApiDocsEditorValues {
  path: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | Record<string, string>;
  files: Record<string, File | null>;
}
