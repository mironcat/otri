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
    name: "record_no",
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

// ========== СТАРЫЙ КОД КОЛОНОК (для отката) ==========
// const lateralColumns_OLD = [
//   {
//     name: "side",
//     align: "center",
//     label: "Side",
//     field: "side",
//     sortable: true,
//   },
//   {
//     name: "length",
//     align: "center",
//     label: "Length",
//     field: "length",
//     format: (val) => `${val.toFixed()}`,
//     sortable: true,
//   },
//   {
//     name: "height",
//     label: "Height",
//     field: "height",
//     format: (val) => `${val.toFixed()}`,
//     sortable: true,
//   },
//   {
//     name: "ad",
//     label: "AD(alfa;hc;vc;ln;sln)",
//     field: "ad",
//     format: (val) =>
//       `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
//     sortable: false,
//   },
//   {
//     name: "pd",
//     label: "PD(alfa;hc;vc;ln;sln)",
//     field: "pd",
//     format: (val) =>
//       `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
//     sortable: false,
//   },
//   {
//     name: "av",
//     label: "AV(alfa;hc;vc;ln;sln)",
//     field: "av",
//     format: (val) =>
//       `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
//     sortable: false,
//   },
//   {
//     name: "pv",
//     label: "PV(alfa;hc;vc;ln;sln)",
//     field: "pv",
//     format: (val) =>
//       `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
//     sortable: false,
//   },
//   {
//     name: "v",
//     label: "V(lv,lvl,dv)",
//     field: "v",
//     format: (val) =>
//       `${val.lv.toFixed()}; ${val.lvl.toFixed()}; ${val.dv.toFixed()}`,
//     sortable: false,
//   },
// ];

// ========== НОВЫЙ КОД КОЛОНОК (разделенные поля) ==========
const lateralColumns = [
  {
    name: "side",
    align: "center",
    label: "Side",
    field: "side",
    sortable: true,
  },
  {
    name: "length",
    align: "center",
    label: "Length",
    field: "length",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "height",
    label: "Height",
    field: "height",
    format: formatNumber,
    sortable: true,
  },
  // AD измерения
  {
    name: "ad_alfa",
    label: "AD alfa",
    field: "ad_alfa",
    format: (val) =>
      val !== undefined && val !== null ? `${val.toFixed()}` : "",
    sortable: true,
  },
  {
    name: "ad_hc",
    label: "AD hc",
    field: "ad_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ad_vc",
    label: "AD vc",
    field: "ad_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ad_ln",
    label: "AD ln",
    field: "ad_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ad_sln",
    label: "AD sln",
    field: "ad_sln",
    format: formatNumber,
    sortable: true,
  },
  // PD измерения
  {
    name: "pd_alfa",
    label: "PD alfa",
    field: "pd_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pd_hc",
    label: "PD hc",
    field: "pd_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pd_vc",
    label: "PD vc",
    field: "pd_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pd_ln",
    label: "PD ln",
    field: "pd_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pd_sln",
    label: "PD sln",
    field: "pd_sln",
    format: formatNumber,
    sortable: true,
  },
  // AV измерения
  {
    name: "av_alfa",
    label: "AV alfa",
    field: "av_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "av_hc",
    label: "AV hc",
    field: "av_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "av_vc",
    label: "AV vc",
    field: "av_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "av_ln",
    label: "AV ln",
    field: "av_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "av_sln",
    label: "AV sln",
    field: "av_sln",
    format: formatNumber,
    sortable: true,
  },
  // PV измерения
  {
    name: "pv_alfa",
    label: "PV alfa",
    field: "pv_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pv_hc",
    label: "PV hc",
    field: "pv_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pv_vc",
    label: "PV vc",
    field: "pv_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pv_ln",
    label: "PV ln",
    field: "pv_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pv_sln",
    label: "PV sln",
    field: "pv_sln",
    format: formatNumber,
    sortable: true,
  },
  // V измерения
  {
    name: "v_lv",
    label: "V lv",
    field: "v_lv",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "v_lvl",
    label: "V lvl",
    field: "v_lvl",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "v_dv",
    label: "V dv",
    field: "v_dv",
    format: formatNumber,
    sortable: true,
  },
];
// ========== СТАРЫЙ КОД DORSAL КОЛОНОК (для отката) ==========
// const dorsalColumns_OLD = [
//   {
//     name: "width",
//     label: "Width",
//     field: "width",
//     format: (val) => `${val.toFixed()}`,
//     sortable: true,
//   },
//   {
//     name: "ar",
//     label: "AR(alfa,hc,vc,ln,sln)",
//     field: "ar",
//     format: (val) =>
//       `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
//     sortable: false,
//   },
//   {
//     name: "pr",
//     label: "PR(alfa,hc,vc,ln,sln)",
//     field: "pr",
//     format: (val) =>
//       `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
//     sortable: false,
//   },
//   {
//     name: "al",
//     label: "AL(alfa,hc,vc,ln,sln)",
//     field: "al",
//     format: (val) =>
//       `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
//     sortable: false,
//   },
//   {
//     name: "pl",
//     label: "PL(alfa,hc,vc,ln,sln)",
//     field: "pl",
//     format: (val) =>
//       `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
//     sortable: false,
//   },
// ];

