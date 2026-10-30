// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
// const D = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
// const x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / D
// const y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / D
function lineTolineIntersectionPoint({ x1, y1, x2, y2, x3, y3, x4, y4 }) {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  // if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
  //   debugger
  //   return false
  // }

  // Return a object with the x and y coordinates of the intersection
  let x = x1 + ua * (x2 - x1);
  let y = y1 + ua * (y2 - y1);

  return { x, y };
}
function getAngleBetweenPoints(x1, y1, x2, y2, x3, y3) {
  // https://snipp.ru/php/angle-3-points#link-js-funkciya
  return (
    ((Math.atan2(y3 - y1, x3 - x1) - Math.atan2(y2 - y1, x2 - x1)) * 180) /
    Math.PI
  );
}
function getLength(p, q) {
  // https://en.wikipedia.org/wiki/Euclidean_distance
  const a = p.x1 - q.x2;
  const b = p.y1 - q.y2;
  return Math.sqrt(a * a + b * b);
}
function getLengthByCoordinates({ x1, y1, x2, y2 }) {
  // https://en.wikipedia.org/wiki/Euclidean_distance
  const a = x1 - x2;
  const b = y1 - y2;
  return Math.sqrt(a * a + b * b);
}
function getParallelLine([p1x, p1y], [p2x, p2y], [nx, ny]) {
  let wx = (p2x - p1x) / 2;
  let wy = (p2y - p1y) / 2;
  return { st: { x: nx - wx, y: ny - wy }, en: { x: nx + wx, y: ny + wy } };
}
function getLineFromAnglePoint(AP, PMC1, PMC2, corner) {
  const tempLine = getParallelLine(
    [PMC1.attr("cx"), PMC1.attr("cy")],
    [PMC2.attr("cx"), PMC2.attr("cy")],
    [AP.attr("cx"), AP.attr("cy")],
  );
  tempLine.st = lineTolineIntersectionPoint({
    x1: tempLine.st.x,
    y1: tempLine.st.y,
    x2: tempLine.en.x,
    y2: tempLine.en.y,
    x3: PMC1.attr("cx"),
    y3: PMC1.attr("cy"),
    x4: corner.x,
    y4: corner.y,
  });
  tempLine.en = lineTolineIntersectionPoint({
    x1: tempLine.st.x,
    y1: tempLine.st.y,
    x2: tempLine.en.x,
    y2: tempLine.en.y,
    x3: PMC2.attr("cx"),
    y3: PMC2.attr("cy"),
    x4: corner.x,
    y4: corner.y,
  });
  // tempLine.st.x = PMC1.attr('cx')
  // tempLine.en.y = PMC2.attr('cy')
  return tempLine;
}

import { getLineScale } from "@/scripts/geostyle.js";
import { Matrix } from "@svgdotjs/svg.js";

// Группы «снимков» рамок, закреплённых на изображении.
// IndexPage двигает их вместе с картинкой (зум/поворот/перетаскивание).
export const snapshotOverlayEntries = new Set();

function addMouseOverToPoint(point) {
  point.on("mouseover", () =>
    point.stroke({ color: "cyan", opacity: 0.7, width: 3 * getLineScale() }),
  );
  point.on("mouseout", () => point.stroke({ width: 0 }));
  return point;
}

function constrainPointMovement(
  point,
  baseFrame,
  lineStartX,
  lineStartY,
  tangentLine,
  updateMeasures,
) {
  const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
  const pointX = point.attr("cx");
  const pointY = point.attr("cy");

  // Проверяем, находится ли точка внутри baseFrame
  const isInside =
    pointX >= attrs_bf.x &&
    pointX <= attrs_bf.x + attrs_bf.width &&
    pointY >= attrs_bf.y &&
    pointY <= attrs_bf.y + attrs_bf.height;

  let finalX = pointX;
  let finalY = pointY;

  if (!isInside) {
    // Если точка вышла за границы, возвращаем её к ближайшей границе
    finalX = Math.max(
      attrs_bf.x,
      Math.min(pointX, attrs_bf.x + attrs_bf.width),
    );
    finalY = Math.max(
      attrs_bf.y,
      Math.min(pointY, attrs_bf.y + attrs_bf.height),
    );

    point.attr({ cx: finalX, cy: finalY });
  }

  // Обновляем линию
  tangentLine.attr({
    x1: lineStartX,
    y1: lineStartY,
    x2: finalX,
    y2: finalY,
  });

  updateMeasures();
}

