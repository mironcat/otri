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
    group: "Общие",
    resolve: (om) => getShellLengthType(getLength(om)),
  },
  {
    token: "elongation",
    label: "Степень удлинённости",
    group: "Общие",
    resolve: (om) => getDegreeOfElongation(getLength(om), getHeight(om)),
  },
  {
    token: "plenateType",
    label: "Тип плетности",
    group: "Общие",
    resolve: (om) => getPlenateType(om?.ad?.hc / om?.pd?.hc),
  },
  {
    token: "side",
    label: "Сторона",
    group: "Общие",
    resolve: (om) => (om?.side === "right" ? "правая" : "левая"),
  },
  {
    token: "fullness",
    label: "Полнота",
    group: "Общие",
    resolve: (om) => (om?.fullness === "half" ? "половина" : "полная"),
  },
  {
    token: "fmt(om.length)",
    label: "Длина (L)",
    group: "Числа",
    resolve: (om) => fmt(om?.length),
  },
  {
    token: "fmt(om.height)",
    label: "Высота (H)",
    group: "Числа",
    resolve: (om) => fmt(om?.height),
  },
  {
    token: "fmt(om.length_dorsal)",
    label: "Длина дорсальная (L)",
    group: "Числа",
    resolve: (om) => fmt(om?.length_dorsal),
  },
  {
    token: "fmt(om.width)",
    label: "Ширина (W)",
    group: "Числа",
    resolve: (om) => fmt(om?.width),
  },
  {
    token: "ratio(om.length, om.height)",
    label: "Отношение L/H",
    group: "Числа",
    resolve: (om) => ratio(om?.length, om?.height),
  },
  {
    token: "ratio(om.length_dorsal, om.width)",
    label: "Отношение L/W",
    group: "Числа",
    resolve: (om) => ratio(om?.length_dorsal, om?.width),
  },
  {
    token: "ratio(om.ad.hc, om.pd.hc)",
    label: "Отношение AD-l/PD-l",
    group: "Числа",
    resolve: (om) => ratio(om?.ad?.hc, om?.pd?.hc),
  },
  {
    token: "fmt(om.v.lv)",
    label: "Брюшной край lv",
    group: "Брюшной край",
    resolve: (om) => fmt(om?.v?.lv),
  },
  {
    token: "fmt(om.v.lvl)",
    label: "Брюшной край lvl",
    group: "Брюшной край",
    resolve: (om) => fmt(om?.v?.lvl),
  },
  {
    token: "fmt(om.v.dv)",
    label: "Брюшной край dv",
    group: "Брюшной край",
    resolve: (om) => fmt(om?.v?.dv),
  },
];

// Переменные дуг: ориентация/крутизна/положение (строка) и числовые.
const arcVariables = ARCS.flatMap(({ key, short, group }) => [
  {
    token: `${key}.orientation`,
    label: `${short} — ориентация`,
    group,
    resolve: (om) => {
      const arc = om?.[key] || {};
      return arc.hc || arc.vc ? getOrientationTypeofCurve(arc) : "";
    },
  },
  {
    token: `${key}.steepness`,
    label: `${short} — крутизна`,
    group,
    resolve: (om) => {
      const arc = om?.[key] || {};
      return getSLNTypeofCurve(arc.ln ? arc.sln / arc.ln : NaN);
    },
  },
  {
    token: `${key}.position`,
    label: `${short} — положение`,
    group,
    resolve: (om) => getAlfaTypeofCurve(om?.[key]?.alfa),
  },
  {
    token: `ratio(om.${key}.vc, om.${key}.hc)`,
    label: `${short} — h/l`,
    group,
    resolve: (om) => ratio(om?.[key]?.vc, om?.[key]?.hc),
  },
  {
    token: `ratio(om.${key}.sln, om.${key}.ln)`,
    label: `${short} — s/n`,
    group,
    resolve: (om) => ratio(om?.[key]?.sln, om?.[key]?.ln),
  },
  {
    token: `degrees(om.${key}.alfa)`,
    label: `${short} — α`,
    group,
    resolve: (om) => degrees(om?.[key]?.alfa),
  },
]);

// Плоский список всех доступных переменных.
export const DESCRIPTION_VARIABLES = [...COMMON_VARIABLES, ...arcVariables];

// Переменные, сгруппированные по разделам для панели подстановки.
const GROUP_ORDER = [
  "Общие",
  "Числа",
  "Дуги (латеральные)",
  "Брюшной край",
  "Дуги (дорсальные)",
];

export const DESCRIPTION_VARIABLE_GROUPS = GROUP_ORDER.map((name) => ({
  name,
  variables: DESCRIPTION_VARIABLES.filter(
    (variable) => variable.group === name,
  ),
}));

// Подставить значения переменных в markdown-текст.
// Неизвестные плейсхолдеры остаются как есть.
export function resolveVariables(markdown, om) {
  if (!markdown) return "";
  const values = new Map(
    DESCRIPTION_VARIABLES.map((variable) => [
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
