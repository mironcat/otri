<template>
  <q-page class="column canvas-page">
    <div class="row q-ml-md q-mt-md">
      <div class="q-gutter-sm">
        <q-btn color="secondary" @click="zoomIn" icon="zoom_in" />
        <q-btn color="secondary" @click="zoomOut" icon="zoom_out" />
        <q-btn color="secondary" @click="rotateImage(-0.5)" icon="rotate_left" />
        <q-btn color="secondary" @click="rotateImage(0.5)" icon="rotate_right" />
        <q-btn v-show="!om.settings.image_lock" color="secondary" @click="
          mainimage.draggable(false);
        om.settings.image_lock = !om.settings.image_lock;
        " icon="lock_open" />
        <q-btn v-show="om.settings.image_lock" color="secondary" @click="
          mainimage.draggable(true);
        om.settings.image_lock = !om.settings.image_lock;
        " icon="lock" />

        <q-checkbox v-model="om.lateral_side" @click="
          bus.emit('lateral-show', om.lateral_side & !om.concave_vs);
        bus.emit('concave-vs', om.lateral_side & om.concave_vs);
        " label="Латеральная" color="primary" />

        <q-radio v-show="om.lateral_side" v-model="om.side" val="left" label="Левая"
          @click="bus.emit('side-change', 'blue')" />
        <q-radio v-show="om.lateral_side" v-model="om.side" val="right" label="Правая"
          @click="bus.emit('side-change', 'gray')" />

        <q-toggle v-show="om.lateral_side" v-model="om.concave_vs" label="Вогнутый брюшной край" @click="
          bus.emit('concave-vs', om.concave_vs);
        bus.emit('lateral-show', !om.concave_vs);
        " />
        <q-checkbox v-model="om.dorsal_side" @click="bus.emit('dorsal-show', om.dorsal_side)" label="Дорсальная"
          color="green" />
        <q-checkbox v-show="om.dorsal_side" v-model="om.half"
          @click="om.half ? (om.fullness = 'half') : (om.fullness = 'full')" label="Половина" color="black" />
      </div>
    </div>
    <div class="row q-ma-md canvas-row">
      <div id="canvas" ref="canvasRef"></div>
    </div>
    <div class="row q-ma-md q-gutter-sm flex items-center">
      <q-file bg-color="secondary" dense v-model="imagefile" label="Выберите файл" filled style="max-width: 400px"
        @update:model-value="fileUploaded">
        <template v-slot:prepend>
          <q-icon name="attach_file" />
        </template>
      </q-file>
      <q-input dense v-model="scales.length" label="Длина масштабной линейки" type="number" filled
        style="max-width: 150px" />

      <q-btn color="primary" @click="setScaleBar" label="Задать масштаб" />
      <q-input v-show="om.settings.scalebar_ready" dense v-model="om.label" filled label="Метка"
        style="max-width: 150px" class="q-mr-sm" />
      <q-btn v-show="om.settings.scalebar_ready" icon="save" color="primary" @click="addRecord" label="Добавить запись"
        class="q-mr-sm" />
      <q-btn v-show="rows.lateral.length > 0 || rows.dorsal.length > 0" color="brown" icon-right="archive"
        label="Экспорт в CSV" no-caps @click="exportCombinedTable" />
      <q-btn v-show="rows.lateral.length > 0 || rows.dorsal.length > 0" :color="showTables ? 'secondary' : 'primary'"
        :icon="showTables ? 'visibility_off' : 'visibility'" :label="showTables ? 'Скрыть' : 'Показать результаты'"
        no-caps class="q-ml-auto" @click="showTables = !showTables">
        <q-tooltip>{{ showTables ? 'Скрыть результаты' : 'Показать результаты' }}</q-tooltip>
      </q-btn>
      <!-- <q-chip>{{ scales.factor }}</q-chip> -->
    </div>
    <div v-show="showTables" class="tables-panel q-mx-md q-mb-md">

      <div class="tables-split">
        <div class="tables-half col q-pr-sm">
          <div class="row">
            <div class="table-wrap">
              <q-table class="compact-table" :rows="combinedRows" :columns="tableColumns" row-key="record_no"
                dense no-data-label="нет данных" @row-click="onRowClick" :row-class="rowClass">
                <template v-slot:body-cell-action="props">
                  <q-td :props="props">
                    <q-btn color="primary" icon-right="delete" no-caps flat dense
                      @click.stop="deleteRecord(props.row)" />
                  </q-td>
                </template>
                <template v-slot:top-left>
                  <strong>Результаты измерений</strong>
                </template>
                <template v-slot:top-right>
                  <q-btn size="sm" no-caps class="q-ml-sm" :color="showDescription ? 'secondary' : 'primary'"
                    :icon="showDescription ? 'visibility_off' : 'visibility'"
                    :label="showDescription ? 'Скрыть описание' : 'Показать описание'"
                    @click="showDescription = !showDescription">
                    <q-tooltip>{{ showDescription ? 'Скрыть текстовое описание' : 'Показать текстовое описание'
                    }}</q-tooltip>
                  </q-btn>
                </template>
              </q-table>
            </div>
          </div>
        </div>
        <div v-show="showDescription" class="description-half col q-pl-md">
          <div class="row items-center q-mb-xs">
            <div class="text-subtitle2">Описание</div>
            <q-space />
            <q-select v-model="selectedRecordNo" :options="recordOptions" option-value="record_no"
              option-label="recordLabel" emit-value map-options dense outlined options-dense label="Запись"
              :disable="recordOptions.length === 0" class="record-select"
              @update:model-value="onRecordSelected" />
          </div>
          <div class="description-body">
            <Description :om="selectedMeasurements" />
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>
<script setup>
import { useQuasar } from "quasar";

const $q = useQuasar();

function wrapCsvValue(val, formatFn, row) {
  let formatted = formatFn !== void 0 ? formatFn(val, row) : val;

  formatted =
    formatted === void 0 || formatted === null ? "" : String(formatted);

  formatted = formatted.split('"').join('""');
  /**
   * Excel accepts \n and \r in strings, but some other CSV parsers do not
   * Uncomment the next two lines to escape new lines
   */
  // .split('\n').join('\\n')
  // .split('\r').join('\\r')

  return `"${formatted}"`;
}

// Вспомогательная функция для форматирования чисел
const formatNumber = (val) =>
  val !== undefined && val !== null ? `${val.toFixed()}` : "";
// Значения данных (left/right, full/half) остаются прежними —
// переводим только их отображение в таблицах и CSV
const formatSide = (val) =>
  val === "right" ? "правая" : val === "left" ? "левая" : val;
const formatFullness = (val) =>
  val === "half" ? "половина" : val === "full" ? "полная" : val;
