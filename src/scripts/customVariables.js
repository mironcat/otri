// Пользовательские переменные описания (вторичные числовые и текстовые).
// Хранятся глобально в localStorage, поэтому доступны во всех проектах.
import { ref, watch } from "vue";

const STORAGE_KEY = "otri.customDescriptionVariables";

const isValidStored = (item) =>
  item &&
  typeof item === "object" &&
  typeof item.token === "string" &&
  typeof item.expression === "string";

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isValidStored) : [];
  } catch {
    return [];
  }
}

export const customVariables = ref(load());

watch(
  customVariables,
  (value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // localStorage может быть недоступен — изменения не сохранятся
    }
  },
  { deep: true },
);

let counter = 0;
const makeId = () =>
  `cv-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function addCustomVariable({ label, token, type, expression }) {
  const variable = {
    id: makeId(),
    label: String(label || "").trim() || String(token || "").trim(),
    token: String(token || "").trim(),
    type: type === "text" ? "text" : "number",
    expression: String(expression || "").trim(),
  };
  customVariables.value = [...customVariables.value, variable];
  return variable;
}

export function updateCustomVariable(id, patch) {
  customVariables.value = customVariables.value.map((variable) =>
    variable.id === id ? { ...variable, ...patch } : variable,
  );
}

export function removeCustomVariable(id) {
  customVariables.value = customVariables.value.filter(
    (variable) => variable.id !== id,
  );
}
