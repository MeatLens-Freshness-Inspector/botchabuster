import type {
  ApiDocsBody,
  ApiDocsBodyField,
  ApiDocsCategory,
  ApiDocsCategoryId,
  ApiDocsHttpMethod,
  ApiDocsOperation,
  ApiDocsParameter,
  ApiDocsPermission,
  ApiDocsResponseKind,
} from "./api-docs-types";

export const API_DOCS_CATEGORIES: ApiDocsCategory[] = [
  { id: "auth", label: "Authentication", routePrefix: "/api/auth" },
  { id: "analysis", label: "Analysis", routePrefix: "/api/analysis" },
  { id: "access-codes", label: "Access Codes", routePrefix: "/api/access-codes" },
  { id: "inspections", label: "Inspections", routePrefix: "/api/inspections" },
  { id: "profiles", label: "Profiles", routePrefix: "/api/profiles" },
  { id: "stats", label: "Statistics", routePrefix: "/api/stats" },
  { id: "upload", label: "Uploads", routePrefix: "/api/upload" },
  { id: "chat", label: "Chat", routePrefix: "/api/chat" },
  { id: "market-locations", label: "Market Locations", routePrefix: "/api/market-locations" },
  { id: "audit-logs", label: "Audit Logs", routePrefix: "/api/audit-logs" },
  { id: "developer-options", label: "Developer Options", routePrefix: "/api/developer-options" },
  { id: "developer-dashboard", label: "Developer Dashboard", routePrefix: "/api/developer-dashboard" },
  { id: "user-chat", label: "User Chat", routePrefix: "/api/user-chat" },
];

const emptyBody = (): ApiDocsBody => ({ mode: "none", contentType: null });

const jsonBody = (defaultValue = "{}", sensitiveFields: string[] = []): ApiDocsBody => ({
  mode: "json",
  contentType: "application/json",
  defaultValue,
  ...(sensitiveFields.length > 0 ? { sensitiveFields } : {}),
});

const textField = (
  name: string,
  description: string,
  required = false,
  defaultValue = "",
): ApiDocsBodyField => ({
  name,
  label: name,
  description,
  required,
  kind: "text",
  defaultValue,
});

const fileField = (
  name: string,
  description: string,
  accept = "*/*",
): ApiDocsBodyField => ({
  name,
  label: name,
  description,
  required: true,
  kind: "file",
  accept,
});

const formDataBody = (fields: ApiDocsBodyField[]): ApiDocsBody => ({
  mode: "form-data",
  contentType: "multipart/form-data",
  fields,
});

const parameter = (
  name: string,
  location: ApiDocsParameter["location"],
  description: string,
  required = false,
  defaultValue?: string,
): ApiDocsParameter => ({ name, location, description, required, defaultValue });

const pathParameter = (name: string, description: string): ApiDocsParameter =>
  parameter(name, "path", description, true);

const queryParameter = (
  name: string,
  description: string,
  defaultValue?: string,
): ApiDocsParameter => parameter(name, "query", description, false, defaultValue);

function operation(
  id: string,
  categoryId: ApiDocsCategoryId,
  method: ApiDocsHttpMethod,
  path: string,
  summary: string,
  permission: ApiDocsPermission,
  options: {
    description?: string;
    parameters?: ApiDocsParameter[];
    body?: ApiDocsBody;
    responseKind?: ApiDocsResponseKind;
    responseContentType?: string;
  } = {},
): ApiDocsOperation {
  return {
    id,
    categoryId,
    method,
    path,
    summary,
    description: options.description ?? summary,
    permission,
    parameters: options.parameters ?? [],
    body: options.body ?? emptyBody(),
    responseKind: options.responseKind ?? "json",
    responseContentType: options.responseContentType ?? "application/json",
  };
}

