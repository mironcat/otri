// Визуальные размеры векторных элементов измерений (точек и линий).
// Множители применяются ТОЛЬКО к атрибутам r и stroke-width —
// координаты (cx/cy, x1/y1…) не затрагиваются, поэтому изменение
// размеров не влияет на положение элементов.

const state = { point: 1, line: 1 };

function clamp(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return 1;
  return Math.min(Math.max(v, 0.25), 4);
}

export function getPointScale() {
  return state.point;
}

export function getLineScale() {
  return state.line;
}

export function setPointScale(value) {
  state.point = clamp(value);
}

export function setLineScale(value) {
  state.line = clamp(value);
}

/**
 * Масштабирует визуальные размеры внутри группы (относительно текущих).
 * @param {Object} group svg.js-группа (например, mobjects)
 * @param {number} pointRatio множитель радиусов точек
 * @param {number} lineRatio множитель толщины линий
 */
function scaleGroup(group, pointRatio, lineRatio) {
  if (!group || (pointRatio === 1 && lineRatio === 1)) return;
  group.find("circle").forEach((circle) => {
    const r = Number(circle.attr("r"));
    if (r > 0) circle.attr("r", r * pointRatio);
  });
  group.find("line, polyline, rect, circle, text").forEach((el) => {
    const sw = Number(el.attr("stroke-width"));
    if (sw > 0) el.attr("stroke-width", sw * lineRatio);
  });
}

// применить текущие множители к только что созданной группе
// (элементы создаются с базовыми размерами)
export function applyScales(group) {
  scaleGroup(group, state.point, state.line);
}

// изменить масштаб относительно предыдущих значений
export function changeScales(group, prevPoint, prevLine) {
  scaleGroup(group, state.point / (prevPoint || 1), state.line / (prevLine || 1));
}
