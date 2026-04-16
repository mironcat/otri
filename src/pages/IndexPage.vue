<template>
  <q-page>
    <div class="row q-ml-md q-mt-md">
      <div class="q-gutter-sm">
        <q-btn color="secondary" @click="zoomIn" icon="zoom_in" />
        <q-btn color="secondary" @click="zoomOut" icon="zoom_out" />
        <q-btn
          color="secondary"
          @click="mainimage.rotate(-0.5)"
          icon="rotate_left"
        />
        <q-btn
          color="secondary"
          @click="mainimage.rotate(0.5)"
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
      <div id="canvas" ref="canvasRef"></div>
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
        class="q-mr-lg"
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
              color="brown"
              icon-right="archive"
              label="Export to csv"
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
              color="brown"
              icon-right="archive"
              label="Export to csv"
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

import { inject } from "vue";
import { exportFile } from "quasar";
import "@svgdotjs/svg.draggable.js";
import { onMounted, ref } from "vue";
// import { lineTolineIntersectionPoint, getLengthByCoordinates, getAnglePoints } from 'src/scripts/utils.js'
import { initScalebar, getScalebarLength } from "src/scripts/scalebar.js";
import leftSideObjects from "src/scripts/leftsideobjects.js";
import DorsalSideObjects from "src/scripts/dorsalobjects.js";
import concaveLeftSideObjects from "src/scripts/concaveobjects.js";

const canvasRef = ref();
// let imagepath = ref('/src/assets/ost1.jpg')
const imagefile = ref(null);
// let draggableMainImage = ref(true)
let draw = inject("svg");
let bus = inject("bus");
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
  },
});
const scales = ref({
  length: 100,
  factor: 1,
  zoom: 1,
});
let mainimage = draw.group().attr({ id: "maig" }).draggable();
mainimage.add(
  draw.image("ost1.jpg").attr("id", "mainimage").size(400, 400).move(300, 100)
);
// mainimage.add(draw.rect(400, 400).stroke('gray').fill({ opacity: 0 }).stroke({ dasharray: "2,100" }).move(300, 100))
// let scalebar = draw.group().attr({ id: 'scalebar' })
let scalebar = draw.group().attr({ id: "scalebar" });
// initScalebar(scalebar, draw, scales.value)

// let mobjects = draw.group().attr({ id: 'mobjects' })
let lso = leftSideObjects(draw, om, scales, bus);
let dso = DorsalSideObjects(draw, om, scales, bus);
let concave_lso = concaveLeftSideObjects(draw, om, scales, bus);

onMounted(() => {
  // console.log(canvasRef.value)
  // draw = initSVG(canvasRef.value)
  draw.addTo(canvasRef.value).size(1000, 600);
  // initMObjects(draw)
  addScaleBar();
  lso.addMeasureObjects().updateMeasures();
  dso.addMeasureObjects().updateMeasures();
  concave_lso.addMeasureObjects().updateMeasures();
  bus.emit("lateral-show", om.value.lateral_side & !om.value.concave_vs);
  bus.emit("concave-vs", om.value.lateral_side & om.value.concave_vs);
  bus.emit("dorsal-show", om.value.dorsal_side);
  // this.console.log(canvasRef.value)
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
const zoomIn = () => {
  mainimage.scale(1.1);
  scales.value.zoom = scales.value.zoom * 1.1;
  getFactor();
};
const zoomOut = () => {
  mainimage.scale(0.9);
  scales.value.zoom = scales.value.zoom * 0.9;
  getFactor();
};
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
  // mainimage.add(draw.rect(400, 400).stroke('blue').fill({ opacity: 0 }).stroke({ dasharray: "1,5" }).move(300, 100))
  addScaleBar();
  lso = leftSideObjects(draw, om, scales, bus);
  dso = DorsalSideObjects(draw, om, scales, bus);
  concave_lso = concaveLeftSideObjects(draw, om, scales, bus);
  lso.addMeasureObjects().updateMeasures();
  dso.addMeasureObjects().updateMeasures();
  concave_lso.addMeasureObjects().updateMeasures();
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
