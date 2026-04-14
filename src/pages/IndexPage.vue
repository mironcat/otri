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
        />
        <q-radio
          v-show="om.lateral_side"
          v-model="om.side"
          val="right"
          label="Right"
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
      <div class="q-gutter-sm">
        <q-table
          :rows="rows.lateral"
          :columns="columns.lateral"
          row-key="record_no"
          no-data-label="no data"
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
      <div class="q-gutter-sm">
        <q-table
          :rows="rows.dorsal"
          :columns="columns.dorsal"
          row-key="record_no"
          no-data-label="no data"
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
const lateralColumns = [
  {
    name: "length",
    align: "center",
    label: "Length",
    field: "length",
    format: (val) => `${val.toFixed()}`,
    sortable: true,
  },
  {
    name: "height",
    label: "Height",
    field: "height",
    format: (val) => `${val.toFixed()}`,
    sortable: true,
  },
  {
    name: "ad",
    label: "AD(alfa,hc,vc,ln,sln)",
    field: "ad",
    format: (val) =>
      `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
    sortable: false,
  },
  {
    name: "pd",
    label: "PD(alfa,hc,vc,ln,sln)",
    field: "pd",
    format: (val) =>
      `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
    sortable: false,
  },
  {
    name: "av",
    label: "AV(alfa,hc,vc,ln,sln)",
    field: "av",
    format: (val) =>
      `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
    sortable: false,
  },
  {
    name: "pv",
    label: "PV(alfa,hc,vc,ln,sln)",
    field: "pv",
    format: (val) =>
      `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
    sortable: false,
  },
  {
    name: "v",
    label: "V(lv,lvl,dv)",
    field: "v",
    format: (val) =>
      `${val.lv.toFixed()}; ${val.lvl.toFixed()}; ${val.dv.toFixed()}`,
    sortable: false,
  },
];
const dorsalColumns = [
  {
    name: "width",
    label: "Width",
    field: "width",
    format: (val) => `${val.toFixed()}`,
    sortable: true,
  },
  {
    name: "ar",
    label: "AR(alfa,hc,vc,ln,sln)",
    field: "ar",
    format: (val) =>
      `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
    sortable: false,
  },
  {
    name: "pr",
    label: "PR(alfa,hc,vc,ln,sln)",
    field: "pr",
    format: (val) =>
      `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
    sortable: false,
  },
  {
    name: "al",
    label: "AL(alfa,hc,vc,ln,sln)",
    field: "al",
    format: (val) =>
      `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
    sortable: false,
  },
  {
    name: "pl",
    label: "PL(alfa,hc,vc,ln,sln)",
    field: "pl",
    format: (val) =>
      `${val.alfa.toFixed()}; ${val.hc.toFixed()}; ${val.vc.toFixed()}; ${val.ln.toFixed()}; ${val.sln.toFixed()}`,
    sortable: false,
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
    .move(300, 100)
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
  const basedata = (({ record_no, label, filename }) => ({
    record_no,
    label,
    filename,
  }))(rawdata);
  const lateraldata = (({ length, height, ad, pd, av, pv, v }) => ({
    length,
    height,
    ad,
    pd,
    av,
    pv,
    v,
  }))(rawdata);
  const dorsaldata = (({ length_dorsal, width, al, pl, ar, pr }) => ({
    length_dorsal,
    width,
    al,
    pl,
    ar,
    pr,
  }))(rawdata);
  if (om.value.lateral_side) {
    rows.value.lateral.push(Object.assign({}, basedata, lateraldata));
    // columns.value = columns.value.concat(lateralColumns)
  }
  // if (om.value.concave_vs) Object.assign(clearedrow, concavelateraldata)
  if (om.value.dorsal_side) {
    // columns.value = columns.value.concat(dorsalColumns)
    rows.value.dorsal.push(Object.assign({}, basedata, dorsaldata));
  }
  // console.log(clearedrow)
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
svg {
  border-style: solid;
  border-color: gray;
  border-width: thin;
}

image {
  border: 5px solid #ea0b0b;
}
</style>
