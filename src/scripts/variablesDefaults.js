// Каталог переменных описания по умолчанию.
//
// Все переменные описаны данными: токен, подпись, группа, тип и выражение.
// Выражения вычисляются в ограниченном контексте (измерения + помощники).
// Каталог используется как дефолт при первом создании settings.json и как
// эталон для сброса изменённых встроенных переменных.
import {
  getShellLengthType,
  getPlenateType,
  getDegreeOfElongation,
  getSLNTypeofCurve,
  getAlfaTypeofCurve,
  getOrientationTypeofCurve,
} from "@/scripts/interpretation.js";

// Форматирование чисел: те же правила, что в текстовом описании.
export const fmt = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "—";
};

export const ratio = (a, b) => {
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && y !== 0
    ? (x / y).toFixed(2)
    : "—";
};

export const degrees = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}°` : "—";
};

// Длина/высота с fallback на дорсальные значения.
export const getLength = (om) =>
  om?.length > 0 ? om.length : om?.length_dorsal || 0;
export const getHeight = (om) =>
  om?.height > 0 ? om.height : om?.width || 0;

// Дуги боковой и дорсальной проекций.
export const ARCS = [
  { key: "ad", short: "AD", name: "Передне-спинная дуга", group: "Дуги (латеральные)" },
  { key: "pd", short: "PD", name: "Задне-спинная дуга", group: "Дуги (латеральные)" },
  { key: "av", short: "AV", name: "Передне-брюшная дуга", group: "Дуги (латеральные)" },
  { key: "pv", short: "PV", name: "Задне-брюшная дуга", group: "Дуги (латеральные)" },
  { key: "ar", short: "AR", name: "Передне-правая дуга", group: "Дуги (дорсальные)" },
  { key: "pr", short: "PR", name: "Задне-правая дуга", group: "Дуги (дорсальные)" },
  { key: "al", short: "AL", name: "Передне-левая дуга", group: "Дуги (дорсальные)" },
  { key: "pl", short: "PL", name: "Задне-левая дуга", group: "Дуги (дорсальные)" },
];

// --- Вычисление выражений ----------------------------------------------
const EXPRESSION_ARGS = [
  "om",
  "Math",
  "fmt",
  "ratio",
  "degrees",
  "getLength",
  "getHeight",
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
  getLength,
  getHeight,
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

export function isExpressionValid(expression) {
  return compileExpression(String(expression || "")) !== null;
}

export function evaluateExpression(expression, om) {
  const fn = compileExpression(String(expression || ""));
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

// --- Каталог по умолчанию ----------------------------------------------
const variable = (token, label, group, type, expression, editable) => ({
  token,
  label,
  group,
  type,
  expression,
  builtin: true,
  editable,
});

const COMMON = [
  // Текстовые
  variable(
    "shellLengthType",
    "Тип длины раковины",
    "Текстовые",
    "text",
    "getShellLengthType(getLength(om))",
    true,
  ),
  variable(
    "elongation",
    "Степень удлинённости",
    "Текстовые",
    "text",
    "getDegreeOfElongation(getLength(om), getHeight(om))",
    true,
  ),
  variable(
    "plenateType",
    "Тип плетности",
    "Текстовые",
    "text",
    "getPlenateType(om.ad.hc / om.pd.hc)",
    true,
  ),
  variable(
    "side",
    "Сторона",
    "Текстовые",
    "text",
    "om.side === 'right' ? 'правая' : 'левая'",
    true,
  ),
  variable(
    "fullness",
    "Полнота",
    "Текстовые",
    "text",
    "om.fullness === 'half' ? 'половина' : 'полная'",
    true,
  ),

  // Первичные
  variable("fmt(om.length)", "Длина (L)", "Первичные", "number", "fmt(om.length)", false),
  variable("fmt(om.height)", "Высота (H)", "Первичные", "number", "fmt(om.height)", false),
  variable(
    "fmt(om.length_dorsal)",
    "Длина дорсальная (L)",
    "Первичные",
    "number",
    "fmt(om.length_dorsal)",
    false,
  ),
  variable("fmt(om.width)", "Ширина (W)", "Первичные", "number", "fmt(om.width)", false),
  variable("fmt(om.v.lv)", "Брюшной край lv", "Первичные", "number", "fmt(om.v.lv)", false),
  variable("fmt(om.v.lvl)", "Брюшной край lvl", "Первичные", "number", "fmt(om.v.lvl)", false),
  variable("fmt(om.v.dv)", "Брюшной край dv", "Первичные", "number", "fmt(om.v.dv)", false),

  // Числовые вторичные
  variable(
    "ratio(om.length, om.height)",
    "Отношение L/H",
    "Числовые вторичные",
    "number",
    "ratio(om.length, om.height)",
    true,
  ),
  variable(
    "ratio(om.length_dorsal, om.width)",
    "Отношение L/W",
    "Числовые вторичные",
    "number",
    "ratio(om.length_dorsal, om.width)",
    true,
  ),
  variable(
    "ratio(om.ad.hc, om.pd.hc)",
    "Отношение AD-l/PD-l",
    "Числовые вторичные",
    "number",
    "ratio(om.ad.hc, om.pd.hc)",
    true,
  ),
];

const ARC_VARIABLES = ARCS.flatMap(({ key, short }) => [
  // Первичные замеры дуги
  variable(
    `degrees(om.${key}.alfa)`,
    `${short} — α`,
    "Первичные",
    "number",
    `degrees(om.${key}.alfa)`,
    false,
  ),
  variable(`fmt(om.${key}.hc)`, `${short} — hc`, "Первичные", "number", `fmt(om.${key}.hc)`, false),
  variable(`fmt(om.${key}.vc)`, `${short} — vc`, "Первичные", "number", `fmt(om.${key}.vc)`, false),
  variable(`fmt(om.${key}.ln)`, `${short} — ln`, "Первичные", "number", `fmt(om.${key}.ln)`, false),
  variable(`fmt(om.${key}.sln)`, `${short} — sln`, "Первичные", "number", `fmt(om.${key}.sln)`, false),

  // Вторичные отношения
  variable(
    `ratio(om.${key}.vc, om.${key}.hc)`,
    `${short} — h/l`,
    "Числовые вторичные",
    "number",
    `ratio(om.${key}.vc, om.${key}.hc)`,
    true,
  ),
  variable(
    `ratio(om.${key}.sln, om.${key}.ln)`,
    `${short} — s/n`,
    "Числовые вторичные",
    "number",
    `ratio(om.${key}.sln, om.${key}.ln)`,
    true,
  ),

  // Текстовые
  variable(
    `${key}.orientation`,
    `${short} — ориентация`,
    "Текстовые",
    "text",
    `(om.${key}?.hc || om.${key}?.vc) ? getOrientationTypeofCurve(om.${key}) : ''`,
    true,
  ),
  variable(
    `${key}.steepness`,
    `${short} — крутизна`,
    "Текстовые",
    "text",
    `getSLNTypeofCurve(om.${key}?.ln ? om.${key}.sln / om.${key}.ln : NaN)`,
    true,
  ),
  variable(
    `${key}.position`,
    `${short} — положение`,
    "Текстовые",
    "text",
    `getAlfaTypeofCurve(om.${key}?.alfa)`,
    true,
  ),
]);

export const DEFAULT_VARIABLES = [...COMMON, ...ARC_VARIABLES];