const baseColumns = [
  { name: "action", label: "Удалить", field: "action" },
  {
    name: "no",
    align: "center",
    label: "№",
    field: "record_no",
    sortable: true,
  },
  {
    name: "filename",
    required: true,
    label: "Имя файла",
    align: "left",
    field: "filename",
    // format: val => `File:${val}`,
    sortable: true,
  },
  {
    name: "label",
    align: "center",
    label: "Метка",
    field: "label",
    sortable: true,
  },
];
// Колонки объединённой таблицы: латеральные и дорсальные данные в одной строке
const tableColumns = baseColumns.concat([
  {
    name: "side",
    align: "center",
    label: "Сторона",
    field: "side",
    format: formatSide,
    sortable: true,
  },
  {
    name: "fullness",
    align: "center",
    label: "Полнота",
    field: "fullness",
    format: formatFullness,
    sortable: true,
  },
  {
    name: "length",
    align: "center",
    label: "L",
    field: "length",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "height",
    align: "center",
    label: "H",
    field: "height",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "width",
    align: "center",
    label: "W",
    field: "width",
    format: formatNumber,
    sortable: true,
  },
]);
const rows = ref({
  lateral: [],
  dorsal: [],
});
// Единая таблица: латеральная и дорсальная части одной записи
// объединяются по record_no (та же логика, что и в экспорте CSV)
const combinedRows = computed(() => {
  const merged = new Map();
  const mergeRow = (row) => {
    merged.set(row.record_no, {
      ...(merged.get(row.record_no) || {}),
      ...row,
    });
  };
  rows.value.lateral.forEach(mergeRow);
  rows.value.dorsal.forEach(mergeRow);
  return [...merged.values()].sort((a, b) => a.record_no - b.record_no);
});
// Видимость таблиц с измерениями под canvas
const showTables = ref(false);
// Видимость текстового описания (правая половина нижней панели)
const showDescription = ref(true);

import { watch, inject, computed, nextTick } from "vue";
import { exportFile } from "quasar";
import "@svgdotjs/svg.draggable.js";
import { Matrix, Point } from "@svgdotjs/svg.js";
import { onMounted, onBeforeUnmount, ref } from "vue";
// import { lineTolineIntersectionPoint, getLengthByCoordinates, getAnglePoints } from '@/scripts/utils.js'
import { initScalebar, getScalebarLength } from "@/scripts/scalebar.js";
import leftSideObjects from "@/scripts/leftsideobjects.js";
import DorsalSideObjects from "@/scripts/dorsalobjects.js";
import concaveLeftSideObjects from "@/scripts/concaveobjects.js";
import { initGuides, resizeGuides } from "@/scripts/guides.js";
import { initMagnifier } from "@/scripts/magnifier.js";
import { combineRecordMeasurements } from "@/scripts/interpretation.js";
import Description from "@/components/Description.vue";

const canvasRef = ref();
// let imagepath = ref('/src/assets/ost1.jpg')
const imagefile = ref(null);
// let draggableMainImage = ref(true)
let draw = inject("svg");
let bus = inject("bus");
let canvasResizeObserver = null;
const om = ref({
  record_no: 0,
  label: "без метки",
  filename: "",
  side: "left",
  length: 0,
  length_dorsal: 0,
  height: 0,
  width: 0,
  lateral_side: true,
  dorsal_side: false,
  projection: "lateral",
  half: false,
  fullness: "full",
  concave_vs: true,
  ad: { alfa: 0, hc: 0, vc: 0, ln: 0, sln: 0 },
  pd: { alfa: 0, hc: 0, vc: 0, ln: 0, sln: 0 },
  av: { alfa: 0, hc: 0, vc: 0, ln: 0, sln: 0 },
  pv: { alfa: 0, hc: 0, vc: 0, ln: 0, sln: 0 },
  al: { alfa: 0, hc: 0, vc: 0, ln: 0, sln: 0 },
  pl: { alfa: 0, hc: 0, vc: 0, ln: 0, sln: 0 },
  ar: { alfa: 0, hc: 0, vc: 0, ln: 0, sln: 0 },
  pr: { alfa: 0, hc: 0, vc: 0, ln: 0, sln: 0 },
  v: { lv: 0, lvl: 0, dv: 0 },
  settings: {
    image_lock: false,
    scalebar_ready: false,
    // независимые замки следования для рамок Left и Dorsal
    pinToImage: { left: false, dorsal: false },
  },
});
// Запись, выбранная для текстового описания
const selectedRecordNo = ref(null);

// Список записей: латеральная и дорсальная строки объединяются по record_no
const recordOptions = computed(() => {
  const records = new Map();
  rows.value.lateral.forEach((row) => {
    records.set(row.record_no, {
      record_no: row.record_no,
      label: row.label,
      filename: row.filename,
      sides: ["Л"],
    });
  });
  rows.value.dorsal.forEach((row) => {
    const record = records.get(row.record_no);
    if (record) {
      record.sides.push("Д");
    } else {
      records.set(row.record_no, {
        record_no: row.record_no,
        label: row.label,
        filename: row.filename,
        sides: ["Д"],
      });
    }
  });
  return [...records.values()]
    .sort((a, b) => a.record_no - b.record_no)
    .map((record) => ({
      ...record,
      recordLabel: `№ ${record.record_no} — ${record.label || "без метки"} (${record.sides.join("+")})`,
    }));
});

// Если выбранной записи больше нет (например, её удалили),
// выбираем последнюю сохранённую
watch(recordOptions, (options) => {
  if (!options.length) {
    selectedRecordNo.value = null;
    return;
  }
  if (!options.some((option) => option.record_no === selectedRecordNo.value)) {
    selectedRecordNo.value = options[options.length - 1].record_no;
  }
});

// Строки таблиц для выбранной записи
const selectedRecord = computed(() => {
  const recordNo = selectedRecordNo.value;
  if (recordNo === null || recordNo === undefined) return null;
  return {
    lateral:
      rows.value.lateral.find((row) => row.record_no === recordNo) || null,
    dorsal:
      rows.value.dorsal.find((row) => row.record_no === recordNo) || null,
  };
});

// Измерения выбранной записи для компонента описания
const selectedMeasurements = computed(() => {
  const record = selectedRecord.value;
  if (!record) return null;
  return combineRecordMeasurements(record.lateral, record.dorsal);
});

// Клик по строке таблицы выбирает запись и показывает её описание
const onRowClick = (evt, row) => {
  if (row?.record_no === undefined || row?.record_no === null) return;
  selectedRecordNo.value = row.record_no;
  // активируем сохранённую геометрию записи для редактирования
  activateRecord(row.record_no);
  showDescription.value = true;
};

// Выбор записи в списке описания тоже активирует её наборы
const onRecordSelected = (recordNo) => {
  if (recordNo === undefined || recordNo === null) return;
  activateRecord(recordNo);
};

// Поиск индекса строки в массиве rows по номеру записи
const findRowIdx = (arr, recordNo) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].record_no === recordNo) return i;
  }
  return -1;
};

// Подсветка строки выбранной записи
const rowClass = computed(
  () => (row) =>
    row.record_no === selectedRecordNo.value ? "selected-record-row" : "",
);
const scales = ref({
  length: 100,
  factor: 1,
  zoom: 1,
});

// Тонкая серая рамка по границам картинки — показывает область,
// за которую её можно перетаскивать. Обводка не утолщается при зуме.
const addImageFrame = (group, img) => {
  const x = Number(img.attr("x")) || 0;
  const y = Number(img.attr("y")) || 0;
  const width = Number(img.attr("width")) || 0;
  const height = Number(img.attr("height")) || 0;
  const frame = draw
    .rect(width, height)
    .move(x, y)
    .fill("none")
    .stroke({ color: "gray", width: 1 })
    .attr({ "vector-effect": "non-scaling-stroke" });
  group.add(frame);
  return frame;
};

