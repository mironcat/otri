<template>
  <q-page>
    <div class="row q-ml-md q-mt-md">
      <div class="q-gutter-sm">
        <q-btn color="secondary" @click="zoomIn" icon="zoom_in" />
        <q-btn color="secondary" @click="zoomOut" icon="zoom_out" />
        <q-btn
          color="secondary"
          @click="rotateImage(-0.5)"
          icon="rotate_left"
        />
        <q-btn
          color="secondary"
          @click="rotateImage(0.5)"
          icon="rotate_right"
        />
        <q-btn
          v-show="!om.settings.image_lock"
          color="secondary"
          @click="
            mainimage.draggable(false);
            om.settings.image_lock = !om.settings.image_lock;
          "
          icon="lock_open"
        />
        <q-btn
          v-show="om.settings.image_lock"
          color="secondary"
          @click="
            mainimage.draggable(true);
            om.settings.image_lock = !om.settings.image_lock;
          "
          icon="lock"
        />

        <q-checkbox
          v-model="om.lateral_side"
          @click="
            bus.emit('lateral-show', om.lateral_side & !om.concave_vs);
            bus.emit('concave-vs', om.lateral_side & om.concave_vs);
          "
          label="Lateral"
          color="primary"
        />

        <q-radio
          v-show="om.lateral_side"
          v-model="om.side"
          val="left"
          label="Left"
          @click="bus.emit('side-change', 'blue')"
        />
        <q-radio
          v-show="om.lateral_side"
          v-model="om.side"
          val="right"
          label="Right"
          @click="bus.emit('side-change', 'gray')"
        />

        <q-toggle
          v-show="om.lateral_side"
          v-model="om.concave_vs"
          label="Concave ventral margin"
          @click="
            bus.emit('concave-vs', om.concave_vs);
            bus.emit('lateral-show', !om.concave_vs);
          "
        />
        <q-checkbox
          v-model="om.dorsal_side"
          @click="bus.emit('dorsal-show', om.dorsal_side)"
          label="Dorsal"
          color="green"
        />
        <q-checkbox
          v-show="om.dorsal_side"
          v-model="om.half"
          @click="om.half ? (om.fullness = 'half') : (om.fullness = 'full')"
          label="Half"
          color="black"
        />
      </div>
    </div>
    <div class="row q-ma-md">
      <div id="canvas" ref="canvasRef" class="col"></div>
    </div>
    <div class="row q-ma-md q-gutter-sm flex items-center">
      <q-file
        bg-color="secondary"
        dense
        v-model="imagefile"
        label="Pick one file"
        filled
        style="max-width: 400px"
        @update:model-value="fileUploaded"
      >
        <template v-slot:prepend>
          <q-icon name="attach_file" />
        </template>
      </q-file>
      <q-input
        dense
        v-model="scales.length"
        label="Scalebar Length"
        type="number"
        filled
        style="max-width: 150px"
      />

      <q-btn color="primary" @click="setScaleBar" label="set scalebar" />
      <q-input
        v-show="om.settings.scalebar_ready"
        dense
        v-model="om.label"
        filled
        label="label"
        style="max-width: 150px"
        class="q-mr-sm"
      />
      <q-btn
        v-show="om.settings.scalebar_ready"
        icon="save"
        color="primary"
        @click="addRecord"
        label="add record"
        class="q-mr-sm"
      />
      <q-btn
        v-show="rows.lateral.length > 0 || rows.dorsal.length > 0"
        color="brown"
        icon-right="archive"
        label="Export to csv"
        no-caps
        @click="exportCombinedTable"
      />
      <!-- <q-chip>{{ scales.factor }}</q-chip> -->
    </div>
    <div class="row q-ma-md">
      <div class="q-gutter-sm" style="width: 100%; overflow-x: auto">
        <q-table
          :rows="rows.lateral"
          :columns="columns.lateral"
          row-key="record_no"
          no-data-label="no data"
          style="min-width: 1500px"
        >
          <template v-slot:body-cell-action="props">
            <q-td :props="props">
              <q-btn
                color="primary"
                icon-right="delete"
                no-caps
                flat
                dense
                @click="deleteLateral(props.row)"
              />
            </q-td>
          </template>
          <template v-slot:top-left>
            <q-btn
              color="grey"
              icon-right="archive"
              label="Export to csv"
              size="sm"
              no-caps
              @click="exportTable('lateral')"
            />
          </template>
          <template v-slot:top-right><strong>Lateral(left)</strong></template>
        </q-table>
      </div>
    </div>
    <div class="row q-ma-md">
      <div class="q-gutter-sm" style="width: 100%; overflow-x: auto">
        <q-table
          :rows="rows.dorsal"
          :columns="columns.dorsal"
          row-key="record_no"
          no-data-label="no data"
          style="min-width: 1200px"
        >
          <template v-slot:body-cell-action="props">
            <q-td :props="props">
              <q-btn
                color="primary"
                icon-right="delete"
                no-caps
                flat
                dense
                @click="deleteDorsal(props.row)"
              />
            </q-td>
          </template>
          <template v-slot:top-left>
            <!-- <q-input v-show="om.settings.scalebar_ready" dense v-model="om.label" filled label="label"
              style="max-width: 150px" class="q-mr-sm" />
            <q-btn v-show="om.settings.scalebar_ready" color="primary" @click="addRecord" label="add record"
              class="q-mr-lg" /> -->
            <q-btn
              color="grey"
              icon-right="archive"
              label="Export to csv"
              size="sm"
              no-caps
              @click="exportTable('dorsal')"
            />
          </template>
          <template v-slot:top-right><strong>Dorsal</strong></template>
        </q-table>
      </div>
    </div>
  </q-page>
