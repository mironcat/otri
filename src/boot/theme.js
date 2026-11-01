import { defineBoot } from "#q-app";
import { getInitialTheme } from "@/scripts/theme";

// Тема применяется до первого рендера, чтобы при тёмной теме
// не было вспышки светлого интерфейса.
export default defineBoot(({ app }) => {
  const $q = app.config.globalProperties.$q;
  $q.dark.set(getInitialTheme() === "dark");
});