let mainimage = draw.group().attr({ id: "maig" }).draggable();
const initialImage = draw
  .image("ost1.jpg")
  .attr("id", "mainimage")
  .size(400, 400)
  .move(300, 100);
mainimage.add(initialImage);
addImageFrame(mainimage, initialImage);
// let scalebar = draw.group().attr({ id: 'scalebar' })
let scalebar = draw.group().attr({ id: "scalebar" });
// initScalebar(scalebar, draw, scales.value)

// let mobjects = draw.group().attr({ id: 'mobjects' })
let lso = leftSideObjects(draw, om, scales, bus);
let dso = DorsalSideObjects(draw, om, scales, bus);
let concave_lso = concaveLeftSideObjects(draw, om, scales, bus);

// --- Отдельный набор baseFrame для каждой записи ---------------------------
// При добавлении записи геометрия текущих наборов сохраняется, а на холсте
// остаётся замороженная зелёная копия. Выбранная в таблице запись снова
// становится цветной и доступной для редактирования.
const recordFrames = new Map(); // record_no -> { left, concave, dorsal, ui }
const frozenGroups = new Map(); // record_no -> { left, concave, dorsal }
let activeRecordNo = null;
// подавление синхронизации Left/Concave при программном восстановлении записи
let skipConcaveSync = false;

// Наборы, которыми можно управлять. Ссылки читаем из переменных, потому что
// после загрузки нового файла они пересоздаются.
const overlayEntries = () => [
  ["left", lso],
  ["concave", concave_lso],
  ["dorsal", dso],
];

// Матрица изображения: от координат содержимого картинки к координатам холста.
// Учитывает и трансформацию группы (зум/поворот), и локальный сдвиг
// содержимого (перетаскивание картинки делает dmove её дочерних элементов).
// Геометрию записей храним относительно неё, чтобы замороженные рамки оставались
// привязанными к ракушке при зуме/повороте/сдвиге.
const imageMatrix = () => {
  const b = mainimage.bbox();
  return mainimage
    .matrixify()
    .multiply(new Matrix().translate(b.x, b.y));
};

// Снимок геометрии одного набора. Трансформация хранится относительно
// изображения, координаты рамки и точек — локальные для группы.
const captureSet = (obj) => {
  if (!obj || !obj.mobjects || !obj.baseFrame) return null;
  const rel = imageMatrix().inverse().multiply(obj.mobjects.matrixify());
  const points = {};
  Object.entries(obj.points || {}).forEach(([role, el]) => {
    if (!el) return;
    points[role] = {
      cx: Number(el.attr("cx")),
      cy: Number(el.attr("cy")),
    };
  });
  return {
    transform: [rel.a, rel.b, rel.c, rel.d, rel.e, rel.f],
    baseFrame: obj.baseFrame.attr(["x", "y", "width", "height"]),
    frameResizer: obj.frameResizer
      ? obj.frameResizer.attr(["x", "y"])
      : null,
    points,
  };
};

// Настройки интерфейса, которые влияют на отображение и расчёт записи
const captureUI = () => ({
  side: om.value.side,
  concave_vs: om.value.concave_vs,
  lateral_side: om.value.lateral_side,
  dorsal_side: om.value.dorsal_side,
  half: om.value.half,
  fullness: om.value.fullness,
  label: om.value.label,
});

// Вернуть геометрию набора из снимка (трансформация пересчитывается
// относительно текущего положения изображения)
const restoreSet = (obj, state) => {
  if (!obj || !state) return;
  // attr() применяет матрицу синхронно (transform() откладывает её до
  // следующего requestAnimationFrame, и updateMeasures ниже прочитал бы старую)
  obj.mobjects.attr(
    "transform",
    imageMatrix().multiply(new Matrix(state.transform)),
  );
  if (state.baseFrame) obj.baseFrame.attr(state.baseFrame);
  if (state.frameResizer && obj.frameResizer) {
    obj.frameResizer.attr(state.frameResizer);
  }
  Object.entries(state.points || {}).forEach(([role, p]) => {
    const el = obj.points ? obj.points[role] : null;
    if (el) el.attr({ cx: p.cx, cy: p.cy });
  });
  // пересчитать зависимости (линии к углам, кресты, меры)
  if (obj.refreshPoints) obj.refreshPoints();
  if (obj.updateMeasures) obj.updateMeasures();
};

// Включить сохранённую запись: режим, видимость сторон и геометрия наборов
const applyRecord = (rec) => {
  if (!rec || !rec.ui) return;
  const ui = rec.ui;

  // восстановление режима не должно копировать точки из другого режима
  skipConcaveSync = true;
  om.value.concave_vs = ui.concave_vs;
  om.value.side = ui.side;
  om.value.lateral_side = ui.lateral_side;
  om.value.dorsal_side = ui.dorsal_side;
  om.value.half = ui.half;
  om.value.fullness = ui.fullness;
  om.value.label = ui.label;
  nextTick(() => {
    skipConcaveSync = false;
  });

  bus.emit("side-change", ui.side === "right" ? "gray" : "blue");
  bus.emit("lateral-show", ui.lateral_side && !ui.concave_vs);
  bus.emit("concave-vs", ui.lateral_side && ui.concave_vs);
  bus.emit("dorsal-show", ui.dorsal_side);

  // Порядок важен: активный латеральный режим восстанавливаем последним,
  // чтобы общие значения (om.length/height) взялись из видимого набора.
  if (ui.concave_vs) {
    if (rec.left) restoreSet(lso, rec.left);
    if (rec.concave) restoreSet(concave_lso, rec.concave);
  } else {
    if (rec.concave) restoreSet(concave_lso, rec.concave);
    if (rec.left) restoreSet(lso, rec.left);
  }
  if (rec.dorsal) restoreSet(dso, rec.dorsal);
  // после смены трансформации групп пересчитываем позицию/масштаб иконок
  bus.emit("overlays-transformed");
};

// Убрать интерактивные элементы из замороженной копии (иконки, ручку размера).
// Дочерние элементы могут быть как группами, так и листьями (circle/path),
// поэтому рекурсия идёт только по контейнерам.
const stripFrozenHelpers = (el) => {
  if (!el || typeof el.children !== "function") return;
  el.children().forEach((child) => {
    const tag = child.node && String(child.node.tagName).toLowerCase();
    if (tag === "foreignobject" || child.hasClass("ui-resizer")) {
      child.remove();
      return;
    }
    stripFrozenHelpers(child);
  });
};

// Замороженная некликабельная копия набора, нарисованная под активным набором.
// Рамка ярко-зелёная (#00e676) — видна на тёмном и сером фоне.
// Остальная геометрия — приглушённые тёмные линии, читаемые на любом фоне.
const FROZEN_FRAME_COLOR = "#00e676";
const FROZEN_LINE_COLOR = "#333";
const FROZEN_FILL_COLOR = "#00e676";

