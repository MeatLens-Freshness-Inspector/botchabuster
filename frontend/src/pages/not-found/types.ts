export type NotFoundQuickLink = {
  label: string;
  description: string;
  to: string;
  kind: "home" | "inspect" | "history" | "profile" | "login" | "signup";
};