</template>
<script setup>
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
const baseColumns = [
  { name: "action", label: "Delete", field: "action" },
  {
    name: "no",
    align: "center",
    label: "No",
    field: "record_no",
    sortable: true,
  },
  {
    name: "filename",
    required: true,
    label: "File Name",
    align: "left",
    field: "filename",
    // format: val => `File:${val}`,
    sortable: true,
  },
  {
    name: "label",
    align: "center",
    label: "Label",
    field: "label",
    sortable: true,
  },
];
// ========== НОВЫЙ КОД КОЛОНОК (разделенные поля) ==========
const lateralColumns = [
  {
    name: "side",
    align: "center",
    label: "Side|Fullness",
    field: "side",
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
    label: "H",
    field: "height",
    format: formatNumber,
    sortable: true,
  },
  // AD измерения
  {
    name: "ad_alfa",
    label: "AD-alfa",
    field: "ad_alfa",
    format: (val) =>
      val !== undefined && val !== null ? `${val.toFixed()}` : "",
    sortable: true,
  },
  {
    name: "ad_hc",
    label: "AD-l",
    field: "ad_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ad_vc",
    label: "AD-h",
    field: "ad_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ad_ln",
    label: "AD-n",
    field: "ad_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ad_sln",
    label: "AD-s",
    field: "ad_sln",
    format: formatNumber,
    sortable: true,
  },
  // PD измерения
  {
    name: "pd_alfa",
    label: "PD-alfa",
    field: "pd_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pd_hc",
    label: "PD-l",
    field: "pd_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pd_vc",
    label: "PD-h",
    field: "pd_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pd_ln",
    label: "PD-n",
    field: "pd_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pd_sln",
    label: "PD-s",
    field: "pd_sln",
    format: formatNumber,
    sortable: true,
  },
  // AV измерения
  {
    name: "av_alfa",
    label: "AV-alfa",
    field: "av_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "av_hc",
    label: "AV-l",
    field: "av_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "av_vc",
    label: "AV-h",
    field: "av_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "av_ln",
    label: "AV-n",
    field: "av_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "av_sln",
    label: "AV-s",
    field: "av_sln",
    format: formatNumber,
    sortable: true,
  },
  // PV измерения
  {
    name: "pv_alfa",
    label: "PV-alfa",
    field: "pv_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pv_hc",
    label: "PV-l",
    field: "pv_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pv_vc",
    label: "PV-h",
    field: "pv_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pv_ln",
    label: "PV-n",
    field: "pv_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pv_sln",
    label: "PV-s",
    field: "pv_sln",
    format: formatNumber,
    sortable: true,
  },
  // V измерения
  {
    name: "v_lv",
    label: "V-lv",
    field: "v_lv",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "v_lvl",
    label: "V-lvl",
    field: "v_lvl",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "v_dv",
    label: "V-dv",
    field: "v_dv",
    format: formatNumber,
    sortable: true,
  },
];
// ========== НОВЫЙ КОД DORSAL КОЛОНОК (разделенные поля) ==========
const dorsalColumns = [
  {
    name: "side",
    align: "center",
    label: "Side|Fullness",
    field: "fullness",
    sortable: true,
  },
  {
    name: "width",
    label: "W",
    field: "width",
    format: formatNumber,
    sortable: true,
  },
  // AR измерения
  {
    name: "ar_alfa",
    label: "AR-alfa",
    field: "ar_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ar_hc",
    label: "AR-l",
    field: "ar_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ar_vc",
    label: "AR-h",
    field: "ar_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ar_ln",
    label: "AR-n",
    field: "ar_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ar_sln",
    label: "AR-s",
    field: "ar_sln",
    format: formatNumber,
    sortable: true,
  },
  // PR измерения
  {
    name: "pr_alfa",
    label: "PR-alfa",
    field: "pr_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pr_hc",
    label: "PR-l",
    field: "pr_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pr_vc",
    label: "PR-h",
    field: "pr_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pr_ln",
    label: "PR-n",
    field: "pr_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pr_sln",
    label: "PR-s",
    field: "pr_sln",
    format: formatNumber,
    sortable: true,
  },
  // AL измерения
  {
    name: "al_alfa",
    label: "AL-alfa",
    field: "al_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "al_hc",
    label: "AL-l",
    field: "al_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "al_vc",
    label: "AL-h",
    field: "al_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "al_ln",
    label: "AL-n",
    field: "al_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "al_sln",
    label: "AL-s",
    field: "al_sln",
    format: formatNumber,
    sortable: true,
  },
  // PL измерения
  {
    name: "pl_alfa",
    label: "PL-alfa",
    field: "pl_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pl_hc",
    label: "PL-l",
    field: "pl_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pl_vc",
    label: "PL-h",
    field: "pl_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pl_ln",
    label: "PL-n",
    field: "pl_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pl_sln",
    label: "PL-s",
    field: "pl_sln",
    format: formatNumber,
    sortable: true,
  },
];