const colorizeFrozenElement = (el) => {
  const tag = el.node && String(el.node.tagName).toLowerCase();
  if (tag === "rect") {
    // подложка подписи стороны остаётся белой, без зелёной обводки
    if (el.hasClass && el.hasClass("side-label-bg")) return;
    el.attr("stroke", FROZEN_FRAME_COLOR);
    return;
  }
  if (tag === "text") {
    el.attr("fill", FROZEN_LINE_COLOR);
    return;
  }
  if (tag === "circle") {
    el.attr("fill", FROZEN_FILL_COLOR);
    el.attr("stroke", FROZEN_LINE_COLOR);
    el.attr("stroke-width", "1");
    return;
  }
  // line, polyline
  el.attr("stroke", FROZEN_LINE_COLOR);
};

const makeFrozenClone = (obj, recordNo, key) => {
  if (!obj || !obj.mobjects) return null;
  const clone = obj.mobjects.clone();
  clone.attr({ id: `frozen-${key}-${recordNo}`, "data-record": recordNo });
  stripFrozenHelpers(clone);
  clone.attr({ "pointer-events": "none", opacity: "0.75", "aria-hidden": "true" });
  obj.mobjects.before(clone);
  // перекрасить после вставки: find() работает по дереву DOM
  clone.find("rect, circle, line, polyline, text").forEach(colorizeFrozenElement);

  // Полупрозрачная зелёная иконка карандаша по центру замороженной рамки —
  // клик активирует запись для редактирования (как выбор строки в таблице).
  const bf = obj.baseFrame.attr(["x", "y", "width", "height"]);
  const cx = Number(bf.x) + Number(bf.width) / 2;
  const cy = Number(bf.y) + Number(bf.height) / 2;

  const editFo = draw.foreignObject(24, 24);
  const editIcon = document.createElement("i");
  editIcon.className = "material-icons";
  editIcon.textContent = "edit";
  editIcon.title = "Редактировать запись";
  editIcon.style.cssText =
    "font-size:20px;line-height:24px;display:block;width:24px;height:24px;" +
    "text-align:center;color:rgba(0,230,118,0.85);" +
    "text-shadow:0 0 4px rgba(0,0,0,0.5);cursor:pointer;user-select:none;" +
    "transition:transform .15s,opacity .2s;";
  editFo.node.appendChild(editIcon);
  editFo.attr({
    x: cx - 12,
    y: cy - 12,
    width: 24,
    height: 24,
    "pointer-events": "auto",
  });
  editIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    activateRecord(recordNo);
  });
  editIcon.addEventListener("mouseenter", () => {
    editIcon.style.opacity = "1";
    editIcon.style.transform = "scale(1.12)";
  });
  editIcon.addEventListener("mouseleave", () => {
    editIcon.style.opacity = "";
    editIcon.style.transform = "";
  });
  clone.add(editFo);

  return clone;
};

const removeFrozenRecord = (recordNo) => {
  const groups = frozenGroups.get(recordNo);
  if (!groups) return;
  Object.values(groups).forEach((g) => g && g.remove());
  frozenGroups.delete(recordNo);
};

// Заморозить наборы записи: контрастные копии текущей геометрии
const freezeRecord = (recordNo) => {
  const rec = recordFrames.get(recordNo);
  if (!rec) return;
  removeFrozenRecord(recordNo);
  const groups = {};
  overlayEntries().forEach(([key, obj]) => {
    if (!obj || !rec[key]) return;
    groups[key] = makeFrozenClone(obj, recordNo, key);
  });
  frozenGroups.set(recordNo, groups);
};

// Пересчитать положение замороженных копий после трансформации изображения:
// каждая копия = текущая матрица изображения × сохранённая относительная
const refreshFrozenTransforms = () => {
  if (!frozenGroups.size) return;
  const mimg = imageMatrix();
  frozenGroups.forEach((groups, recordNo) => {
    const rec = recordFrames.get(recordNo);
    if (!rec) return;
    Object.entries(groups).forEach(([key, g]) => {
      const state = rec[key];
      if (!g || !state) return;
      g.attr(
        "transform",
        mimg.clone().multiply(new Matrix(state.transform)),
      );
      // точки/линии замороженной копии тоже не должны расти при зуме
      syncGroupStyle(g);
    });
  });
};

// Показать/скрыть замороженную копию записи (0 — скрыть, 0.75 — показать)
const setFrozenVisibility = (recordNo, opacity) => {
  const groups = frozenGroups.get(recordNo);
  if (!groups) return;
  Object.values(groups).forEach((g) => {
    if (g) g.attr("opacity", String(opacity));
  });
};

// Сделать запись активной: прячем её замороженную копию (зелёная рамка не мешает),
// а предыдущую активную запись (если была) — показываем снова.
const activateRecord = (recordNo) => {
  const rec = recordFrames.get(recordNo);
  if (!rec) return;
  if (activeRecordNo === recordNo) return;
  // показать frozenClone предыдущей активной записи
  if (activeRecordNo != null) {
    setFrozenVisibility(activeRecordNo, "0.75");
  }
  applyRecord(rec);
  activeRecordNo = recordNo;
  // скрыть frozenClone редактируемой записи
  setFrozenVisibility(recordNo, "0");
  bus.emit("record-edit-state", { editing: true });
};

// --- Синхронизация похожих точек между режимами измерения ------------------
// Совпадающие роли: PMC-точки a/p/d (сверху-слева, справа, снизу-сверху)
// и тангенсные точки ad/pd/av/pv. При переключении Concave ventral margin
// точки и рамка неработающего режима копируются из активного, чтобы
// оба набора оставались привязанными к одним и тем же местам изображения.
const SYNC_ROLES = ["a", "p", "d", "t_ad", "t_pd", "t_av", "t_pv"];

const syncOverlays = (active, target) => {
  if (
    !active ||
    !target ||
    !active.points ||
    !target.points ||
    !target.refreshPoints
  ) {
    return;
  }
  SYNC_ROLES.forEach((role) => {
    const s = active.points[role];
    const d = target.points[role];
    if (s && d) d.attr({ cx: s.attr("cx"), cy: s.attr("cy") });
  });
  // рамка должна совпадать (линии тангенсов идут от её углов)
  if (active.baseFrame && target.baseFrame) {
    target.baseFrame.attr({
      x: active.baseFrame.attr("x"),
      y: active.baseFrame.attr("y"),
      width: active.baseFrame.attr("width"),
      height: active.baseFrame.attr("height"),
    });
    target.frameResizer.attr({
      x: active.frameResizer.attr("x"),
      y: active.frameResizer.attr("y"),
    });
  }
  // пересчитать зависимую геометрию (линии к углам, кресты, меры).
  // Точки, отличающиеся между режимами, возвращаем в позиции
  // по умолчанию относительно только что скопированной рамки —
  // так же, как это делает resize рамки.
  if (target.resetModePoints) target.resetModePoints();
  target.refreshPoints();
};

watch(
  () => om.value.concave_vs,
  () => {
    // при восстановлении записи точки уже взяты из снимка — не копируем их
    if (skipConcaveSync) return;
    if (om.value.concave_vs) syncOverlays(lso, concave_lso);
    else syncOverlays(concave_lso, lso);
  },
);

watch(
  () => om.value.label,
  () => bus.emit("label-changed"),
);

