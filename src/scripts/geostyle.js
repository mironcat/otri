// Визуальные размеры векторных элементов измерений (точек и линий).
// Множители применяются ТОЛЬКО к атрибутам r и stroke-width —
// координаты (cx/cy, x1/y1…) не затрагиваются, поэтому изменение
// размеров не влияет на положение элементов.
//
// Дополнительно компенсируется масштаб самой группы: при зуме с включённым
// замком группа умножается матрицей, и без компенсации точки/линии визуально
// росли бы. Базовые (исходные) размеры запоминаются в data-атрибутах, поэтому
// многократные пересчёты и пользовательские множители не накапливаются.
//
// Тем же обратным масштабом держатся постоянными ручка изменения размера рамки
// (rect.ui-resizer), подписи (text.svg-label) и их подложки (rect.svg-label-bg):
// на экране они не зависят от текущего увеличения.

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

const BASE_R = "data-base-r";
const BASE_SW = "data-base-sw";
const BASE_FONT = "data-base-font";
const BASE_W = "data-base-w";
const BASE_H = "data-base-h";
const BASE_PAD = "data-base-pad";

// Вернуть базовый размер элемента, запомнив его при первом обращении
function baseValue(el, key, current) {
  const stored = el.attr(key);
  if (
    stored === undefined ||
    stored === null ||
    stored === "" ||
    !Number.isFinite(Number(stored))
  ) {
    el.attr(key, current);
    return Number(current);
  }
  return Number(stored);
}

/**
 * Привести визуальные размеры группы к текущим пользовательским множителям,
 * компенсируя масштаб самой группы.
 * @param {Object} group svg.js-группа (например, mobjects)
 */
export function syncGroupStyle(group) {
  if (!group || typeof group.find !== "function") return;
  const M = group.matrixify();
  const groupScale = Math.hypot(M.a, M.b) || 1;

  // радиусы точек
  group.find("circle").forEach((circle) => {
    const r = Number(circle.attr("r"));
    if (!(r > 0)) return;
    const base = baseValue(circle, BASE_R, r);
    circle.attr("r", (base * state.point) / groupScale);
  });

  // толщина линий и обводок
  group.find("line, polyline, rect, circle, text").forEach((el) => {
    const sw = Number(el.attr("stroke-width"));
    if (!(sw > 0)) return;
    const base = baseValue(el, BASE_SW, sw);
    el.attr("stroke-width", (base * state.line) / groupScale);
  });

  // ручка изменения размера рамки: экранный размер постоянный
  group.find("rect.ui-resizer").forEach((el) => {
    const w = Number(el.attr("width"));
    const h = Number(el.attr("height"));
    if (!(w > 0) || !(h > 0)) return;
    el.attr({
      width: baseValue(el, BASE_W, w) / groupScale,
      height: baseValue(el, BASE_H, h) / groupScale,
    });
  });

  // подписи: шрифт и подложка тоже не зависят от увеличения.
  // Подложки кладутся рядом с текстом в том же порядке создания,
  // поэтому пары текст/подложка сопоставляются по индексу.
  const labelTexts = group.find("text.svg-label");
  const labelBgs = group.find("rect.svg-label-bg");
  labelTexts.forEach((el, i) => {
    const size = Number(el.attr("font-size"));
    if (!(size > 0)) return;
    el.attr("font-size", baseValue(el, BASE_FONT, size) / groupScale);

    const bg = labelBgs[i];
    if (!bg) return;
    let bb;
    try {
      bb = el.node.getBBox();
    } catch (e) {
      return;
    }
    if (!bb.width || !bb.height) return;
    const pad = baseValue(bg, BASE_PAD, 3) / groupScale;
    bg.attr({
      x: bb.x - pad,
      y: bb.y - pad,
      width: bb.width + pad * 2,
      height: bb.height + pad * 2,
    });
  });
}

// применить текущие множители к только что созданной группе
// (элементы создаются с базовыми размерами)
export function applyScales(group) {
  syncGroupStyle(group);
}

// изменить масштаб относительно предыдущих значений
// (оставлено для совместимости: теперь просто пересчитывает от базовых)
export function changeScales(group) {
  syncGroupStyle(group);
}