function constrainVerticalPointMovement(
  point,
  baseFrame,
  lineBottomY,
  tangentLine,
  updateMeasures,
) {
  const attrs_bf = baseFrame.attr(["x", "y", "width", "height"]);
  const pointX = point.attr("cx");
  const pointY = point.attr("cy");

  // Проверяем, находится ли точка внутри baseFrame
  const isInside =
    pointX >= attrs_bf.x &&
    pointX <= attrs_bf.x + attrs_bf.width &&
    pointY >= attrs_bf.y &&
    pointY <= attrs_bf.y + attrs_bf.height;

  let finalX = pointX;
  let finalY = pointY;

  if (!isInside) {
    // Если точка вышла за границы, возвращаем её к ближайшей границе
    finalX = Math.max(
      attrs_bf.x,
      Math.min(pointX, attrs_bf.x + attrs_bf.width),
    );
    finalY = Math.max(
      attrs_bf.y,
      Math.min(pointY, attrs_bf.y + attrs_bf.height),
    );

    point.attr({ cx: finalX, cy: finalY });
  }

  // Обновляем вертикальную линию
  tangentLine.attr({
    x1: finalX,
    y1: lineBottomY,
    x2: finalX,
    y2: finalY,
  });

  updateMeasures();
}

/**
 * Полупрозрачная иконка замочка в центре baseFrame.
 * Клик переключает om.settings.pinToImage[frameKey] — когда замок закрыт,
 * точки этой рамки следуют за перемещением изображения. Рамки Left и Dorsal
 * переключаются независимо (frameKey: "left" | "dorsal").
 *
 * options (необязательный):
 *   points         — { role: svgElement } измеряемые точки рамки (для снимков)
 *   updateMeasures — функция пересчёта измерений после восстановления рамки
 *   show           — функция показа рамки (иконка карандашика)
 */