// --- Управление визуальными размерами точек и линий -------------------------
// Кнопка "tune" в шапке меняет множители; здесь пересчитываем размеры
// с компенсацией текущего масштаба групп.
import { syncGroupStyle } from "@/scripts/geostyle.js";

// Подгонка размеров SVG под контейнер: канвас растягивается на всё
// свободное место (ширина и высота), оставшееся от панелей и таблиц.
function sizeCanvasToContainer() {
  if (!canvasRef.value) return;
  const width = Math.max(canvasRef.value.clientWidth, 400);
  const height = Math.max(canvasRef.value.clientHeight, 300);
  draw.size(width, height);
  resizeGuides(width, height);
}

// Привести размеры точек/линий всех наборов к текущим множителям
// и текущему масштабу групп (чтобы при зуме с замком они не росли).
const syncAllGeoStyles = () => {
  [lso, dso, concave_lso].forEach((obj) => {
    if (obj && obj.mobjects) syncGroupStyle(obj.mobjects);
  });
  frozenGroups.forEach((groups) => {
    Object.values(groups).forEach((g) => {
      if (g) syncGroupStyle(g);
    });
  });
};

bus.on("geo-style-changed", syncAllGeoStyles);
bus.on("overlays-transformed", syncAllGeoStyles);

onMounted(() => {
  // console.log(canvasRef.value)
  // draw = initSVG(canvasRef.value)
  draw.addTo(canvasRef.value);
  canvasRef.value.addEventListener("wheel", onWheelZoom, { passive: false });
  sizeCanvasToContainer();
  // Канвас занимает всю доступную ширину; при изменении размеров
  // контейнера (окно, drawer, dock) SVG подстраивается автоматически.
  canvasResizeObserver = new ResizeObserver(sizeCanvasToContainer);
  canvasResizeObserver.observe(canvasRef.value);
  // initMObjects(draw)
  addScaleBar();
  lso.addMeasureObjects().updateMeasures();
  dso.addMeasureObjects().updateMeasures();
  concave_lso.addMeasureObjects().updateMeasures();
  initGuides(draw);
  initMagnifier(draw);
  // направляющие создаются с дефолтным размером — сразу тянем на актуальный канвас
  sizeCanvasToContainer();
  bus.emit("lateral-show", om.value.lateral_side & !om.value.concave_vs);
  bus.emit("concave-vs", om.value.lateral_side & om.value.concave_vs);
  bus.emit("dorsal-show", om.value.dorsal_side);
  // this.console.log(canvasRef.value)
});

onBeforeUnmount(() => {
  if (canvasRef.value) {
    canvasRef.value.removeEventListener("wheel", onWheelZoom);
  }
  if (canvasResizeObserver) {
    canvasResizeObserver.disconnect();
    canvasResizeObserver = null;
  }
  bus.off("add-record", handleRecordAction);
});

// Обновить существующую запись новыми измерениями и геометрией
const updateRecord = (recordNo) => {
  if (!recordNo) return;
  const rec = recordFrames.get(recordNo);
  if (!rec) return;

  // Снимок геометрии наборов, относящихся к обновляемой записи
  const snapshots = {};
  overlayEntries().forEach(([key, obj]) => {
    if (key === "dorsal" && !om.value.dorsal_side) return;
    if (key !== "dorsal" && !om.value.lateral_side) return;
    const state = captureSet(obj);
    if (state) snapshots[key] = state;
  });
  snapshots.ui = captureUI();
  recordFrames.set(recordNo, snapshots);

  // перезаморозить: удалить старую копию, создать новую
  freezeRecord(recordNo);
  
  // разомкнуть замки, если были включены
  if (om.value.settings.pinToImage.left || om.value.settings.pinToImage.dorsal) {
    om.value.settings.pinToImage.left = false;
    om.value.settings.pinToImage.dorsal = false;
    bus.emit("pin-image-toggled", { frame: "left", value: false });
    bus.emit("pin-image-toggled", { frame: "dorsal", value: false });
  }
  
  activeRecordNo = null;

  // Сдвигаем активные наборы, чтобы замороженная копия была видна под ними
  overlayEntries().forEach(([key, obj]) => {
    if (!snapshots[key] || !obj || !obj.mobjects) return;
    const g = obj.mobjects;
    g.attr("transform", g.matrixify().translate(24, 24));
  });

  // Обновить строку в таблице новыми измерениями
  const rawdata = { ...JSON.parse(JSON.stringify(om.value)) };
  const basedata = (({ record_no, label, filename, side }) => ({
    record_no,
    label,
    filename,
  }))(rawdata);
  basedata.record_no = recordNo;

  if (om.value.lateral_side) {
    const lateraldata = (({ length, height, ad, pd, av, pv, v, side }) => ({
      side,
      length,
      height,
      ad_alfa: ad.alfa, ad_hc: ad.hc, ad_vc: ad.vc, ad_ln: ad.ln, ad_sln: ad.sln,
      pd_alfa: pd.alfa, pd_hc: pd.hc, pd_vc: pd.vc, pd_ln: pd.ln, pd_sln: pd.sln,
      av_alfa: av.alfa, av_hc: av.hc, av_vc: av.vc, av_ln: av.ln, av_sln: av.sln,
      pv_alfa: pv.alfa, pv_hc: pv.hc, pv_vc: pv.vc, pv_ln: pv.ln, pv_sln: pv.sln,
      v_lv: v.lv, v_lvl: v.lvl, v_dv: v.dv,
    }))(rawdata);
    const idx = findRowIdx(rows.value.lateral, recordNo);
    if (idx >= 0) rows.value.lateral[idx] = Object.assign({}, basedata, lateraldata);
  }
  if (om.value.dorsal_side) {
    const dorsaldata = (({
      fullness, length_dorsal, width, al, pl, ar, pr,
    }) => ({
      length_dorsal, width,
      fullness,
      ar_alfa: ar.alfa, ar_hc: ar.hc, ar_vc: ar.vc, ar_ln: ar.ln, ar_sln: ar.sln,
      pr_alfa: pr.alfa, pr_hc: pr.hc, pr_vc: pr.vc, pr_ln: pr.ln, pr_sln: pr.sln,
      al_alfa: al.alfa, al_hc: al.hc, al_vc: al.vc, al_ln: al.ln, al_sln: al.sln,
      pl_alfa: pl.alfa, pl_hc: pl.hc, pl_vc: pl.vc, pl_ln: pl.ln, pl_sln: pl.sln,
    }))(rawdata);
    const idx = findRowIdx(rows.value.dorsal, recordNo);
    if (idx >= 0) rows.value.dorsal[idx] = Object.assign({}, basedata, dorsaldata);
  }

  selectedRecordNo.value = recordNo;
  bus.emit("record-edit-state", { editing: false });
};

