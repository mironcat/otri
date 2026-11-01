// Тема приложения: светлая или тёмная.
// Выбор пользователя сохраняется в localStorage; при первом запуске
// используется системная настройка (prefers-color-scheme).

export const THEME_STORAGE_KEY = "otri-theme";

export function getSystemTheme() {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

// Сохранённая тема или null, если пользователь ещё не выбирал её вручную
export function getStoredTheme() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "dark" || value === "light") return value;
  } catch {
    // localStorage может быть недоступен (приватный режим и т.п.)
  }
  return null;
}

export function getInitialTheme() {
  return getStoredTheme() || getSystemTheme();
}

// Применить тему через Quasar Dark plugin и запомнить выбор
export function applyTheme($q, theme) {
  const dark = theme === "dark";
  $q.dark.set(dark);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    // без сохранения тема всё равно применится в текущей сессии
  }
}

export function toggleTheme($q) {
  applyTheme($q, $q.dark.isActive ? "light" : "dark");
}