const authOperations: ApiDocsOperation[] = [
  operation("auth-sign-in", "auth", "POST", "/auth/sign-in", "Sign in with email and password", "Public", { body: jsonBody('{"email":"","password":""}', ["password"]) }),
  operation("auth-sign-up", "auth", "POST", "/auth/sign-up", "Create a user account", "Public", { body: jsonBody('{"email":"","password":"","full_name":""}', ["password"]) }),
  operation("auth-session", "auth", "GET", "/auth/session", "Read the current session", "Authenticated"),
  operation("auth-sign-out", "auth", "POST", "/auth/sign-out", "Sign out the current session", "Authenticated", { responseKind: "empty", responseContentType: "text/plain" }),
  operation("auth-passkeys-register-options", "auth", "POST", "/auth/passkeys/register/options", "Create passkey registration options", "Authenticated", { body: jsonBody() }),
  operation("auth-passkeys-register-verify", "auth", "POST", "/auth/passkeys/register/verify", "Verify a registered passkey", "Authenticated", { body: jsonBody() }),
  operation("auth-passkeys-authenticate-options", "auth", "POST", "/auth/passkeys/authenticate/options", "Create passkey authentication options", "Public", { body: jsonBody() }),
  operation("auth-passkeys-authenticate-verify", "auth", "POST", "/auth/passkeys/authenticate/verify", "Verify passkey authentication", "Public", { body: jsonBody() }),
  operation("auth-passkeys-list", "auth", "GET", "/auth/passkeys", "List registered passkeys", "Authenticated"),
  operation("auth-passkeys-delete", "auth", "DELETE", "/auth/passkeys/{credentialId}", "Delete a registered passkey", "Authenticated", { parameters: [pathParameter("credentialId", "Registered passkey credential id")], responseKind: "empty", responseContentType: "text/plain" }),
  operation("auth-reset-password", "auth", "POST", "/auth/reset-password", "Send a password reset email", "Public", { body: jsonBody('{"email":""}'), responseKind: "empty", responseContentType: "text/plain" }),
  operation("auth-update-email", "auth", "PATCH", "/auth/users/{id}/email", "Update a user email address", "Self or admin", { parameters: [pathParameter("id", "Target user id")], body: jsonBody('{"email":""}') }),
  operation("auth-update-password", "auth", "PATCH", "/auth/users/{id}/password", "Update a user password", "Self or admin", { parameters: [pathParameter("id", "Target user id")], body: jsonBody('{"password":""}', ["password"]), responseKind: "empty", responseContentType: "text/plain" }),
  operation("auth-recovery-password", "auth", "POST", "/auth/recovery/password", "Update a password with a recovery token", "Public", { body: jsonBody('{"accessToken":"","password":""}', ["accessToken", "password"]), responseKind: "empty", responseContentType: "text/plain" }),
];

const analysisOperations: ApiDocsOperation[] = [
  operation("analysis-analyze", "analysis", "POST", "/analysis/analyze", "Analyze an inspection image", "Public", { body: formDataBody([fileField("image", "Image to analyze", "image/*")]) }),
  operation("analysis-health", "analysis", "GET", "/analysis/health", "Check analysis service health", "Public"),
];

const accessCodeOperations: ApiDocsOperation[] = [
  operation("access-codes-validate", "access-codes", "POST", "/access-codes/validate", "Validate an access code", "Admin", { body: jsonBody('{"code":""}') }),
  operation("access-codes-list", "access-codes", "GET", "/access-codes", "List access codes", "Admin"),
  operation("access-codes-create", "access-codes", "POST", "/access-codes", "Create an access code", "Admin", { body: jsonBody('{"code":"","role":""}') }),
  operation("access-codes-delete", "access-codes", "DELETE", "/access-codes/{id}", "Delete an access code", "Admin", { parameters: [pathParameter("id", "Access code id")], responseKind: "empty", responseContentType: "text/plain" }),
  operation("access-codes-toggle", "access-codes", "PATCH", "/access-codes/{id}/toggle", "Toggle access code activity", "Admin", { parameters: [pathParameter("id", "Access code id")] }),
];