function addLockToggle(
  draw,
  mobjects,
  baseFrame,
  om,
  bus,
  frameResizer,
  frameKey,
  options = {},
) {
  const SIZE = 28;
  const isPinned = () => Boolean(om.value.settings.pinToImage?.[frameKey]);

  // текстовая подпись над иконками — om.label или "масштаб не задан".
  // Вместо обводки текста используем полупрозрачную подложку:
  // при компенсации зума обводка выглядела слишком толстой.
  const labelEl = draw
    .text("")
    .font({ size: 11, family: "Arial" })
    .fill("rgba(0,0,0,0.8)")
    .attr("text-anchor", "middle")
    .attr("pointer-events", "none");

  const labelBg = draw
    .rect(0, 0)
    .fill("#fff")
    .attr({ "fill-opacity": 0.75, "pointer-events": "none" });

  // замочек
  const fo = draw.foreignObject(SIZE, SIZE);
  const icon = document.createElement("i");
  icon.className = "material-icons";
  icon.style.cssText =
    "font-size:20px;line-height:28px;display:block;text-align:center;" +
    "color:#555;text-shadow:0 0 4px rgba(255,255,255,0.9);opacity:0.55;" +
    "transition:opacity .2s;cursor:pointer;user-select:none;";
  const updateIcon = (locked) => {
    icon.textContent = locked ? "lock" : "lock_open";
  };
  updateIcon(isPinned());
  fo.node.appendChild(icon);

  // при включённом следовании за картинкой ручку размера отключаем;
  // сама рамка остаётся перетаскиваемой — её dragmove двигает картинку
  const applyPinState = (pinned) => {
    mobjects.draggable(true);
    if (frameResizer) frameResizer.draggable(!pinned);
  };

  // иконка сброса поворота (refresh) — появляется справа от замочка,
  // когда рамка повёрнута; клик возвращает в горизонталь + размыкает замок
  const resetFo = draw.foreignObject(SIZE, SIZE);
  const resetIcon = document.createElement("i");
  resetIcon.className = "material-icons";
  resetIcon.textContent = "refresh";
  resetIcon.style.cssText =
    "font-size:20px;line-height:28px;display:block;text-align:center;" +
    "color:#555;text-shadow:0 0 4px rgba(255,255,255,0.9);opacity:1;" +
    "transition:opacity .2s;cursor:pointer;user-select:none;";
  resetFo.node.appendChild(resetIcon);

  // зелёная иконка «Добавить запись» — справа от замочка. Видна только
  // когда задан масштаб. Клик добавляет запись в таблицу измерений и
  // фиксирует копию рамки с точками на изображении (с карандашиком).
  const addFo = draw.foreignObject(SIZE, SIZE);
  const addIcon = document.createElement("i");
  addIcon.className = "material-icons";
  addIcon.textContent = "add_circle";
  addIcon.style.cssText =
    "font-size:20px;line-height:28px;display:block;text-align:center;" +
    "color:#2e7d32;text-shadow:0 0 4px rgba(255,255,255,0.9);opacity:1;" +
    "transition:opacity .2s;cursor:pointer;user-select:none;";
  addFo.node.appendChild(addIcon);

  // снимки записей: record_no -> { state, g, entry }
  const snapshots = new Map();
  // активная запись, с которой сейчас связана рамка
  let activeRecordNo = null;
  // восстановленное состояние после карандашика — для dragmove, если GDF удалён
  let anchorState = null;

  // текущее состояние рамки (для восстановления карандашиком)
  const captureState = () => {
    const bf = baseFrame.attr(["x", "y", "width", "height"]);
    const points = {};
    if (options.points) {
      Object.entries(options.points).forEach(([role, el]) => {
        points[role] = { cx: el.attr("cx"), cy: el.attr("cy") };
      });
    }
    return {
      matrix: mobjects.matrixify().toArray(),
      frame: {
        x: Number(bf.x),
        y: Number(bf.y),
        width: Number(bf.width),
        height: Number(bf.height),
      },
      points,
      label: om.value.label,
    };
  };

  // восстановить основную рамку в состояние снимка
  const restoreSnapshot = (state) => {
    if (!state) return;
    mobjects.transform(new Matrix(state.matrix));
    baseFrame.attr(state.frame);
    if (frameResizer) {
      frameResizer.attr({
        x: state.frame.x + state.frame.width,
        y: state.frame.y + state.frame.height,
      });
    }
    if (options.points && state.points) {
      Object.entries(state.points).forEach(([role, p]) => {
        const el = options.points[role];
        if (el) {
          el.attr({ cx: p.cx, cy: p.cy });
          // принудительно пересчитать все линии (тангенсные, к углам, меры)
          el.fire("dragmove");
        }
      });
    }
    if (options.show) options.show(true);
    if (options.updateMeasures) options.updateMeasures();
  };

  // статичная копия рамки с точками, закреплённая на изображении + карандашик
  const createSnapshotVisual = (recordNo, state) => {
    removeSnapshot(recordNo);
    const g = draw.group();
    const rect = draw
      .rect(state.frame.width, state.frame.height)
      .move(state.frame.x, state.frame.y)
      .fill({ color: "#2e7d32", opacity: 0.04 })
      .stroke({
        color: "#2e7d32",
        width: 1.5 * getLineScale(),
        dasharray: "4,3",
      });
    g.add(rect);
    Object.values(state.points || {}).forEach((p) => {
      if (p.cx === undefined) return;
      const dot = draw
        .circle(6)
        .center(p.cx, p.cy)
        .fill("#2e7d32")
        .attr("opacity", 0.85);
      g.add(dot);
    });
    // подпись записи — по центру Green Dashed Frame
    if (state.label) {
      const gdfLabel = draw
        .text(state.label)
        .font({ size: 12, family: "Arial" })
        .fill("#2e7d32")
        .attr({
          "text-anchor": "middle",
          "dominant-baseline": "central",
          x: state.frame.x + state.frame.width / 2,
          y: state.frame.y + state.frame.height / 2,
        });
      g.add(gdfLabel);
    }
    g.transform(new Matrix(state.matrix));

    const pencilFo = draw.foreignObject(SIZE, SIZE);
    const pencilIcon = document.createElement("i");
    pencilIcon.className = "material-icons";
    pencilIcon.textContent = "edit";
    pencilIcon.style.cssText =
      "font-size:16px;line-height:22px;display:block;text-align:center;" +
      "color:#1565c0;text-shadow:0 0 4px rgba(255,255,255,0.95);opacity:0.95;" +
      "cursor:pointer;user-select:none;background:rgba(255,255,255,0.7);" +
      "border-radius:50%;";
    pencilIcon.title = `Редактировать запись № ${recordNo}`;
    pencilFo.node.appendChild(pencilIcon);
    pencilFo.attr({
      x: state.frame.x + state.frame.width - SIZE,
      y: state.frame.y - SIZE,
      width: SIZE,
      height: SIZE,
    });
    g.add(pencilFo);

    // клик по карандашику — рамка встаёт на место снимка (режим правки записи)
    pencilIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      const snap = snapshots.get(recordNo);
      if (!snap) return;
      restoreSnapshot(snap.state);
      removeSnapshot(recordNo); // GDF исчезает
      anchorState = snap.state; // запоминаем для dragmove
      activeRecordNo = recordNo; // следующий клик плюса → обновление
      bus.emit("record-selected", { frame: frameKey, recordNo });
    });
    pencilIcon.addEventListener("mousedown", (e) => e.stopPropagation());

    const entry = { frame: frameKey, group: g };
    snapshotOverlayEntries.add(entry);
    snapshots.set(recordNo, { state, g, entry });
    // основная рамка всегда поверх снимка
    mobjects.front();
  };

  const removeSnapshot = (recordNo) => {
    const snap = snapshots.get(recordNo);
    if (!snap) return;
    snapshots.delete(recordNo);
    if (snap.entry) snapshotOverlayEntries.delete(snap.entry);
    if (snap.g) snap.g.remove();
  };

  // клик по зелёной иконке: добавить/обновить запись и закрепить снимок
  addIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!om.value.settings.scalebar_ready) return;
    if (activeRecordNo === null) {
      // новая запись в таблице измерений
      bus.emit("add-record-request", { frame: frameKey });
      createSnapshotVisual(om.value.record_no, captureState());
      // разблокировать замок, если был включён — рамка остаётся свободной
      if (isPinned()) {
        om.value.settings.pinToImage[frameKey] = false;
        updateIcon(false);
        applyPinState(false);
        bus.emit("pin-image-toggled", { frame: frameKey, value: false });
        position();
      }
    } else {
      // обновить активную запись текущими измерениями
      const recordNo = activeRecordNo;
      activeRecordNo = null; // вернуться в режим «добавить»
      bus.emit("update-record-request", { frame: frameKey, recordNo });
      createSnapshotVisual(recordNo, captureState());
    }
  });
  addIcon.addEventListener("mousedown", (e) => e.stopPropagation());
  addIcon.addEventListener("mouseenter", () => { addIcon.style.opacity = "0.85"; });
  addIcon.addEventListener("mouseleave", () => { addIcon.style.opacity = "1"; });

  // удаление записи из таблицы убирает и снимок
  bus.on("record-deleted", ({ recordNo }) => {
    removeSnapshot(recordNo);
    if (activeRecordNo === recordNo) {
      activeRecordNo = null;
      anchorState = null;
    }
  });

  // подложка под текст: размеры пересчитываются после смены текста и зума,
  // чтобы рамка оставалась постоянной на экране
  const measureLabel = () => {
    let bb = labelEl.bbox();
    if (!bb.width || !bb.height) {
      // скрытая группа не даёт getBBox; измеряем видимый клон в корне svg
      const clone = labelEl.clone().addTo(draw);
      bb = clone.bbox();
      clone.remove();
    }
    return bb;
  };
  const layoutLabel = () => {
    const visible = Boolean(labelEl.text());
    labelEl.attr("opacity", visible ? "1" : "0");
    labelBg.attr("opacity", visible ? "1" : "0");
    if (!visible) return;
    const M = mobjects.matrixify();
    const scale = Math.hypot(M.a, M.b) || 1;
    const pad = isPinned() ? 3 : 3 / scale;
    const bb = measureLabel();
    labelBg.attr({
      x: bb.x - pad,
      y: bb.y - pad,
      width: bb.width + pad * 2,
      height: bb.height + pad * 2,
    });
  };

  // подписка на обновление метки извне
  const updateLabel = () => {
    const txt = om.value.settings.scalebar_ready
      ? (om.value.label || "")
      : "масштаб не задан";
    labelEl.text(txt);
    layoutLabel();
  };
  bus.on("label-changed", updateLabel);
  bus.on("measure-updated", updateLabel);

  // текущая позиция + видимость иконок
  const position = () => {
    const f = baseFrame.attr(["x", "y", "width", "height"]);
    const cx = Number(f.x) + Number(f.width) / 2;
    const cy = Number(f.y) + Number(f.height) / 2;

    // Группа масштабируется при зуме. Если замок включён (рамка привязана
    // к картинке), иконки масштабируются вместе с ней. Если замок выключен,
    // компенсируем масштаб обратным — размер на экране остаётся постоянным.
    const M = mobjects.matrixify();
    const scale = Math.hypot(M.a, M.b) || 1;
    const inv = isPinned() ? 1 : 1 / scale;
    const w = SIZE * inv;
    const h = SIZE * inv;

    // замочек левее центра, иконка сброса правее, зелёная «запись» ещё правее
    fo.attr({
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE,
      transform: `translate(${cx - w} ${cy - h / 2}) scale(${inv})`,
    });
    resetFo.attr({
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE,
      transform: `translate(${cx} ${cy - h / 2}) scale(${inv})`,
    });
    addFo.attr({
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE,
      transform: `translate(${cx + w} ${cy - h / 2}) scale(${inv})`,
    });

    // текстовая подпись — центрирована над замочком
    labelEl.attr("x", cx - w / 2);
    labelEl.attr("y", cy - h / 2 - 4 * inv);
    layoutLabel();

    // показать refresh, только если группа реально повёрнута
    const angle = Math.atan2(M.b, M.a);
    const rotated = Math.abs(angle) > 0.005;
    const visible = rotated;
    resetFo.attr("opacity", visible ? "1" : "0");
    resetFo.node.style.pointerEvents = visible ? "auto" : "none";

    // зелёная иконка «Добавить запись» — только при заданном масштабе
    const scaleReady = Boolean(om.value.settings.scalebar_ready);
    addFo.attr("opacity", scaleReady ? "1" : "0");
    addFo.node.style.pointerEvents = scaleReady ? "auto" : "none";
  };
  applyPinState(isPinned());

  // клик по замочку — переключение следования за картинкой
  icon.addEventListener("click", (e) => {
    e.stopPropagation();
    const v = !isPinned();
    om.value.settings.pinToImage[frameKey] = v;
    updateIcon(v);
    bus.emit("pin-image-toggled", { frame: frameKey, value: v });
    // сразу пересчитать масштаб иконок под новое состояние замка
    position();
  });
  icon.addEventListener("mousedown", (e) => e.stopPropagation());
  icon.addEventListener("mouseenter", () => { icon.style.opacity = "0.85"; });
  icon.addEventListener("mouseleave", () => { icon.style.opacity = "0.55"; });

  // клик по refresh — сброс поворота + размыкание замка
  resetIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    // сброс поворота (как двойной клик по рамке)
    const M = mobjects.matrixify();
    const angle = Math.atan2(M.b, M.a);
    if (Math.abs(angle) > 0.005) {
      const b = mobjects.bbox();
      mobjects.transform(M.clone().rotate(-(angle * 180) / Math.PI, b.cx, b.cy));
    }
    // размыкаем замок
    om.value.settings.pinToImage[frameKey] = false;
    updateIcon(false);
    resetFo.attr("opacity", "0");
    resetFo.node.style.pointerEvents = "none";
    bus.emit("pin-image-toggled", { frame: frameKey, value: false });
  });
  resetIcon.addEventListener("mousedown", (e) => e.stopPropagation());
  resetIcon.addEventListener("mouseenter", () => { resetIcon.style.opacity = "0.85"; });
  resetIcon.addEventListener("mouseleave", () => { resetIcon.style.opacity = "1"; });

  // При замке перетаскивание внутри рамки двигает её вместе с картинкой:
  // рамку уже сдвигает svg.draggable, а IndexPage по этому событию
  // двигает изображение и остальные рамки с включённым замком.
  mobjects.on("dragmove", (event) => {
    // Если рамка была закреплена за записью, а теперь её перетащили
    // в другое место — возвращаем режим «добавить» (зелёный плюс).
    if (activeRecordNo !== null) {
      const snap = snapshots.get(activeRecordNo);
      const cur = mobjects.matrixify();
      let ref = null;
      if (snap) {
        ref = snap.g.matrixify();
      } else if (anchorState) {
        // GDF удалён карандашиком; сравниваем с восстановленной матрицей
        ref = new Matrix(anchorState.matrix);
      }
      if (ref && (Math.abs(cur.e - ref.e) > 6 || Math.abs(cur.f - ref.f) > 6)) {
        activeRecordNo = null;
        anchorState = null;
      }
    }
    if (!isPinned()) return;
    const { dx, dy } = event.detail;
    if (!dx && !dy) return;
    bus.emit("frame-dragged", { frame: frameKey, group: mobjects, dx, dy });
  });

  // синхронизация из других мест (другой модуль с тем же frameKey,
  // например Left и Concave Left)
  bus.on("pin-image-toggled", ({ frame, value }) => {
    if (frame !== frameKey) return;
    updateIcon(value);
    applyPinState(value);
    position();
  });
  // после программного поворота оверлеев (rotateImage) обновляем
  // позицию + видимость иконки сброса
  bus.on("overlays-transformed", () => position());

  mobjects.add(fo).add(resetFo).add(addFo).add(labelBg).add(labelEl);
  updateLabel();
  position();

  return { field: fo, resetField: resetFo, position, removeSnapshot };
}

export {
  lineTolineIntersectionPoint,
  getAngleBetweenPoints,
  getLength,
  getLengthByCoordinates,
  addMouseOverToPoint,
  getLineFromAnglePoint,
  constrainPointMovement,
  constrainVerticalPointMovement,
  addLockToggle,
};