const addRecord = () => {
  if (!om.value.settings.scalebar_ready) {
    $q.notify({
      message: "Сначала задайте масштаб",
      color: "warning",
      icon: "straighten",
    });
    return;
  }
  if (!om.value.lateral_side && !om.value.dorsal_side) {
    $q.notify({
      message: "Выберите латеральную или дорсальную сторону",
      color: "warning",
      icon: "warning",
    });
    return;
  }

  // Снимок геометрии наборов, относящихся к сохраняемой записи
  const snapshots = {};
  overlayEntries().forEach(([key, obj]) => {
    if (key === "dorsal" && !om.value.dorsal_side) return;
    if (key !== "dorsal" && !om.value.lateral_side) return;
    const state = captureSet(obj);
    if (state) snapshots[key] = state;
  });
  snapshots.ui = captureUI();

  om.value.record_no = om.value.record_no + 1;
  const savedRecordNo = om.value.record_no;
  recordFrames.set(savedRecordNo, snapshots);

  // Текущий набор остаётся замороженной копией, следующий номер — для новой записи
  freezeRecord(savedRecordNo);
  activeRecordNo = null;

  // Сдвигаем активные наборы, чтобы замороженная копия была видна под ними.
  // Двигаем трансформацию группы (а не дочерние элементы): тогда при
  // активации записи restoreSet вернёт снимок точно, без остаточного сдвига.
  // Сдвигаем только сохранённые в этой записи наборы, чтобы скрытые в момент
  // сохранения стороны не накапливали смещение от каждой новой записи.
  overlayEntries().forEach(([key, obj]) => {
    if (!snapshots[key] || !obj || !obj.mobjects) return;
    const g = obj.mobjects;
    g.attr("transform", g.matrixify().translate(24, 24));
  });

  const rawdata = { ...JSON.parse(JSON.stringify(om.value)) };
  const basedata = (({ record_no, label, filename, side }) => ({
    record_no,
    label,
    filename,
  }))(rawdata);

  if (om.value.lateral_side) {
    // ========== НОВАЯ СТРУКТУРА ДАННЫХ (разделенные поля) ==========
    const lateraldata = (({ length, height, ad, pd, av, pv, v, side }) => ({
      side,
      length,
      height,
      // AD измерения
      ad_alfa: ad.alfa,
      ad_hc: ad.hc,
      ad_vc: ad.vc,
      ad_ln: ad.ln,
      ad_sln: ad.sln,
      // PD измерения
      pd_alfa: pd.alfa,
      pd_hc: pd.hc,
      pd_vc: pd.vc,
      pd_ln: pd.ln,
      pd_sln: pd.sln,
      // AV измерения
      av_alfa: av.alfa,
      av_hc: av.hc,
      av_vc: av.vc,
      av_ln: av.ln,
      av_sln: av.sln,
      // PV измерения
      pv_alfa: pv.alfa,
      pv_hc: pv.hc,
      pv_vc: pv.vc,
      pv_ln: pv.ln,
      pv_sln: pv.sln,
      // V измерения
      v_lv: v.lv,
      v_lvl: v.lvl,
      v_dv: v.dv,
    }))(rawdata);

    rows.value.lateral.push(Object.assign({}, basedata, lateraldata));
  }

  if (om.value.dorsal_side) {
    // ========== НОВАЯ СТРУКТУРА ДАННЫХ (разделенные поля) ==========
    const dorsaldata = (({
      fullness,
      length_dorsal,
      width,
      al,
      pl,
      ar,
      pr,
    }) => ({
      length_dorsal,
      width,
      // AR измерения
      fullness: fullness,
      ar_alfa: ar.alfa,
      ar_hc: ar.hc,
      ar_vc: ar.vc,
      ar_ln: ar.ln,
      ar_sln: ar.sln,
      // PR измерения
      pr_alfa: pr.alfa,
      pr_hc: pr.hc,
      pr_vc: pr.vc,
      pr_ln: pr.ln,
      pr_sln: pr.sln,
      // AL измерения
      al_alfa: al.alfa,
      al_hc: al.hc,
      al_vc: al.vc,
      al_ln: al.ln,
      al_sln: al.sln,
      // PL измерения
      pl_alfa: pl.alfa,
      pl_hc: pl.hc,
      pl_vc: pl.vc,
      pl_ln: pl.ln,
      pl_sln: pl.sln,
    }))(rawdata);

    rows.value.dorsal.push(Object.assign({}, basedata, dorsaldata));
  }

  // Сразу показываем описание только что сохранённой записи
  selectedRecordNo.value = savedRecordNo;
  bus.emit("record-edit-state", { editing: false });
};

// Кнопка «+» или «save» на рамке — создаёт новую запись или обновляет активную
const handleRecordAction = () => {
  if (activeRecordNo != null) {
    updateRecord(activeRecordNo);
  } else {
    addRecord();
  }
};

bus.on("add-record", handleRecordAction);

const deleteRecord = (row) => {
  rows.value.lateral = rows.value.lateral.filter(
    (r) => r.record_no !== row.record_no
  );
  rows.value.dorsal = rows.value.dorsal.filter(
    (r) => r.record_no !== row.record_no
  );
  // удаляем сохранённую геометрию и замороженную копию записи
  removeFrozenRecord(row.record_no);
  recordFrames.delete(row.record_no);
  if (activeRecordNo === row.record_no) {
    activeRecordNo = null;
    bus.emit("record-edit-state", { editing: false });
  }
};
const getFactor = () => {
  scales.value.factor =
    scales.value.length /
    (getScalebarLength(scalebar, scales) * scales.value.zoom);
};

// Группы векторных оверлеев (точки, рамки, линии) с привязкой к рамке.
// Left и Concave Left используют одну рамку Left, Dorsal — отдельную.
const followTargets = () => [
  { frame: "left", group: lso && lso.mobjects },
  { frame: "left", group: concave_lso && concave_lso.mobjects },
  { frame: "dorsal", group: dso && dso.mobjects },
].filter((t) => t.group);

// Только группы, у которых включён замок следования за картинкой
const pinnedGroups = () =>
  followTargets()
    .filter((t) => om.value.settings.pinToImage[t.frame])
    .map((t) => t.group);

// Смещение в локальных координатах группы -> вектор в координатах холста.
// Нужно, чтобы рамка и картинка двигались вместе даже после поворота/зума.
// matrixify() не зависит от видимости элемента (в отличие от screenCTM).
const localToScreenDelta = (group, dx, dy) => {
  const m = group.matrixify();
  const p0 = new Point(0, 0).transform(m);
  const p1 = new Point(dx, dy).transform(m);
  return { x: p1.x - p0.x, y: p1.y - p0.y };
};

// Сдвинуть группу на вектор холста, переведя его в её локальные координаты
const moveGroupByScreenDelta = (group, sx, sy) => {
  const inv = group.matrixify().inverse();
  const p0 = new Point(0, 0).transform(inv);
  const p1 = new Point(sx, sy).transform(inv);
  group.dmove(p1.x - p0.x, p1.y - p0.y);
};

