// Markdown-описание остракоды.
//
// Описание хранится как markdown-текст, в который значения измерений
// подставляются через плейсхолдеры в фигурных скобках:
//   - строковые переменные, например {shellLengthType};
//   - числовые переменные, например {fmt(om.length_dorsal)}.
//
// Этот модуль описывает доступные переменные, умеет подставлять их
// значения в текст и собирать исходный (дефолтный) markdown по измерениям.
// Рендер markdown в HTML выполняется тем же стеком, что и в проекте
// marktax: unified + remark-parse + remark-html.
import { computed } from "vue";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkHtml from "remark-html";
import {
  getShellLengthType,
  getPlenateType,
  getDegreeOfElongation,
  getSLNTypeofCurve,
  getAlfaTypeofCurve,
  getOrientationTypeofCurve,
} from "@/scripts/interpretation.js";
import { customVariables } from "@/scripts/customVariables.js";

// Форматирование чисел: те же правила, что в текстовом описании.
const fmt = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "—";
};

const ratio = (a, b) => {
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && y !== 0
    ? (x / y).toFixed(2)
    : "—";
};

const degrees = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}°` : "—";
};

// Длина/высота с fallback на дорсальные значения (как в Description.vue).
const getLength = (om) => (om?.length > 0 ? om.length : om?.length_dorsal || 0);
const getHeight = (om) => (om?.height > 0 ? om.height : om?.width || 0);

// --- Пользовательские (вторичные) переменные ---------------------------
// Выражения выполняются в ограниченном контексте: измерения + помощники.
const EXPRESSION_ARGS = [
  "om",
  "Math",
  "fmt",
  "ratio",
  "degrees",
  "getShellLengthType",
  "getPlenateType",
  "getDegreeOfElongation",
  "getSLNTypeofCurve",
  "getAlfaTypeofCurve",
  "getOrientationTypeofCurve",
];

const EXPRESSION_VALUES = [
  null,
  Math,
  fmt,
  ratio,
  degrees,
  getShellLengthType,
  getPlenateType,
  getDegreeOfElongation,
  getSLNTypeofCurve,
  getAlfaTypeofCurve,
  getOrientationTypeofCurve,
];

const expressionCache = new Map();

function compileExpression(expression) {
  if (expressionCache.has(expression)) return expressionCache.get(expression);
  let fn;
  try {
    fn = new Function(
      ...EXPRESSION_ARGS,
      `"use strict"; return (${expression});`,
    );
  } catch {
    fn = null;
  }
  expressionCache.set(expression, fn);
  return fn;
}

function evaluateCustomExpression(variable, om) {
  const fn = compileExpression(variable.expression || "");
  if (!fn) return "";
  try {
    const args = EXPRESSION_VALUES.map((value, index) =>
      index === 0 ? om : value,
    );
    const result = fn(...args);
    if (typeof result === "number") return fmt(result);
    return result == null ? "" : String(result);
  } catch {
    return "";
  }
}

// Дуги боковой и дорсальной проекций.
const ARCS = [
  { key: "ad", short: "AD", name: "Передне-спинная дуга", group: "Дуги (латеральные)" },
  { key: "pd", short: "PD", name: "Задне-спинная дуга", group: "Дуги (латеральные)" },
  { key: "av", short: "AV", name: "Передне-брюшная дуга", group: "Дуги (латеральные)" },
  { key: "pv", short: "PV", name: "Задне-брюшная дуга", group: "Дуги (латеральные)" },
  { key: "ar", short: "AR", name: "Передне-правая дуга", group: "Дуги (дорсальные)" },
  { key: "pr", short: "PR", name: "Задне-правая дуга", group: "Дуги (дорсальные)" },
  { key: "al", short: "AL", name: "Передне-левая дуга", group: "Дуги (дорсальные)" },
  { key: "pl", short: "PL", name: "Задне-левая дуга", group: "Дуги (дорсальные)" },
];

const lateralArcs = ARCS.filter((arc) => arc.group === "Дуги (латеральные)");
const dorsalArcs = ARCS.filter((arc) => arc.group === "Дуги (дорсальные)");

// Плейсхолдеры значений. token — текст внутри фигурных скобок,
// label — подпись в панели переменных, resolve — вычисление значения.
const COMMON_VARIABLES = [
  {
    token: "shellLengthType",
    label: "Тип длины раковины",
    group: "Текстовые",
    resolve: (om) => getShellLengthType(getLength(om)),
  },
  {
    token: "elongation",
    label: "Степень удлинённости",
    group: "Текстовые",
    resolve: (om) => getDegreeOfElongation(getLength(om), getHeight(om)),
  },
  {
    token: "plenateType",
    label: "Тип плетности",
    group: "Текстовые",
    resolve: (om) => getPlenateType(om?.ad?.hc / om?.pd?.hc),
  },
  {
    token: "side",
    label: "Сторона",
    group: "Текстовые",
    resolve: (om) => (om?.side === "right" ? "правая" : "левая"),
  },
  {
    token: "fullness",
    label: "Полнота",
    group: "Текстовые",
    resolve: (om) => (om?.fullness === "half" ? "половина" : "полная"),
  },
  {
    token: "fmt(om.length)",
    label: "Длина (L)",
    group: "Первичные",
    resolve: (om) => fmt(om?.length),
  },
  {
    token: "fmt(om.height)",
    label: "Высота (H)",
    group: "Первичные",
    resolve: (om) => fmt(om?.height),
  },
  {
    token: "fmt(om.length_dorsal)",
    label: "Длина дорсальная (L)",
    group: "Первичные",
    resolve: (om) => fmt(om?.length_dorsal),
  },
  {
    token: "fmt(om.width)",
    label: "Ширина (W)",
    group: "Первичные",
    resolve: (om) => fmt(om?.width),
  },
  {
    token: "ratio(om.length, om.height)",
    label: "Отношение L/H",
    group: "Числовые вторичные",
    resolve: (om) => ratio(om?.length, om?.height),
  },
  {
    token: "ratio(om.length_dorsal, om.width)",
    label: "Отношение L/W",
    group: "Числовые вторичные",
    resolve: (om) => ratio(om?.length_dorsal, om?.width),
  },
  {
    token: "ratio(om.ad.hc, om.pd.hc)",
    label: "Отношение AD-l/PD-l",
    group: "Числовые вторичные",
    resolve: (om) => ratio(om?.ad?.hc, om?.pd?.hc),
  },
  {
    token: "fmt(om.v.lv)",
    label: "Брюшной край lv",
    group: "Первичные",
    resolve: (om) => fmt(om?.v?.lv),
  },
  {
    token: "fmt(om.v.lvl)",
    label: "Брюшной край lvl",
    group: "Первичные",
    resolve: (om) => fmt(om?.v?.lvl),
  },
  {
    token: "fmt(om.v.dv)",
    label: "Брюшной край dv",
    group: "Первичные",
    resolve: (om) => fmt(om?.v?.dv),
  },
];

// Переменные дуг: первичные замеры, вторичные отношения и текстовые типы.
const arcVariables = ARCS.flatMap(({ key, short }) => [
  {
    token: `degrees(om.${key}.alfa)`,
    label: `${short} — α`,
    group: "Первичные",
    resolve: (om) => degrees(om?.[key]?.alfa),
  },
  {
    token: `fmt(om.${key}.hc)`,
    label: `${short} — hc`,
    group: "Первичные",
    resolve: (om) => fmt(om?.[key]?.hc),
  },
  {
    token: `fmt(om.${key}.vc)`,
    label: `${short} — vc`,
    group: "Первичные",
    resolve: (om) => fmt(om?.[key]?.vc),
  },
  {
    token: `fmt(om.${key}.ln)`,
    label: `${short} — ln`,
    group: "Первичные",
    resolve: (om) => fmt(om?.[key]?.ln),
  },
  {
    token: `fmt(om.${key}.sln)`,
    label: `${short} — sln`,
    group: "Первичные",
    resolve: (om) => fmt(om?.[key]?.sln),
  },
  {
    token: `ratio(om.${key}.vc, om.${key}.hc)`,
    label: `${short} — h/l`,
    group: "Числовые вторичные",
    resolve: (om) => ratio(om?.[key]?.vc, om?.[key]?.hc),
  },
  {
    token: `ratio(om.${key}.sln, om.${key}.ln)`,
    label: `${short} — s/n`,
    group: "Числовые вторичные",
    resolve: (om) => ratio(om?.[key]?.sln, om?.[key]?.ln),
  },
  {
    token: `${key}.orientation`,
    label: `${short} — ориентация`,
    group: "Текстовые",
    resolve: (om) => {
      const arc = om?.[key] || {};
      return arc.hc || arc.vc ? getOrientationTypeofCurve(arc) : "";
    },
  },
  {
    token: `${key}.steepness`,
    label: `${short} — крутизна`,
    group: "Текстовые",
    resolve: (om) => {
      const arc = om?.[key] || {};
      return getSLNTypeofCurve(arc.ln ? arc.sln / arc.ln : NaN);
    },
  },
  {
    token: `${key}.position`,
    label: `${short} — положение`,
    group: "Текстовые",
    resolve: (om) => getAlfaTypeofCurve(om?.[key]?.alfa),
  },
]);

// Плоский список встроенных переменных.
export const DESCRIPTION_VARIABLES = [...COMMON_VARIABLES, ...arcVariables];

// Пользовательские переменные (из редактора переменных) в том же формате.
const customVariableEntries = computed(() =>
  customVariables.value
    .filter((variable) => variable.token)
    .map((variable) => ({
      token: variable.token,
      label: variable.label || variable.token,
      group: variable.type === "text" ? "Текстовые" : "Числовые вторичные",
      resolve: (om) => evaluateCustomExpression(variable, om),
      custom: true,
    })),
);

// Все переменные: встроенные + пользовательские.
const allVariables = computed(() => [
  ...DESCRIPTION_VARIABLES,
  ...customVariableEntries.value,
]);

// Переменные, сгруппированные по разделам для панели подстановки.
const GROUP_ORDER = ["Первичные", "Числовые вторичные", "Текстовые"];

// Внутри «Первичных» — подгруппы по дугам; «Общие» — не привязанные к дуге.
const PRIMARY_SUBGROUP_ORDER = [
  "Общие",
  "AD",
  "AV",
  "PV",
  "PD",
  "AR",
  "PR",
  "AL",
  "PL",
];

// Подгруппа первичной переменной: дуга из токена (om.ad.*) либо «Общие».
const primarySubgroupOf = (variable) => {
  const match = /om\.(ad|av|pv|pd|ar|pr|al|pl)\./.exec(variable.token);
  return match ? match[1].toUpperCase() : "Общие";
};

export const DESCRIPTION_VARIABLE_GROUPS = computed(() =>
  GROUP_ORDER.map((name) => {
    const variables = allVariables.value.filter(
      (variable) => variable.group === name,
    );

    const subgroups =
      name === "Первичные"
        ? PRIMARY_SUBGROUP_ORDER.map((subgroup) => ({
            name: subgroup,
            variables: variables.filter(
              (variable) => primarySubgroupOf(variable) === subgroup,
            ),
          })).filter((subgroup) => subgroup.variables.length > 0)
        : [{ name: null, variables }];

    return { name, subgroups };
  }),
);

// Подставить значения переменных в markdown-текст.
// Неизвестные плейсхолдеры остаются как есть.
export function resolveVariables(markdown, om) {
  if (!markdown) return "";
  const values = new Map(
    allVariables.value.map((variable) => [
      variable.token,
      variable.resolve(om),
    ]),
  );
  return markdown.replace(/\{([^{}]*)\}/g, (placeholder, token) =>
    values.has(token) ? values.get(token) : placeholder,
  );
}

// markdown -> HTML (unified + remark-parse + remark-html).
export function markdownToHtml(markdown) {
  if (!markdown) return "";
  return unified().use(remarkParse).use(remarkHtml).processSync(markdown).toString();
}

// Готовое описание: подстановка значений + рендер в HTML.
export function renderDescriptionMarkdown(markdown, om) {
  return markdownToHtml(resolveVariables(markdown, om));
}

// Исходный (дефолтный) markdown описания по измерениям.
// Строится из тех же фраз, что раньше выводил компонент Description.
export function defaultDescriptionMarkdown(om) {
  if (!om) return "";

  const lines = [];
  lines.push("## Общее описание");
  lines.push("");

  if (om.lateral_side) {
    lines.push(
      "Латеральная проекция: по длине раковины — **{shellLengthType}** " +
        "(L = {fmt(om.length)}), по степени удлинённости — **{elongation}** " +
        "(L/H = {ratio(om.length, om.height)}), **{plenateType}** " +
        "(AD-l/PD-l = {ratio(om.ad.hc, om.pd.hc)}).",
    );
    lines.push("");
    lines.push("Сторона: **{side}**.");
    lines.push("");
  }

  if (om.dorsal_side) {
    lines.push(
      "Дорсальная проекция: по длине раковины — **{shellLengthType}** " +
        "(L = {fmt(om.length_dorsal)}), по степени удлинённости — **{elongation}** " +
        "(L/W = {ratio(om.length_dorsal, om.width)}), полнота — **{fullness}**.",
    );
    lines.push("");
  }

  if (om.lateral_side) {
    lines.push("## Латеральная сторона");
    lines.push("");
    lateralArcs.forEach(({ key, short, name }) => {
      lines.push(
        `- ${name} (${short}): **{${key}.orientation}** ` +
          `(${short}-h/${short}-l = {ratio(om.${key}.vc, om.${key}.hc)}), ` +
          `**{${key}.steepness}** ` +
          `(${short}-s/${short}-n = {ratio(om.${key}.sln, om.${key}.ln)}), ` +
          `**{${key}.position}** (${short}-α = {degrees(om.${key}.alfa)}).`,
      );
    });
    lines.push("");
    lines.push("## Брюшной край");
    lines.push("");
    lines.push("V: lv = {fmt(om.v.lv)}, lvl = {fmt(om.v.lvl)}, dv = {fmt(om.v.dv)}.");
    lines.push("");
  }

  if (om.dorsal_side) {
    lines.push("## Дорсальная сторона");
    lines.push("");
    dorsalArcs.forEach(({ key, short, name }) => {
      lines.push(
        `- ${name} (${short}): **{${key}.orientation}** ` +
          `(${short}-h/${short}-l = {ratio(om.${key}.vc, om.${key}.hc)}), ` +
          `**{${key}.steepness}** ` +
          `(${short}-s/${short}-n = {ratio(om.${key}.sln, om.${key}.ln)}), ` +
          `**{${key}.position}** (${short}-α = {degrees(om.${key}.alfa)}).`,
      );
    });
  }

  return lines.join("\n").trim();
}