// ========== НОВЫЙ КОД DORSAL КОЛОНОК (разделенные поля) ==========
const dorsalColumns = [
  {
    name: "width",
    label: "Width",
    field: "width",
    format: formatNumber,
    sortable: true,
  },
  // AR измерения
  {
    name: "ar_alfa",
    label: "AR alfa",
    field: "ar_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ar_hc",
    label: "AR hc",
    field: "ar_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ar_vc",
    label: "AR vc",
    field: "ar_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ar_ln",
    label: "AR ln",
    field: "ar_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "ar_sln",
    label: "AR sln",
    field: "ar_sln",
    format: formatNumber,
    sortable: true,
  },
  // PR измерения
  {
    name: "pr_alfa",
    label: "PR alfa",
    field: "pr_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pr_hc",
    label: "PR hc",
    field: "pr_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pr_vc",
    label: "PR vc",
    field: "pr_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pr_ln",
    label: "PR ln",
    field: "pr_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pr_sln",
    label: "PR sln",
    field: "pr_sln",
    format: formatNumber,
    sortable: true,
  },
  // AL измерения
  {
    name: "al_alfa",
    label: "AL alfa",
    field: "al_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "al_hc",
    label: "AL hc",
    field: "al_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "al_vc",
    label: "AL vc",
    field: "al_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "al_ln",
    label: "AL ln",
    field: "al_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "al_sln",
    label: "AL sln",
    field: "al_sln",
    format: formatNumber,
    sortable: true,
  },
  // PL измерения
  {
    name: "pl_alfa",
    label: "PL alfa",
    field: "pl_alfa",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pl_hc",
    label: "PL hc",
    field: "pl_hc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pl_vc",
    label: "PL vc",
    field: "pl_vc",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pl_ln",
    label: "PL ln",
    field: "pl_ln",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "pl_sln",
    label: "PL sln",
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

// ========== ТЕСТОВЫЕ ДАННЫЕ (для проверки) ==========
// Раскомментировать для тестирования:
setTimeout(() => {
  //   rows.value.lateral.push({
  //     record_no: 1,
  //     label: "test",
  //     filename: "test.jpg",
  //     side: "left",
  //     length: 100,
  //     height: 50,
  //     ad_alfa: 45.5,
  //     ad_hc: 20.3,
  //     ad_vc: 15.7,
  //     ad_ln: 25.1,
  //     ad_sln: 30.2,
  //     pd_alfa: 60.8,
  //     pd_hc: 35.4,
  //     pd_vc: 28.9,
  //     pd_ln: 40.6,
  //     pd_sln: 45.3,
  //     av_alfa: 75.2,
  //     av_hc: 42.1,
  //     av_vc: 33.8,
  //     av_ln: 48.7,
  //     av_sln: 52.4,
  //     pv_alfa: 90.6,
  //     pv_hc: 55.9,
  //     pv_vc: 47.2,
  //     pv_ln: 62.8,
  //     pv_sln: 67.5,
  //     v_lv: 10.5,
  //     v_lvl: 8.3,
  //     v_dv: 12.7,
  //   });
  //
  //   rows.value.dorsal.push({
  //     record_no: 1,
  //     label: "test",
  //     filename: "test.jpg",
  //     side: "left",
  //     length_dorsal: 120,
  //     width: 60,
  //     ar_alfa: 40.2,
  //     ar_hc: 22.5,
  //     ar_vc: 18.3,
  //     ar_ln: 28.7,
  //     ar_sln: 32.4,
  //     pr_alfa: 65.8,
  //     pr_hc: 38.6,
  //     pr_vc: 31.2,
  //     pr_ln: 44.9,
  //     pr_sln: 49.1,
  //     al_alfa: 80.4,
  //     al_hc: 46.7,
  //     al_vc: 39.5,
  //     al_ln: 53.2,
  //     al_sln: 57.8,
  //     pl_alfa: 95.1,
  //     pl_hc: 60.3,
  //     pl_vc: 52.8,
  //     pl_ln: 68.4,
  //     pl_sln: 72.9,
  //   });
  //   console.log("Тестовые данные добавлены");
}, 1000);

// import { ref } from 'vue';
// import { SVG } from '@svgdotjs/svg.js'
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
  draw
    .image("src/assets/ost1.jpg")
    .attr("id", "mainimage")
    .size(400, 400)
    .move(300, 100),
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
    side,
  }))(rawdata);

  if (om.value.lateral_side) {
    // ========== СТАРАЯ СТРУКТУРА ДАННЫХ (для отката) ==========
    // const lateraldata_OLD = (({ length, height, ad, pd, av, pv, v }) => ({
    //   length,
    //   height,
    //   ad,
    //   pd,
    //   av,
    //   pv,
    //   v,
    // }))(rawdata);

    // ========== НОВАЯ СТРУКТУРА ДАННЫХ (разделенные поля) ==========
    const lateraldata = (({ length, height, ad, pd, av, pv, v }) => ({
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
    // ========== СТАРАЯ СТРУКТУРА ДАННЫХ (для отката) ==========
    // const dorsaldata_OLD = (({ length_dorsal, width, al, pl, ar, pr }) => ({
    //   length_dorsal,
    //   width,
    //   al,
    //   pl,
    //   ar,
    //   pr,
    // }))(rawdata);

    // ========== НОВАЯ СТРУКТУРА ДАННЫХ (разделенные поля) ==========
    const dorsaldata = (({ length_dorsal, width, al, pl, ar, pr }) => ({
      length_dorsal,
      width,
      // AR измерения
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
              row,
            ),
          )
          .join(","),
      ),
    )
    .join("\r\n");

  const status = exportFile(
    datatype + "-table-export.csv",
    content,
    "text/csv",
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
