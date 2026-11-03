// Единый каталог переменных описания.
//
// Хранится в settings.json в userData (через Electron) и читается/пишется
// программно. При первом запуске заполняется дефолтами из variablesDefaults.
// В браузерном dev-режиме (без Electron) используется localStorage.
import { ref, watch } from "vue";
import { DEFAULT_VARIABLES } from "@/scripts/variablesDefaults.js";

const LOCAL_STORAGE_KEY = "otri.variablesCatalog";
const LEGACY_STORAGE_KEY = "otri.customDescriptionVariables";

export const variables = ref(DEFAULT_VARIABLES.map((item) => ({ ...item })));

// Путь к settings.json (для отображения в редакторе; пусто в браузере).
export const settingsPath = ref("");

let loaded = false;
let saveTimer = null;

const defaultByToken = new Map(
  DEFAULT_VARIABLES.map((item) => [item.token, item]),
);

const normalizeItem = (item) => {
  if (!item || typeof item.token !== "string" || !item.token.trim()) {
    return null;
  }
  const token = item.token.trim();
  const def = defaultByToken.get(token);
  const editable = def ? def.editable : true;
  const type =
    item.type === "text" || item.type === "number"
      ? item.type
      : (def?.type ?? "number");
  const group = editable
    ? type === "text"
      ? "Текстовые"
      : "Числовые вторичные"
    : (def?.group ?? "Первичные");

  return {
    token,
    label: String(item.label || def?.label || token),
    group,
    type,
    expression: String(item.expression ?? def?.expression ?? ""),
    builtin: Boolean(def),
    editable,
  };
};

// Дополняем сохранённый каталог новыми встроенными переменными и сохраняем
// порядок: сначала дефолтные, затем пользовательские.
const mergeWithDefaults = (list) => {
  const byToken = new Map(list.map((item) => [item.token, item]));
  for (const def of DEFAULT_VARIABLES) {
    if (!byToken.has(def.token)) byToken.set(def.token, { ...def });
  }

  const ordered = [];
  const seen = new Set();
  for (const def of DEFAULT_VARIABLES) {
    if (byToken.has(def.token) && !seen.has(def.token)) {
      ordered.push(byToken.get(def.token));
      seen.add(def.token);
    }
  }
  for (const item of byToken.values()) {
    if (!seen.has(item.token)) {
      ordered.push(item);
      seen.add(item.token);
    }
  }
  return ordered;
};

async function readStoredVariables() {
  try {
    if (window.otriSettings?.read) {
      const data = await window.otriSettings.read();
      if (data && Array.isArray(data.variables)) return data.variables;
    }
  } catch {
    // настроек нет или файл повреждён
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.variables)) return data.variables;
    }
  } catch {
    // localStorage может быть недоступен
  }
  return null;
}

function readLegacyVariables() {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Приводим запись к простому объекту: reactive-прокси нельзя передать через IPC.
const toPlainVariable = (item) => ({
  token: item.token,
  label: item.label,
  group: item.group,
  type: item.type,
  expression: item.expression,
  builtin: Boolean(item.builtin),
  editable: Boolean(item.editable),
});

function persist() {
  const payload = {
    version: 1,
    variables: variables.value.map(toPlainVariable),
  };

  if (window.otriSettings?.write) {
    try {
      void window.otriSettings.write(payload).catch(() => {});
    } catch {
      // IPC может быть недоступен — настройки просто не сохранятся
    }
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // игнорируем недоступность localStorage
  }
}

export async function loadVariables() {
  try {
    if (window.otriSettings?.path) {
      settingsPath.value = (await window.otriSettings.path()) || "";
    }
  } catch {
    settingsPath.value = "";
  }

  const stored = await readStoredVariables();
  const base = stored
    ? stored.map(normalizeItem).filter(Boolean)
    : DEFAULT_VARIABLES.map((item) => ({ ...item }));

  // Перенос старых пользовательских переменных из localStorage.
  if (!stored) {
    for (const legacy of readLegacyVariables()) {
      const item = normalizeItem(legacy);
      if (!item) continue;
      const existing = base.find((v) => v.token === item.token);
      if (existing) {
        existing.label = item.label;
        existing.type = item.type;
        existing.expression = item.expression;
        existing.group = item.group;
      } else {
        base.push(item);
      }
    }
  }

  variables.value = mergeWithDefaults(base);
  loaded = true;

  // На первом запуске сразу создаём файл настроек, не дожидаясь правок.
  if (!stored) persist();
}

watch(
  variables,
  () => {
    if (!loaded) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 300);
  },
  { deep: true },
);

// Стартуем с дефолтов и подменяем загруженными, когда настройки прочитаны.
void loadVariables();

export function isDefaultVariable(token) {
  return defaultByToken.has(token);
}

export function addVariable({ token, label, type, expression }) {
  const item = {
    token: String(token || "").trim(),
    label: String(label || "").trim() || String(token || "").trim(),
    group: type === "text" ? "Текстовые" : "Числовые вторичные",
    type: type === "text" ? "text" : "number",
    expression: String(expression || "").trim(),
    builtin: false,
    editable: true,
  };
  variables.value = [...variables.value, item];
  return item;
}

export function updateVariable(token, patch) {
  variables.value = variables.value.map((item) =>
    item.token === token
      ? {
          ...item,
          ...patch,
          group:
            (patch.type ?? item.type) === "text"
              ? "Текстовые"
              : "Числовые вторичные",
        }
      : item,
  );
}

export function removeVariable(token) {
  variables.value = variables.value.filter((item) => item.token !== token);
}

// Сбросить переменную к встроенному значению (или удалить пользовательскую).
export function resetVariable(token) {
  const def = defaultByToken.get(token);
  if (!def) {
    removeVariable(token);
    return;
  }
  variables.value = variables.value.map((item) =>
    item.token === token ? { ...def } : item,
  );
}
