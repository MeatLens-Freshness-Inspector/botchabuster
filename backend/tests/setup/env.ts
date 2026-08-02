const defaults: Record<string, string> = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_KEY: "service-role-key",
  SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  AUDIT_LOG_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  ALLOWED_ORIGINS: "http://localhost:8080,https://meatlens.netlify.app",
  APP_SESSION_SECRET: "app-session-secret",
  CSRF_TOKEN_SECRET: "csrf-token-secret",
  APP_SESSION_COOKIE_SECURE: "true",
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] = process.env[key] || value;
}
