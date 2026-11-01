// import { SVG } from '@svgdotjs/svg.js'
// let draw = SVG()

// Исходное положение красной линейки на холсте (до перетаскивания).
const SCALEBAR_DEFAULT_POSITION = { x: 850, y: 540 };

function initScalebar(
  scalebar,
  draw,
  scales,
  onLengthChange,
  onEndpointsDragEnd,
) {
  const scale_length = scales.length;
  // console.log(scale_length)
  const scalebar_resizer = draw.group().attr({ id: "scalebar-resizer" });
  const scalebar_line = draw
    .line(5, 5, 95, 5)
    .stroke({ color: "red", width: 4, linecap: "butt" });
  const scalebar_start = draw
    .rect(15, 15)
    .fill("red")
    .opacity(0.3)
    .draggable()
    .move(0, 0);
  const scalebar_end = draw
    .rect(15, 15)
    .fill("red")
    .opacity(0.3)
    .draggable()
    .move(90, 0);
  const scalebar_label = draw
    .text(scale_length)
    .font({ fill: "red" })
    .move(105, 0);
  scalebar_resizer
    .add(scalebar_line)
    .add(scalebar_start)
    .add(scalebar_end)
    .add(scalebar_label)
    .draggable()
    .move(SCALEBAR_DEFAULT_POSITION.x, SCALEBAR_DEFAULT_POSITION.y);
  const scalebar_burned = draw.group().attr({ id: "scalebar-burned" });
  const scalebar_base = draw.rect(100, 5).fill("gray");
  const scalebar_blabel = draw.text("!!!!").font({ fill: "red" }).move(40, -15);
  scalebar_burned.add(scalebar_base).add(scalebar_blabel).move(10, 570);
  scalebar.remove();
  scalebar = draw
    .group()
    .attr({ id: "scalebar-main" })
    .add(scalebar_resizer)
    .add(scalebar_burned);
  scalebar_start.on("dragmove.namespace", function (event) {
    var coords = scalebar_start.attr(["x", "y"]);
    // scalebar_base.plot(coords.x+5, coords.y+5)
    scalebar_line.attr({ x1: coords.x + 6, y1: coords.y + 6 });
  });
  scalebar_end.on("dragmove.namespace", function (event) {
    var coords = scalebar_end.attr(["x", "y"]);
    scalebar_line.attr({ x2: coords.x + 6, y2: coords.y + 6 });
    scalebar_label.attr({ x: coords.x + 15, y: coords.y });
    // scalebar_length.value = scalebar_base.length()
  });

  // После изменения концов линейки пересчитываем масштаб (в IndexPage).
  const notifyEndpointsDragEnd = () => {
    if (typeof onEndpointsDragEnd === "function") onEndpointsDragEnd();
  };
  scalebar_start.on("dragend", notifyEndpointsDragEnd);
  scalebar_end.on("dragend", notifyEndpointsDragEnd);

  // двойной клик по линии — возвращаем линейку к состоянию по умолчанию.
  // Используем mousedown + таймштамп, потому что svg.draggable перехватывает
  // клики, и обычный dblclick до элемента не доходит.
  {
    let last = 0;
    scalebar_line.node.addEventListener("mousedown", function (e) {
      const now = Date.now();
      if (now - last < 350) {
        e.stopPropagation(); // не даём группе начать перетаскивание
        resetScalebar(scalebar, draw);
        last = 0;
        return;
      }
      last = now;
    });
  }

  // --- редактирование длины прямо у линии (как метка у рамки) -------------
  // Клик по числу открывает поле ввода: Enter или клик вне — сохранить,
  // Esc — отменить. После изменения длины масштаб пересчитывается.
  let lengthEditFo = null;
  const finishLengthEdit = (commit) => {
    if (!lengthEditFo) return;
    const fo = lengthEditFo;
    lengthEditFo = null;
    const input = fo.node.querySelector("input");
    const raw = input ? input.value.trim().replace(",", ".") : "";
    fo.remove();
    scalebar_label.attr("opacity", "1");
    if (!commit) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return;
    if (value === Number(scales.length)) return;
    scales.length = value;
    scalebar_label.text(value);
    if (typeof onLengthChange === "function") onLengthChange();
    else scalebar_blabel.text(value);
  };
  const startLengthEdit = (event) => {
    if (event) event.stopPropagation();
    if (lengthEditFo) return;

    // поле ввода добавляем в ту же группу, поэтому оно совпадает с числом
    // при любом зуме/сдвиге/повороте линейки
    const bb = scalebar_label.node.getBBox();
    const width = Math.max(90, bb.width + 24);
    const height = 22;
    lengthEditFo = draw.foreignObject(width, height);
    lengthEditFo.attr({
      x: bb.x + bb.width / 2 - width / 2,
      y: bb.y - 4,
      width,
      height,
    });
    scalebar_resizer.add(lengthEditFo);
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.value = String(scales.length);
    input.style.cssText =
      "width:100%;height:100%;box-sizing:border-box;margin:0;" +
      "border:1px solid #1976d2;border-radius:3px;padding:1px 5px;" +
      "font:11px Arial;background:#fff;color:#000;outline:none;";
    lengthEditFo.node.appendChild(input);
    scalebar_label.attr("opacity", "0");

    input.addEventListener("mousedown", (ev) => ev.stopPropagation());
    input.addEventListener("click", (ev) => ev.stopPropagation());
    input.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (ev.key === "Enter") {
        ev.preventDefault();
        finishLengthEdit(true);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        finishLengthEdit(false);
      }
    });
    input.addEventListener("blur", () => finishLengthEdit(true));
    // фокус после завершения текущего клика
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  };
  scalebar_label.on("click", startLengthEdit);
  scalebar_label.on("mousedown", (ev) => ev.stopPropagation());
  scalebar_label.node.style.cursor = "text";

  return scalebar;
}

