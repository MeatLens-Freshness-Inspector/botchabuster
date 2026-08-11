export function applyTheme(isDarkMode: boolean): void {
  document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
}