const inspectionOperations: ApiDocsOperation[] = [
  operation("inspections-stats", "inspections", "GET", "/inspections/stats", "Read inspection statistics", "Authenticated", { parameters: [queryParameter("scope", "Inspection scope: mine or all", "mine")] }),
  operation("inspections-list", "inspections", "GET", "/inspections", "List inspections", "Authenticated", { parameters: [queryParameter("limit", "Maximum records to return", "50"), queryParameter("offset", "Number of records to skip", "0"), queryParameter("scope", "Inspection scope: mine or all", "mine")] }),
  operation("inspections-get", "inspections", "GET", "/inspections/{id}", "Read one inspection", "Authenticated", { parameters: [pathParameter("id", "Inspection id"), queryParameter("scope", "Inspection scope: mine or all", "mine")] }),
  operation("inspections-create", "inspections", "POST", "/inspections", "Create an inspection record", "Authenticated", { body: jsonBody('{"meat_type":"","classification":"","confidence_score":0}') }),
  operation("inspections-delete", "inspections", "DELETE", "/inspections/{id}", "Delete an inspection", "Authenticated", { parameters: [pathParameter("id", "Inspection id")], responseKind: "empty", responseContentType: "text/plain" }),
];

const profileOperations: ApiDocsOperation[] = [
  operation("profiles-stats", "profiles", "GET", "/profiles/stats", "Read user role statistics", "Admin"),
  operation("profiles-list", "profiles", "GET", "/profiles", "List user profiles", "Admin"),
  operation("profiles-admin-create", "profiles", "POST", "/profiles/admin/users", "Create a user as an administrator", "Admin", { body: jsonBody('{"email":"","password":"","full_name":"","role":""}', ["password"]) }),
  operation("profiles-admin-update", "profiles", "PUT", "/profiles/admin/users/{id}", "Update a user as an administrator", "Admin", { parameters: [pathParameter("id", "Target user id")], body: jsonBody('{"full_name":"","role":""}') }),
  operation("profiles-admin-delete", "profiles", "DELETE", "/profiles/admin/users/{id}", "Delete a user as an administrator", "Admin", { parameters: [pathParameter("id", "Target user id")], responseKind: "empty", responseContentType: "text/plain" }),
  operation("profiles-get", "profiles", "GET", "/profiles/{id}", "Read a user profile", "Self or admin", { parameters: [pathParameter("id", "Target user id")] }),
  operation("profiles-update", "profiles", "PUT", "/profiles/{id}", "Update a user profile", "Self or admin", { parameters: [pathParameter("id", "Target user id")], body: jsonBody('{"full_name":""}') }),
  operation("profiles-has-role", "profiles", "GET", "/profiles/{userId}/has-role/{role}", "Check whether a user has a role", "Self or admin", { parameters: [pathParameter("userId", "Target user id"), pathParameter("role", "Role to check")] }),
];

const statsOperations: ApiDocsOperation[] = [
  operation("stats-landing-page", "stats", "GET", "/stats/landing-page", "Read landing page statistics", "Public"),
];

const uploadOperations: ApiDocsOperation[] = [
  operation("upload-inspection-image", "upload", "POST", "/upload/inspection-image", "Upload an inspection image", "Authenticated", { body: formDataBody([fileField("image", "Inspection image", "image/*")]) }),
];

const chatOperations: ApiDocsOperation[] = [
  operation("chat-send", "chat", "POST", "/chat", "Send a message to the assistant", "Authenticated", { body: jsonBody('{"message":""}') }),
];

const marketLocationOperations: ApiDocsOperation[] = [
  operation("market-locations-list", "market-locations", "GET", "/market-locations", "List market locations", "Admin"),
  operation("market-locations-create", "market-locations", "POST", "/market-locations", "Create a market location", "Admin", { body: jsonBody('{"name":""}') }),
  operation("market-locations-delete", "market-locations", "DELETE", "/market-locations/{id}", "Delete a market location", "Admin", { parameters: [pathParameter("id", "Market location id")], responseKind: "empty", responseContentType: "text/plain" }),
];

