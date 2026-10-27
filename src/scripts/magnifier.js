// Лупа: круглое окно с увеличенным участком изображения, помогает ставить
// точки точно. Окно появляется при нажатии и удержании левой кнопки мыши
// на активной векторной точке (кружке: оранжевом/«жёлтом», зелёном, красном),
// следует за точкой во время перетаскивания и скрывается при отпускании.
// Синий/полупрозрачный прямоугольник (baseFrame) лупу не активирует.
// Лупа рисуется под всеми векторными элементами (выше только изображение),
// клики проходят сквозь неё. Кнопка в шапке и клавиша Z включают/выключают
// саму функцию (e.code = KeyZ, раскладка не важна).

import { adopt } from "@svgdotjs/svg.js";

const LENS_RADIUS = 60;
const LENS_ZOOM = 3;

// Состояние глобальное, чтобы переживать пересоздание canvas (draw.clear())
const visibility = { magnifier: true };

// Текущая реализация лупы на текущем draw
let lens = null;
// «Больше лупа не нужна» — прячем окно и забываем активную точку.
// Ссылка присваивается в initMagnifier (там доступ к текущим элементам)
let deactivateLens = () => {};
let keyHandler = null;
// Слушатели window на перетаскивание точки (живут дольше содержимого)
let dragWatchers = null;
// svg.js-элемент точки, которую сейчас тянут (null = лупа не активна)
let activePoint = null;
// Уведомление об изменении функции (для синхронизации кнопки в шапке)
let notify = () => {};

export function getMagnifierVisible() {
  return visibility.magnifier;
}

export function setMagnifierVisible(value) {
  visibility.magnifier = value;
  if (!value) deactivateLens();
  notify(getMagnifierVisible());
}

export function toggleMagnifier() {
  setMagnifierVisible(!visibility.magnifier);
}

export function onMagnifierChange(fn) {
  notify = typeof fn === "function" ? fn : () => {};
}

export function initMagnifier(draw) {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  if (dragWatchers) {
    window.removeEventListener("pointermove", dragWatchers.move);
    window.removeEventListener("pointerup", dragWatchers.up);
    window.removeEventListener("pointercancel", dragWatchers.up);
    dragWatchers = null;
  }

  if (lens) {
    try {
      lens.group.remove();
    } catch (e) {
      /* элемент уже удален через draw.clear() */
    }
  }
  activePoint = null;
  deactivateLens = () => {};

  const group = draw.group().attr({ id: "magnifier" });
  // «Лежит» на изображении: вставляем сразу над группой основного
  // изображения (#maig), т.е. ниже всех остальных векторных элементов
  const target = draw.findOne("#maig");
  const idx = target ? draw.children().indexOf(target) + 1 : null;
  if (idx != null && idx > 0) draw.add(group, idx);

  // Все внутри лупы не перехватывает мышь: клики проходят к элементам ниже
  group.attr("pointer-events", "none");

  const content = group.group();

  // Круглая маска окна лупы
  const clipTarget = content.group();
  const clipShape = draw
    .circle(LENS_RADIUS * 2)
    .move(-LENS_RADIUS, -LENS_RADIUS);
  clipTarget.clipWith(clipShape);

  // Увеличенное содержимое под центром окна
  const zoom = clipTarget.group();
  zoom.use("maig");

  // Рамка и перекрестие в центре
  const applyAt = (cx, cy) => {
    content.attr("transform", `translate(${cx} ${cy})`);
    // точка под центром окна попадает в его центр
    zoom.attr(
      "transform",
      `scale(${LENS_ZOOM}) translate(${-cx} ${-cy})`,
    );
  };

  content
    .circle(LENS_RADIUS * 2)
    .move(-LENS_RADIUS, -LENS_RADIUS)
    .fill("none")
    .stroke({ color: "#333", width: 1.5 });
  content
    .line(-8, 0, 8, 0)
    .stroke({ color: "#fff", width: 1, opacity: 0.8 });
  content
    .line(0, -8, 0, 8)
    .stroke({ color: "#fff", width: 1, opacity: 0.8 });

  group.hide();

  lens = { group, applyAt };

  // --- Активация лупы на точке ---------------------------------------------

  // центр точки в координатах корневого svg (учитывает все трансформации);
  // важно передать draw в rbox(), иначе координаты будут относительно страницы
  const centerOf = (el) => {
    try {
      const b = el.rbox(draw);
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    } catch (e) {
      return null;
    }
  };

  const onPointerDown = (e) => {
    if (!visibility.magnifier || e.button !== 0) return;
    const t = e.target;
    // активируем только векторные точки-кружки,
    // но не элементы самой лупы и не прямоугольники
    if (!t || String(t.tagName).toLowerCase() !== "circle") return;
    if (t.closest && t.closest("#magnifier")) return;
    let el = null;
    try {
      el = adopt(t);
    } catch (err) {
      el = null;
    }
    if (!el) return;
    activePoint = el;
    const p = centerOf(el);
    if (p) {
      lens.applyAt(p.x, p.y);
      lens.group.show();
    }
    // ВАЖНО: без e.preventDefault() — перехват pointerdown подавил бы
    // последующий mousedown, на котором сидит плагин drag (точка бы не таскалась)
  };

  const onPointerMove = () => {
    if (!activePoint || !lens) return;
    const p = centerOf(activePoint);
    // если точка исчезла (канвас очищен) — прячем лупу
    if (!p) {
      deactivate();
      return;
    }
    lens.applyAt(p.x, p.y);
    lens.group.show();
  };

  const deactivate = () => {
    if (lens) lens.group.hide();
    activePoint = null;
  };
  deactivateLens = deactivate;

  // capture: svg.draggable делает stopPropagation на самой точке,
  // поэтому слушаем на корневом svg в фазе захвата
  draw.node.addEventListener("pointerdown", onPointerDown, true);

  // следим за точкой и завершаем по отпусканию кнопки
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", deactivate);
  window.addEventListener("pointercancel", deactivate);
  dragWatchers = { move: onPointerMove, up: deactivate };

  // Переключение функции клавишей Z (раскладка не важна); не мешаем вводу
  keyHandler = (e) => {
    if (e.code !== "KeyZ") return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target;
    if (
      t &&
      t !== window &&
      (t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
    toggleMagnifier();
  };
  window.addEventListener("keydown", keyHandler);

  if (visibility.magnifier) notify(true);

  return lens;
}