// Зум меняет масштаб только картинки. Оверлеи масштабируются вместе с ней
// лишь при включённом замке; без замка они остаются на месте и не меняют
// размер. Картинка масштабируется svg.js вокруг локального центра её
// содержимого (матрица C); оверлею нужно применить ту же трансформацию,
// сконъюгированную матрицей картинки: G = M_img · C · M_img⁻¹.
// Работает при любом уже применённом перетаскивании/повороте/зуме картинки.
const followZoom = (factor) => {
  if (factor === 1) return;
  const groups = pinnedGroups();
  if (groups.length) {
    const mimg = mainimage.matrixify();
    const b = mainimage.bbox(); // локальный бокс содержимого картинки
    const C = new Matrix().scaleO(
      factor,
      factor,
      b.x + b.width / 2,
      b.y + b.height / 2,
    );
    const G = mimg.clone().multiplyO(C).multiplyO(mimg.clone().inverseO());
    groups.forEach((g) => {
      const M = new Matrix(G).multiplyO(g.matrixify());
      g.attr("transform", M);
    });
    // пересчитать позицию и масштаб иконок (замок/refresh)
    bus.emit("overlays-transformed");
  }
  // замороженные копии записей всегда следуют за изображением
  refreshFrozenTransforms();
};

const zoomIn = () => {
  mainimage.scale(1.1);
  followZoom(1.1);
  scales.value.zoom = scales.value.zoom * 1.1;
  getFactor();
};
const zoomOut = () => {
  mainimage.scale(0.9);
  followZoom(0.9);
  scales.value.zoom = scales.value.zoom * 0.9;
  getFactor();
};

// Зум колесом мыши над канвасом: один шаг 10% на «щелчок» колеса.
// Дельта накапливается, чтобы трекпад с мелкими событиями не zoom-ил слишком быстро.
let wheelDelta = 0;
const WHEEL_STEP = 50;
const onWheelZoom = (event) => {
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
  wheelDelta += event.deltaY * unit;
  if (Math.abs(wheelDelta) < WHEEL_STEP) return;
  if (wheelDelta < 0) zoomIn();
  else zoomOut();
  wheelDelta = 0;
};

// Поворот со следованием оверлеев при pinToImage (только для рамок с замком)
const rotateImage = (angle) => {
  mainimage.rotate(angle);
  const groups = pinnedGroups();
  if (groups.length) {
    const mimg = mainimage.matrixify();
    const b = mainimage.bbox();
    const C = new Matrix().rotate(angle, b.cx, b.cy);
    const G = mimg.clone().multiplyO(C).multiplyO(mimg.clone().inverseO());
    groups.forEach((g) => {
      g.attr("transform", new Matrix(G).multiplyO(g.matrixify()));
    });
    // обновить иконку сброса поворота в модулях
    bus.emit("overlays-transformed");
  }
  refreshFrozenTransforms();
};

// Если у рамки включён замок, перетаскивание картинки сдвигает и её оверлеи
const onImageDrag = function (event) {
  const { dx, dy } = event.detail;
  const d = localToScreenDelta(mainimage, dx, dy);
  pinnedGroups().forEach((g) => moveGroupByScreenDelta(g, d.x, d.y));
  // драггер шлёт dragmove до фактического сдвига картинки, поэтому матрица
  // изображения здесь ещё старая — двигаем замороженные копии на ту же экранную
  // дельту, что и запертые наборы
  frozenGroups.forEach((groups, recordNo) => {
    if (!recordFrames.has(recordNo)) return;
    Object.values(groups).forEach((g) => {
      if (!g) return;
      g.attr("transform", g.matrixify().translate(d.x, d.y));
    });
  });
};
mainimage.on("dragmove", onImageDrag);

// Перетаскивание внутри запертой рамки двигает её вместе с картинкой.
// Саму рамку уже сдвинул svg.draggable, здесь двигаем изображение
// и остальные рамки, у которых тоже включён замок.
const onFrameDragged = ({ frame, group, dx, dy }) => {
  if (!om.value.settings.pinToImage[frame]) return;
  const d = localToScreenDelta(group, dx, dy);
  moveGroupByScreenDelta(mainimage, d.x, d.y);
  followTargets().forEach((t) => {
    if (t.group === group) return;
    if (om.value.settings.pinToImage[t.frame]) {
      moveGroupByScreenDelta(t.group, d.x, d.y);
    }
  });
  // замороженные копии привязаны к изображению, которое только что сдвинулось
  refreshFrozenTransforms();
};
bus.on("frame-dragged", onFrameDragged);
const addScaleBar = () => {
  om.value.settings.scalebar_ready = false;
  scalebar = initScalebar(scalebar, draw, scales.value);
};
scalebar.click(function () {
  getFactor();
});
const setScaleBar = () => {
  om.value.settings.scalebar_ready = true;
  scales.value.zoom = 1;
  getFactor();
  lso.updateMeasures();
  concave_lso.updateMeasures();
  dso.updateMeasures();
};
let currentImageUrl = null;
const fileUploaded = (file) => {
  if (!file) return;
  draw.clear();
  // старые записи относились к прежнему изображению
  recordFrames.clear();
  frozenGroups.clear();
  activeRecordNo = null;
  bus.emit("record-edit-state", { editing: false });
  // Electron 32+ removed File.path, so use a blob URL instead of a local path
  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  currentImageUrl = URL.createObjectURL(file);
  // mainimage = draw.image(file.path).attr('id', 'mainimage').size(400, 400).draggable().move(300, 100)
  mainimage = draw.group().attr({ id: "maig" }).draggable();
  const img = draw.image(currentImageUrl).attr("id", "mainimage").size(400, 400);
  mainimage.add(img.move(300, 100));
  addImageFrame(mainimage, img);
  mainimage.on("dragmove", onImageDrag);
  addScaleBar();
  lso = leftSideObjects(draw, om, scales, bus);
  dso = DorsalSideObjects(draw, om, scales, bus);
  concave_lso = concaveLeftSideObjects(draw, om, scales, bus);
  lso.addMeasureObjects().updateMeasures();
  dso.addMeasureObjects().updateMeasures();
  concave_lso.addMeasureObjects().updateMeasures();
  initGuides(draw);
  initMagnifier(draw);
  // направляющие создаются с дефолтным размером — подгоняем под текущий канвас
  sizeCanvasToContainer();
  bus.emit("lateral-show", om.value.lateral_side & !om.value.concave_vs);
  bus.emit("concave-vs", om.value.lateral_side & om.value.concave_vs);
  bus.emit("dorsal-show", om.value.dorsal_side);
  om.value.filename = file.name;
  //console.log(file)
};
const combinedColumns = [
  {
    name: "no",
    label: "№",
    field: "record_no",
    sortable: true,
    format: formatNumber,
  },
  { name: "filename", label: "Имя файла", field: "filename", sortable: true },
  { name: "label", label: "Метка", field: "label", sortable: true },
  { name: "side", label: "Сторона", field: "side", format: formatSide },
  {
    name: "fullness",
    label: "Полнота",
    field: "fullness",
    format: formatFullness,
  },
  { name: "length", label: "L", field: "length", format: formatNumber },
  { name: "height", label: "H", field: "height", format: formatNumber },
  { name: "width", label: "W", field: "width", format: formatNumber },
  { name: "ad_alfa", label: "AD-alfa", field: "ad_alfa", format: formatNumber },
  { name: "ad_hc", label: "AD-l", field: "ad_hc", format: formatNumber },
  { name: "ad_vc", label: "AD-h", field: "ad_vc", format: formatNumber },
  { name: "ad_ln", label: "AD-n", field: "ad_ln", format: formatNumber },
  { name: "ad_sln", label: "AD-s", field: "ad_sln", format: formatNumber },
  { name: "pd_alfa", label: "PD-alfa", field: "pd_alfa", format: formatNumber },
  { name: "pd_hc", label: "PD-l", field: "pd_hc", format: formatNumber },
  { name: "pd_vc", label: "PD-h", field: "pd_vc", format: formatNumber },
  { name: "pd_ln", label: "PD-n", field: "pd_ln", format: formatNumber },
  { name: "pd_sln", label: "PD-s", field: "pd_sln", format: formatNumber },
  { name: "av_alfa", label: "AV-alfa", field: "av_alfa", format: formatNumber },
  { name: "av_hc", label: "AV-l", field: "av_hc", format: formatNumber },
  { name: "av_vc", label: "AV-h", field: "av_vc", format: formatNumber },
  { name: "av_ln", label: "AV-n", field: "av_ln", format: formatNumber },
  { name: "av_sln", label: "AV-s", field: "av_sln", format: formatNumber },
  { name: "pv_alfa", label: "PV-alfa", field: "pv_alfa", format: formatNumber },
  { name: "pv_hc", label: "PV-l", field: "pv_hc", format: formatNumber },
  { name: "pv_vc", label: "PV-h", field: "pv_vc", format: formatNumber },
  { name: "pv_ln", label: "PV-n", field: "pv_ln", format: formatNumber },
  { name: "pv_sln", label: "PV-s", field: "pv_sln", format: formatNumber },
  { name: "ar_alfa", label: "AR-alfa", field: "ar_alfa", format: formatNumber },
  { name: "ar_hc", label: "AR-l", field: "ar_hc", format: formatNumber },
  { name: "ar_vc", label: "AR-h", field: "ar_vc", format: formatNumber },
  { name: "ar_ln", label: "AR-n", field: "ar_ln", format: formatNumber },
  { name: "ar_sln", label: "AR-s", field: "ar_sln", format: formatNumber },
  { name: "pr_alfa", label: "PR-alfa", field: "pr_alfa", format: formatNumber },
  { name: "pr_hc", label: "PR-l", field: "pr_hc", format: formatNumber },
  { name: "pr_vc", label: "PR-h", field: "pr_vc", format: formatNumber },
  { name: "pr_ln", label: "PR-n", field: "pr_ln", format: formatNumber },
  { name: "pr_sln", label: "PR-s", field: "pr_sln", format: formatNumber },
  { name: "al_alfa", label: "AL-alfa", field: "al_alfa", format: formatNumber },
  { name: "al_hc", label: "AL-l", field: "al_hc", format: formatNumber },
  { name: "al_vc", label: "AL-h", field: "al_vc", format: formatNumber },
  { name: "al_ln", label: "AL-n", field: "al_ln", format: formatNumber },
  { name: "al_sln", label: "AL-s", field: "al_sln", format: formatNumber },
  { name: "pl_alfa", label: "PL-alfa", field: "pl_alfa", format: formatNumber },
  { name: "pl_hc", label: "PL-l", field: "pl_hc", format: formatNumber },
  { name: "pl_vc", label: "PL-h", field: "pl_vc", format: formatNumber },
  { name: "pl_ln", label: "PL-n", field: "pl_ln", format: formatNumber },
  { name: "pl_sln", label: "PL-s", field: "pl_sln", format: formatNumber },
];

