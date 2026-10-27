// Направляющие для svg canvas: одна горизонтальная и две вертикальные линии.
// Их можно перетаскивать мышью (зона захвата шире самой линии, чтобы удобнее попадать).
// Отображение управляется кнопками в шапке (MainLayout) через setGuideVisible.

const HIT_THICKNESS = 10;
const CORE_COLOR = "#e91e63";

// Состояние видимости хранится глобально, чтобы переживать
// пересоздание canvas (draw.clear() при загрузке нового файла)
const visibility = { h: true, v1: true, v2: true };

// Ссылки на текущие элементы направляющих (реализации на текущем draw)
let elements = null;

// Текущие размеры canvas: обновляются через initGuides/resizeGuides,
// чтобы перетаскивание всегда работало по всей актуальной ширине/высоте
const canvasSize = { width: 1000, height: 600 };

export function getGuidesVisibility() {
  return { ...visibility };
}

export function setGuideVisible(key, value) {
  visibility[key] = value;
  if (elements && elements[key]) {
    if (value) elements[key].guide.show();
    else elements[key].guide.hide();
  }
}

export function initGuides(draw, size = {}) {
  const width = size.width ?? canvasSize.width;
  const height = size.height ?? canvasSize.height;
  canvasSize.width = width;
  canvasSize.height = height;

  // Если canvas был очищен (новый файл) — убираем старую группу, если она жива
  if (elements) {
    try {
      elements.root.remove();
    } catch (e) {
      /* элемент уже удален через draw.clear() */
    }
  }

  const root = draw.group().attr({ id: "guides" });

  const current = {
    root,
    h: makeGuide("h", false, Math.round(height / 2)),
    v1: makeGuide("v1", true, Math.round(width / 3)),
    v2: makeGuide("v2", true, Math.round((width * 2) / 3)),
  };

  function makeGuide(key, vertical, defaultPos) {
    const guide = root.group().attr({ id: `guide-${key}` });
    let position = defaultPos;

    const core = vertical
      ? guide.line(position, 0, position, height)
      : guide.line(0, position, width, position);
    core
      .attr("pointer-events", "none")
      .stroke({
        color: CORE_COLOR,
        width: 2,
        dasharray: "0.1,7",
        linecap: "round",
      });

    // Прозрачная «толстая» полоса для удобного захвата линии мышью
    const hit = vertical
      ? guide
          .rect(HIT_THICKNESS, height)
          .move(position - HIT_THICKNESS / 2, 0)
      : guide.rect(width, HIT_THICKNESS).move(0, position - HIT_THICKNESS / 2);
    hit
      .fill({ color: "#000", opacity: 0 })
      .style("cursor", vertical ? "ew-resize" : "ns-resize");

    let dragging = false;
    let startPos = 0;
    let startPosValue = position;

    const clientPos = (e) => {
      const p = guide.point(e.clientX, e.clientY);
      return vertical ? p.x : p.y;
    };

    const updatePosition = (p) => {
      // Не выпускаем направляющую за пределы svg canvas (актуальные размеры)
      position = Math.min(Math.max(p, 0), vertical ? canvasSize.width : canvasSize.height);
      if (vertical) {
        core.plot(position, 0, position, canvasSize.height);
        hit.x(position - HIT_THICKNESS / 2);
      } else {
        core.plot(0, position, canvasSize.width, position);
        hit.y(position - HIT_THICKNESS / 2);
      }
    };

    hit.node.addEventListener("pointerdown", (e) => {
      dragging = true;
      startPos = clientPos(e);
      startPosValue = position;
      hit.node.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    hit.node.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      updatePosition(startPosValue + (clientPos(e) - startPos));
    });

    const endDrag = () => {
      dragging = false;
    };
    hit.node.addEventListener("pointerup", endDrag);
    hit.node.addEventListener("pointercancel", endDrag);

    return { guide, core, hit, position: () => position };
  }

  // Применяем сохраненную видимость
  Object.keys(visibility).forEach((key) => {
    if (!visibility[key] && current[key]) current[key].guide.hide();
  });

  elements = current;

  return current;
}

// Подгонка направляющих под новые размеры canvas
// (линии тянутся/укорачиваются, позиции сохраняются)
export function resizeGuides(width, height) {
  if (!elements) return;
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (w <= 0 || h <= 0) return;

  // обновляем общее состояние размеров: от него зависят
  // и перетаскивание, и рисование линий
  canvasSize.width = w;
  canvasSize.height = h;

  const clampPos = (p, max) => Math.min(Math.max(p, 0), max);

  const hG = elements.h;
  hG.core.plot(0, clampPos(hG.position(), h), w, clampPos(hG.position(), h));
  hG.hit.size(w, HIT_THICKNESS).y(clampPos(hG.position(), h) - HIT_THICKNESS / 2);

  ["v1", "v2"].forEach((key) => {
    const g = elements[key];
    const pos = clampPos(g.position(), w);
    g.core.plot(pos, 0, pos, h);
    g.hit.size(HIT_THICKNESS, h).x(pos - HIT_THICKNESS / 2);
  });
}
