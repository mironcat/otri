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

import { getLineScale } from "src/scripts/geostyle.js";

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
  const SPACE = SIZE; // расстояние между центрами иконок
  const isPinned = () => Boolean(om.value.settings.pinToImage?.[frameKey]);

  // текстовая подпись над иконками — om.label или "not scaled"
  const labelEl = draw
    .text("")
    .font({ size: 11, family: "Arial" })
    .fill("rgba(0,0,0,0.8)")
    .attr("text-anchor", "middle")
    .attr("paint-order", "stroke fill")
    .attr("stroke", "rgba(255,255,255,0.85)")
    .attr("stroke-width", 1.5);

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

  // подписка на обновление метки извне
  const updateLabel = () => {
    const txt = om.value.settings.scalebar_ready
      ? (om.value.label || "")
      : "not scaled";
    labelEl.text(txt);
    labelEl.attr("opacity", txt ? "1" : "0");
  };
  bus.on("label-changed", updateLabel);
  bus.on("measure-updated", updateLabel);
  updateLabel();

  // текущая позиция + видимость иконки сброса
  const position = () => {
    const f = baseFrame.attr(["x", "y", "width", "height"]);
    const cx = Number(f.x) + Number(f.width) / 2;
    const cy = Number(f.y) + Number(f.height) / 2;
    // замочек левее центра, иконка сброса правее
    fo.move(cx - SPACE, cy - SIZE / 2);
    resetFo.move(cx, cy - SIZE / 2);

    // текстовая подпись — центрирована над замочком
    labelEl.attr("x", cx - SPACE + SIZE / 2);
    labelEl.attr("y", cy - SIZE / 2 - 4);

    // показать refresh, только если группа реально повёрнута
    const M = mobjects.matrixify();
    const angle = Math.atan2(M.b, M.a);
    const rotated = Math.abs(angle) > 0.005;
    const visible = rotated;
    resetFo.attr("opacity", visible ? "1" : "0");
    resetFo.node.style.pointerEvents = visible ? "auto" : "none";
  };
  position();
  applyPinState(isPinned());

  // клик по замочку — переключение следования за картинкой
  icon.addEventListener("click", (e) => {
    e.stopPropagation();
    const v = !isPinned();
    om.value.settings.pinToImage[frameKey] = v;
    updateIcon(v);
    bus.emit("pin-image-toggled", { frame: frameKey, value: v });
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
  });
  // после программного поворота оверлеев (rotateImage) обновляем
  // позицию + видимость иконки сброса
  bus.on("overlays-transformed", () => position());

  mobjects.add(fo).add(resetFo).add(labelEl);

  return { field: fo, resetField: resetFo, position };
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
