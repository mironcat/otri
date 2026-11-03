// Markdown-описание остракоды.
//
// Описание хранится как markdown-текст, в который значения измерений
// подставляются через плейсхолдеры в фигурных скобках:
//   - строковые переменные, например {shellLengthType};
//   - числовые переменные, например {fmt(om.length_dorsal)}.
//
// Сам каталог переменных хранится в settings.json (см. variablesStore.js),
// а значения подставляются вычислением выражений из каталога.
// Рендер markdown в HTML выполняется тем же стеком, что и в проекте
// marktax: unified + remark-parse + remark-html.
import { computed } from "vue";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkHtml from "remark-html";
import { ARCS, evaluateExpression } from "@/scripts/variablesDefaults.js";
import { variables } from "@/scripts/variablesStore.js";

const lateralArcs = ARCS.filter((arc) => arc.group === "Дуги (латеральные)");
const dorsalArcs = ARCS.filter((arc) => arc.group === "Дуги (дорсальные)");

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
    const groupVariables = variables.value.filter(
      (variable) => variable.group === name,
    );

    const subgroups =
      name === "Первичные"
        ? PRIMARY_SUBGROUP_ORDER.map((subgroup) => ({
            name: subgroup,
            variables: groupVariables.filter(
              (variable) => primarySubgroupOf(variable) === subgroup,
            ),
          })).filter((subgroup) => subgroup.variables.length > 0)
        : [{ name: null, variables: groupVariables }];

    return { name, subgroups };
  }),
);

// Подставить значения переменных в markdown-текст.
// Неизвестные плейсхолдеры остаются как есть.
export function resolveVariables(markdown, om) {
  if (!markdown) return "";
  const values = new Map(
    variables.value.map((variable) => [
      variable.token,
      evaluateExpression(variable.expression, om),
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