// Применить матрицу к точке (SVG matrix a,b,c,d,e,f).
const applyMatrix = (m, x, y) => ({
  x: m.a * x + m.c * y + m.e,
  y: m.b * x + m.d * y + m.f,
});

// Сброс красной линейки к исходному виду: снимаем накопленные при зуме,
// повороте и перетаскивании трансформации и ставим её на место по умолчанию.
function resetScalebar(scalebar, draw) {
  if (!scalebar) return;
  const resizer = scalebar.get(0);
  if (!resizer) return;
  scalebar.attr("transform", null);
  resizer.attr("transform", null);
  resizer.move(SCALEBAR_DEFAULT_POSITION.x, SCALEBAR_DEFAULT_POSITION.y);
  positionScalebarBurned(draw, scalebar);
}
function getScalebarLength(scalebar, draw, scales) {
  const s_resizer = scalebar && scalebar.get(0);
  if (!s_resizer) return 0;
  const scalebar_line = s_resizer.get(0);
  const scalebar_label = s_resizer.get(3);
  scalebar_label.text(scales.value.length);

  // Переводим концы линии из локальных координат группы в координаты
  // исходного изображения. Это делает калибровку независимой от текущего
  // увеличения и от того, заперта ли линейка на картинке.
  const line = scalebar_line.attr(["x1", "y1", "x2", "y2"]);
  // matrixify() возвращает только собственную трансформацию элемента,
  // поэтому учитываем ещё и трансформацию внешней группы линейки.
  const M = scalebar.matrixify().multiplyO(s_resizer.matrixify());
  const r1 = applyMatrix(M, Number(line.x1) || 0, Number(line.y1) || 0);
  const r2 = applyMatrix(M, Number(line.x2) || 0, Number(line.y2) || 0);

  const image = draw && draw.findOne ? draw.findOne("#maig") : null;
  if (image) {
    const inv = image.matrixify().clone().inverseO();
    const i1 = applyMatrix(inv, r1.x, r1.y);
    const i2 = applyMatrix(inv, r2.x, r2.y);
    return Math.hypot(i2.x - i1.x, i2.y - i1.y);
  }
  return Math.hypot(r2.x - r1.x, r2.y - r1.y);
}

// Зелёная «впечатанная» линейка показывает уже заданный масштаб: её ширина
// вычисляется из калибровки (физ. единиц на пиксель изображения), а не из
// текущего положения красной линейки. Поэтому зум и сброс красной линейки
// не меняют калибровку.
function updateScalebarBurned(draw, scalebar, scales) {
  const burned = scalebar && scalebar.get(1);
  const base = burned && burned.get(0);
  const label = burned && burned.get(1);
  if (!base) return 0;

  const physical = Number(scales.value.length) || 0;
  const factor = Number(scales.value.factor);
  const image = draw && draw.findOne ? draw.findOne("#maig") : null;
  let imageScale = 1;
  if (image) {
    const m = image.matrixify();
    imageScale = Math.hypot(m.a, m.b) || 1;
  }
  const imagePixels =
    Number.isFinite(factor) && factor > 0 ? physical / factor : physical;
  const width = Math.max(0, imagePixels) * imageScale;
  base.width(width).fill("green");
  if (label) label.text(physical).font({ fill: "green" });
  return width;
}

// Зелёная «впечатанная» масштабная линейка всегда в левом нижнем углу
// видимой части холста. SVG может быть выше окна, поэтому ориентируемся
// на реальную видимую нижнюю границу (getBoundingClientRect + viewport).
function positionScalebarBurned(draw, scalebar) {
  if (!draw || !scalebar) return;
  const burned = scalebar.get(1);
  const base = burned && burned.get(0);
  const node = draw.node;
  if (!base || !node) return;

  const rect = node.getBoundingClientRect();
  if (!rect.height) return;

  // переводим CSS-пиксели в пользовательские единицы SVG (обычно 1:1)
  const attrHeight = Number(draw.height()) || rect.height;
  const scaleY = rect.height / attrHeight || 1;
  const viewportBottom = Math.min(rect.bottom, window.innerHeight);
  const visibleHeight = Math.max(0, (viewportBottom - rect.top) / scaleY);

  const barHeight = Number(base.attr("height")) || 5;
  const margin = 20;
  burned.move(margin, Math.max(margin, visibleHeight - margin - barHeight));
}

export {
  initScalebar,
  getScalebarLength,
  positionScalebarBurned,
  updateScalebarBurned,
  resetScalebar,
};