const columns = ref({
  lateral: baseColumns.concat(lateralColumns),
  dorsal: baseColumns.concat(dorsalColumns),
});
// columns.value = baseColumns.concat(lateralColumns)
// console.log()
const rows = ref({
  lateral: [],
  dorsal: [],
});

import { watch, inject } from "vue";
import { exportFile } from "quasar";
import "@svgdotjs/svg.draggable.js";
import { Matrix, Point } from "@svgdotjs/svg.js";
import { onMounted, onBeforeUnmount, ref } from "vue";
// import { lineTolineIntersectionPoint, getLengthByCoordinates, getAnglePoints } from 'src/scripts/utils.js'
import { initScalebar, getScalebarLength } from "src/scripts/scalebar.js";
import leftSideObjects from "src/scripts/leftsideobjects.js";
import DorsalSideObjects from "src/scripts/dorsalobjects.js";
import concaveLeftSideObjects from "src/scripts/concaveobjects.js";
import { initGuides, resizeGuides } from "src/scripts/guides.js";
import { initMagnifier } from "src/scripts/magnifier.js";

const canvasRef = ref();
// let imagepath = ref('/src/assets/ost1.jpg')
const imagefile = ref(null);
// let draggableMainImage = ref(true)
let draw = inject("svg");
let bus = inject("bus");
let canvasResizeObserver = null;
const om = ref({
  record_no: 0,
  label: "no label",
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
    if (om.value.concave_vs) syncOverlays(lso, concave_lso);
    else syncOverlays(concave_lso, lso);
  },
);

watch(
  () => om.value.label,
  () => bus.emit("label-changed"),
);

// --- Управление визуальными размерами точек и линий -------------------------
// Кнопка "tune" в шапке меняет множители; здесь применяем их
// относительно предыдущих значений к группам всех трёх наборов.
import { changeScales } from "src/scripts/geostyle.js";

// Подгонка размеров SVG под контейнер: вся доступная ширина,
// высота фиксированная (600, как и раньше).
function sizeCanvasToContainer() {
  if (!canvasRef.value) return;
  const width = Math.max(canvasRef.value.clientWidth, 400);
  draw.size(width, 600);
  resizeGuides(width, 600);
}

bus.on("geo-style-changed", ({ prevPoint, prevLine }) => {
  [lso, dso, concave_lso].forEach((obj) => {
    if (obj && obj.mobjects) changeScales(obj.mobjects, prevPoint, prevLine);
  });
});

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
});