const exportCombinedTable = () => {
  const mergedData = {};

  rows.value.lateral.forEach((row) => {
    const key = row.record_no;
    if (!mergedData[key]) {
      mergedData[key] = {};
    }
    mergedData[key] = { ...mergedData[key], ...row };
  });

  rows.value.dorsal.forEach((row) => {
    const key = row.record_no;
    if (!mergedData[key]) {
      mergedData[key] = {};
    }
    mergedData[key] = {
      ...mergedData[key],
      ...row,
      length: row.length_dorsal || mergedData[key].length,
    };
  });

  const mergedRows = Object.values(mergedData);

  const content = [combinedColumns.map((col) => wrapCsvValue(col.label))]
    .concat(
      mergedRows.map((row) =>
        combinedColumns
          .map((col) =>
            wrapCsvValue(
              typeof col.field === "function"
                ? col.field(row)
                : row[col.field === void 0 ? col.name : col.field],
              col.format,
              row
            )
          )
          .join(",")
      )
    )
    .join("\r\n");

  const status = exportFile("combined-table-export.csv", content, "text/csv");

  if (status !== true) {
    $q.notify({
      message: "Браузер запретил скачивание файла...",
      color: "negative",
      icon: "warning",
    });
  }
};
</script>
<style>
image {
  border: 5px solid #ea0b0b;
}

#canvas svg {
  display: block;
  border-style: solid;
  border-color: gray;
  border-width: thin;
}

/* Канвас занимает всё свободное место по высоте страницы.
   Сама страница фиксирована по высоте вьюпорта и не скроллится,
   поэтому скрытие/показ таблиц не может «раздуть» страницу. */
.canvas-page {
  overflow: hidden;
}

/* Ряд канваса не должен зависеть от размера SVG: иначе явная высота
   svg через intrinsic size увеличивает страницу и появляются скроллбары */
.canvas-row {
  position: relative;
  flex: 1 1 0%;
  min-height: 0;
  overflow: hidden;
}

#canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/* Нижняя панель: слева таблицы, справа текстовое описание.
   Ограниченная высота + независимая прокрутка половин,
   чтобы канвас всегда сохранял свободное место */
.tables-panel {
  flex: 0 1 auto;
  min-height: 0;
  max-height: 40vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Две равные половины по горизонтали */
.tables-split {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.tables-half {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

/* Правая половина с описанием */
.description-half {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e0e0e0;
}

/* Селектор записи в заголовке описания */
.record-select {
  min-width: 190px;
  max-width: 260px;
}

/* Прокручиваемая область описания */
.description-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  background: #fff;
}

/* Клик по строке таблицы выбирает запись для описания */
.tables-half .q-table tbody tr {
  cursor: pointer;
}

/* Подсветка выбранной записи */
.q-table tbody tr.selected-record-row,
.q-table tbody tr.selected-record-row > td {
  background: rgba(0, 0, 0, 0.06);
}

/* Таблицы подстраиваются под ширину половины панели:
   без горизонтальной прокрутки, содержимое переносится */
.table-wrap {
  width: 100%;
  min-width: 0;
}

.tables-half .q-table__middle {
  overflow-x: hidden;
}

.tables-half table.q-table {
  table-layout: fixed;
  width: 100%;
}

/* Верхняя панель таблицы (заголовок и кнопка экспорта)
   тоже переносится, а не расширяет таблицу */
.tables-half .q-table__top {
  flex-wrap: wrap;
}

/* Узкие колонки для компактного отображения */
.q-table th,
.q-table td {
  padding: 4px 8px;
  font-size: 12px;
}

/* Заголовки и ячейки с переносом текста */
.q-table th,
.q-table td {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.q-table th {
  max-width: 100px;
}

/* Компактные строки объединённой таблицы результатов */
.compact-table .q-table__middle table.q-table th,
.compact-table .q-table__middle table.q-table td {
  padding: 2px 6px;
  line-height: 1.15;
  vertical-align: middle;
}
</style>
