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
 * Справа от замка — заметная зелёная кнопка «+»: сохраняет запись и создаёт
 * копию рамки для следующей. Она видна только после задания масштаба.
 */
function addLockToggle(
  draw,
  mobjects,
  baseFrame,
  om,
  bus,
  frameResizer,
  frameKey,
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

  // кнопка «+» справа от замочка: добавляет запись в таблицу,
  // замораживает текущий набор baseFrame и создаёт копию для следующей записи.
  // Крупная зелёная кнопка с белым крестом — заметнее полупрозрачного замка.
  const addFo = draw.foreignObject(SIZE, SIZE);
  const addIcon = document.createElement("i");
  addIcon.className = "material-icons";
  addIcon.textContent = "add";
  addIcon.title = "Добавить запись и создать копию рамки";
  addIcon.style.cssText =
    "font-size:20px;line-height:24px;display:block;width:24px;height:24px;" +
    "margin:2px;box-sizing:border-box;border-radius:50%;text-align:center;" +
    "color:#fff;background:#127a35;box-shadow:0 1px 4px rgba(0,0,0,0.45);" +
    "opacity:1;transition:opacity .2s,transform .15s;cursor:pointer;" +
    "user-select:none;";
  addFo.node.appendChild(addIcon);
  addIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    bus.emit("add-record");
  });
  addIcon.addEventListener("mousedown", (e) => e.stopPropagation());
  addIcon.addEventListener("mouseenter", () => {
    addIcon.style.opacity = "0.9";
    addIcon.style.transform = "scale(1.08)";
  });
  addIcon.addEventListener("mouseleave", () => {
    addIcon.style.opacity = "1";
    addIcon.style.transform = "scale(1)";
  });

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

  // «+» показываем только после того, как задан масштаб: без него запись
  // сохранять нельзя, и кнопка не должна вводить в заблуждение
  const syncAddVisibility = () => {
    const ready = Boolean(om.value.settings.scalebar_ready);
    addFo.attr("opacity", ready ? "1" : "0");
    addFo.node.style.pointerEvents = ready ? "auto" : "none";
  };

  // При активации записи иконка «+» меняется на дискету «сохранить»,
  // фон из зелёного становится оранжевым.
  bus.on("record-edit-state", ({ editing }) => {
    if (editing) {
      addIcon.textContent = "save";
      addIcon.title = "Обновить запись";
      addIcon.style.backgroundColor = "#ff8f00";
      addIcon.style.boxShadow = "0 1px 4px rgba(0,0,0,0.45)";
    } else {
      addIcon.textContent = "add";
      addIcon.title = "Добавить запись и создать копию рамки";
      addIcon.style.backgroundColor = "#127a35";
      addIcon.style.boxShadow = "0 1px 4px rgba(0,0,0,0.45)";
    }
  });

  // подписка на обновление метки извне
  const updateLabel = () => {
    const ready = Boolean(om.value.settings.scalebar_ready);
    const hasValue = ready && Boolean(om.value.label);
    // при пустой метке показываем бледную подсказку, по которой можно кликнуть
    const txt = ready ? (om.value.label || "метка") : "масштаб не задан";
    labelEl.text(txt);
    labelEl.fill(hasValue || !ready ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.4)");
    labelEl.attr("pointer-events", ready ? "auto" : "none");
    labelEl.node.style.cursor = ready ? "text" : "default";
    layoutLabel();
    syncAddVisibility();
  };
  bus.on("label-changed", updateLabel);
  bus.on("measure-updated", updateLabel);

  // --- редактирование метки прямо на рамке ---------------------------------
  // Клик по подписи открывает поле ввода: Enter или клик вне — сохранить,
  // Esc — отменить. Значение общее для всех рамок (om.label).
  let labelEditFo = null;
  const finishLabelEdit = (commit) => {
    if (!labelEditFo) return;
    // снимаем ссылку до remove(): удаление input синхронно вызывает blur,
    // и повторный вызов finishLabelEdit должен сразу выйти
    const fo = labelEditFo;
    labelEditFo = null;
    const input = fo.node.querySelector("input");
    const value = input ? input.value.trim() : "";
    fo.remove();
    labelEl.attr("opacity", "1");
    layoutLabel();
    if (commit) {
      om.value.label = value;
      bus.emit("label-changed");
    }
  };
  const startLabelEdit = (event) => {
    if (event) event.stopPropagation();
    if (labelEditFo) return;
    if (!om.value.settings.scalebar_ready) return;

    // bbox подписи в координатах холста (учитывает трансформацию группы)
    const bb = labelEl.bbox();
    const width = Math.max(130, bb.width + 24);
    const height = 22;
    labelEditFo = draw.foreignObject(width, height);
    labelEditFo.attr({
      x: bb.x + bb.width / 2 - width / 2,
      y: bb.y - 4,
      width,
      height,
    });
    const input = document.createElement("input");
    input.type = "text";
    input.value = om.value.label || "";
    input.placeholder = "метка";
    input.style.cssText =
      "width:100%;height:100%;box-sizing:border-box;margin:0;" +
      "border:1px solid #1976d2;border-radius:3px;padding:1px 5px;" +
      "font:11px Arial;background:#fff;color:#000;outline:none;";
    labelEditFo.node.appendChild(input);
    labelEl.attr("opacity", "0");
    labelBg.attr("opacity", "0");

    input.addEventListener("mousedown", (ev) => ev.stopPropagation());
    input.addEventListener("click", (ev) => ev.stopPropagation());
    input.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (ev.key === "Enter") {
        ev.preventDefault();
        finishLabelEdit(true);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        finishLabelEdit(false);
      }
    });
    input.addEventListener("blur", () => finishLabelEdit(true));
    // фокус после завершения текущего клика
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  };
  labelEl.on("click", startLabelEdit);
  labelEl.on("mousedown", (ev) => ev.stopPropagation());

  // текущая позиция + видимость иконки сброса
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

    // замочек левее центра, «+» сразу справа от него, иконка сброса — ещё правее
    fo.attr({
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE,
      transform: `translate(${cx - w} ${cy - h / 2}) scale(${inv})`,
    });
    addFo.attr({
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE,
      transform: `translate(${cx} ${cy - h / 2}) scale(${inv})`,
    });
    resetFo.attr({
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE,
      transform: `translate(${cx + w} ${cy - h / 2}) scale(${inv})`,
    });
    // «+» доступен только при заданном масштабе
    syncAddVisibility();

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

  mobjects.add(addFo).add(fo).add(resetFo).add(labelBg).add(labelEl);
  updateLabel();
  position();

  return {
    field: fo,
    addField: addFo,
    resetField: resetFo,
    position,
  };
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