const addRecord = () => {
  om.value.record_no = om.value.record_no + 1;
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
};
const deleteLateral = (r) => {
  const index = rows.value.lateral.indexOf(r);
  // console.log(rows.value.indexOf(r))
  rows.value.lateral.splice(index, 1);
  // console.log(this.data)
};
const deleteDorsal = (r) => {
  const index = rows.value.dorsal.indexOf(r);
  // console.log(rows.value.indexOf(r))
  rows.value.dorsal.splice(index, 1);
  // console.log(this.data)
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

const followGroups = () => followTargets().map((t) => t.group);

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

// Масштабирует оверлеи вместе с картинкой так, чтобы они остались
// привязанными к тем же точкам изображения.
// Картинка масштабируется svg.js вокруг локального центра её содержимого
// (матрица C); оверлею нужно применить ту же трансформацию, сконъюгированную
// матрицей картинки: G = M_img · C · M_img⁻¹. Работает при любом уже
// применённом перетаскивании/повороте/зуме картинки.
const followZoom = (factor) => {
  if (factor === 1) return;
  const mimg = mainimage.matrixify();
  const b = mainimage.bbox(); // локальный бокс содержимого картинки
  const C = new Matrix().scaleO(
    factor,
    factor,
    b.x + b.width / 2,
    b.y + b.height / 2,
  );
  const G = mimg.clone().multiplyO(C).multiplyO(mimg.clone().inverseO());
  followGroups().forEach((g) => {
    const M = new Matrix(G).multiplyO(g.matrixify());
    g.attr("transform", M);
    keepVisualSizes(g, factor);
  });
  // пересчитать позиции и компенсацию размера иконок (замок/refresh)
  bus.emit("overlays-transformed");
};

// Держим визуальные размеры элементов постоянными на экране:
// меняется только их положение (групповая матрица G выше), а
// радиусы точек, толщина линий и шрифты компенсируются.
const keepVisualSizes = (g, s) => {
  // обводки любой ширины: браузер сам компенсирует масштаб группы
  g.find("line, polyline, rect, circle, text").forEach((el) =>
    el.attr("vector-effect", "non-scaling-stroke"),
  );
  // радиусы точек: делим на масштаб текущего шага —
  // визуальный радиус остаётся прежним (накопление учитывается автоматически)
  g.find("circle").forEach((c) => {
    const r = c.attr("r");
    if (r) c.attr("r", r / s);
  });
  // текст
  g.find("text").forEach((t) => {
    const fs = t.attr("font-size");
    if (fs) t.attr("font-size", fs / s);
  });
  // маленькие квадратные ручки (frameResizer ~15×15);
  // большой rect (baseFrame) не трогаем — это область измерения,
  // её углы должны оставаться привязанными к точкам изображения
  g.find("rect").forEach((r) => {
    if (!r.hasClass("ui-resizer")) return;
    r.attr("width", r.attr("width") / s);
    r.attr("height", r.attr("height") / s);
  });
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
  if (!groups.length) return;
  const mimg = mainimage.matrixify();
  const b = mainimage.bbox();
  const C = new Matrix().rotate(angle, b.cx, b.cy);
  const G = mimg.clone().multiplyO(C).multiplyO(mimg.clone().inverseO());
  groups.forEach((g) => {
    g.attr("transform", new Matrix(G).multiplyO(g.matrixify()));
  });
  // обновить иконку сброса поворота в модулях
  bus.emit("overlays-transformed");
};

// Если у рамки включён замок, перетаскивание картинки сдвигает и её оверлеи
const onImageDrag = function (event) {
  const { dx, dy } = event.detail;
  const d = localToScreenDelta(mainimage, dx, dy);
  pinnedGroups().forEach((g) => moveGroupByScreenDelta(g, d.x, d.y));
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
const fileUploaded = (file) => {
  draw.clear();
  // mainimage = draw.image(file.path).attr('id', 'mainimage').size(400, 400).draggable().move(300, 100)
  mainimage = draw.group().attr({ id: "maig" }).draggable();
  const img = draw.image(file.path).attr("id", "mainimage").size(400, 400);
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
const exportTable = (datatype) => {
  // naive encoding to csv format
  // console.log(columns.value[datatype])
  // return
  const content = [
    columns.value[datatype].map((col) => wrapCsvValue(col.label)),
  ]
    .concat(
      rows.value[datatype].map((row) =>
        columns.value[datatype]
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

  const status = exportFile(
    datatype + "-table-export.csv",
    content,
    "text/csv"
  );

  if (status !== true) {
    $q.notify({
      message: "Browser denied file download...",
      color: "negative",
      icon: "warning",
    });
  }
};

const combinedColumns = [
  {
    name: "no",
    label: "No",
    field: "record_no",
    sortable: true,
    format: formatNumber,
  },
  { name: "filename", label: "File Name", field: "filename", sortable: true },
  { name: "label", label: "Label", field: "label", sortable: true },
  { name: "side", label: "Side", field: "side" },
  { name: "fullness", label: "Fullness", field: "fullness" },
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
      message: "Browser denied file download...",
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
  border-style: solid;
  border-color: gray;
  border-width: thin;
}

/* Стили для таблиц с горизонтальной прокруткой */
.q-table__container {
  overflow-x: auto;
}

/* Узкие колонки для компактного отображения */
.q-table th,
.q-table td {
  padding: 4px 8px;
  font-size: 12px;
}

/* Заголовки колонок с переносом текста */
.q-table th {
  white-space: normal;
  word-break: break-word;
  max-width: 100px;
}
</style>