const auditLogOperations: ApiDocsOperation[] = [
  operation("audit-logs-list", "audit-logs", "GET", "/audit-logs", "List audit log events", "Admin"),
  operation("audit-logs-create", "audit-logs", "POST", "/audit-logs", "Create an audit log event", "Admin", { body: jsonBody('{"event_type":"","event_time":"","actor":{},"source":{},"data":{}}') }),
];

const developerOptionOperations: ApiDocsOperation[] = [
  operation("developer-options-unlock", "developer-options", "POST", "/developer-options/unlock", "Unlock developer options", "Public", { body: jsonBody('{"password":""}', ["password"]) }),
  operation("developer-options-verify", "developer-options", "POST", "/developer-options/verify", "Verify a developer options token", "Public", { body: jsonBody('{"token":""}', ["token"]) }),
];

const developerDashboardOperations: ApiDocsOperation[] = [
  operation("developer-dashboard-overview", "developer-dashboard", "GET", "/developer-dashboard/overview", "Read imported model overview metrics", "Developer"),
  operation("developer-dashboard-datasets", "developer-dashboard", "GET", "/developer-dashboard/datasets", "List the developer dataset", "Developer", { parameters: [queryParameter("limit", "Maximum records to return", "25"), queryParameter("offset", "Number of records to skip", "0"), queryParameter("meatType", "Filter by meat type"), queryParameter("classification", "Filter by classification"), queryParameter("inspector", "Filter by inspector"), queryParameter("location", "Filter by location"), queryParameter("hasImage", "Filter by image presence"), queryParameter("dateFrom", "Filter from date"), queryParameter("dateTo", "Filter to date")] }),
  operation("developer-dashboard-datasets-export", "developer-dashboard", "POST", "/developer-dashboard/datasets/export", "Export filtered developer data", "Developer", { body: jsonBody('{"limit":"25","offset":"0"}') , responseKind: "blob", responseContentType: "application/zip" }),
  operation("developer-dashboard-dataset-classification", "developer-dashboard", "PATCH", "/developer-dashboard/datasets/{inspectionId}/manual-classification", "Update a dataset manual classification", "Developer", { parameters: [pathParameter("inspectionId", "Inspection id")], body: jsonBody('{"manualClassification":""}') }),
  operation("developer-dashboard-training-runs", "developer-dashboard", "GET", "/developer-dashboard/training-runs", "List imported training runs", "Developer"),
  operation("developer-dashboard-training-import", "developer-dashboard", "POST", "/developer-dashboard/training-runs/import", "Import a training run package", "Developer", { body: formDataBody([fileField("package", "Training run ZIP package", ".zip,application/zip")]) }),
];

const userChatOperations: ApiDocsOperation[] = [
  operation("user-chat-contacts", "user-chat", "GET", "/user-chat/contacts", "List chat contacts", "Authenticated"),
  operation("user-chat-conversation", "user-chat", "GET", "/user-chat/messages/{counterpartyId}", "Read a conversation", "Authenticated", { parameters: [pathParameter("counterpartyId", "Other participant user id")] }),
  operation("user-chat-send", "user-chat", "POST", "/user-chat/messages", "Send a user chat message", "Authenticated", { body: jsonBody('{"recipientId":"","message":""}') }),
];

export const API_DOCS_OPERATIONS: ApiDocsOperation[] = [
  ...authOperations,
  ...analysisOperations,
  ...accessCodeOperations,
  ...inspectionOperations,
  ...profileOperations,
  ...statsOperations,
  ...uploadOperations,
  ...chatOperations,
  ...marketLocationOperations,
  ...auditLogOperations,
  ...developerOptionOperations,
  ...developerDashboardOperations,
  ...userChatOperations,
];

export const API_DOCS_OPERATION_BY_ID = new Map(
  API_DOCS_OPERATIONS.map((operationEntry) => [operationEntry.id, operationEntry]),
);
