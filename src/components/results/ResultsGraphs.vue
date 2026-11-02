<template>
  <q-card flat bordered class="graphs-card" :class="{ 'graphs-card--fill': fill }">
    <q-card-section>
      <div class="row items-center justify-between q-gutter-sm">
        <div class="text-subtitle2">Длина и высота по выбранным записям</div>
        <div class="row items-center q-gutter-sm">
          <q-btn-toggle v-model="chartType" no-caps dense unelevated toggle-color="primary" :options="[
            { label: 'Violin', value: 'violin' },
            { label: 'BoxPlot', value: 'boxPlot' },
            { label: 'Scatter', value: 'scatter' },
            { label: 'Histogram', value: 'histogram' },
          ]" />
          <q-btn-toggle v-if="showOrientation" v-model="orientation" no-caps dense unelevated toggle-color="primary"
            :options="[
              { label: 'Гориз.', value: 'horizontal' },
              { label: 'Верт.', value: 'vertical' },
            ]" />
          <div class="text-caption text-grey-7">Записей: {{ records.length }}</div>
        </div>
      </div>
      <div v-if="chartType !== 'scatter' && (lengths.length || heights.length || widths.length)"
        class="row items-center q-gutter-md q-mt-sm">
        <q-toggle v-if="lengths.length" v-model="showLength" dense label="Длина" />
        <q-toggle v-if="heights.length" v-model="showHeight" dense label="Высота" />
        <q-toggle v-if="widths.length" v-model="showWidth" dense label="Ширина" />
      </div>
      <div v-if="highlightedRecord" class="graphs-record-card q-mt-sm">
        <div class="text-subtitle2">
          Запись № {{ highlightedRecord.record_no }} — {{ highlightedRecord.label || "без метки" }}
        </div>
        <div v-if="highlightedRecord.filename" class="text-caption text-grey-7">
          Файл: {{ highlightedRecord.filename }}
        </div>
        <div class="row q-gutter-md text-caption q-mt-xs">
          <span>Длина: {{ formatValue(highlightedLength) }}</span>
          <span v-if="highlightedHeight !== null">Высота: {{ formatValue(highlightedHeight) }}</span>
          <span v-if="highlightedWidth !== null">Ширина: {{ formatValue(highlightedWidth) }}</span>
          <span>Сторона: {{ sideLabel }}</span>
          <span>Полнота: {{ fullnessLabel }}</span>
        </div>
      </div>
    </q-card-section>
    <q-card-section v-if="hasData" class="graphs-card__chart">
      <VueApexCharts class="graphs-chart" :key="chartKey" :type="chartType" :height="chartHeight"
        :options="chartOptions" :series="series" @data-point-selection="onDataPointSelection" />
    </q-card-section>
    <q-card-section v-if="hasData" class="graphs-card__height">
      <div class="row items-center q-gutter-sm">
        <q-icon name="height" size="18px" />
        <q-slider v-model="chartHeight" :min="180" :max="900" :step="20" dense class="col" />
      </div>
      <div v-if="showViolinWidth" class="row items-center q-gutter-sm q-mt-sm">
        <q-icon name="open_in_full" size="18px" />
        <span class="text-caption graphs-card__slider-label">Ширина violin</span>
        <q-slider v-model="violinWidth" :min="0.2" :max="2" :step="0.1" dense class="col" />
        <span class="text-caption graphs-card__slider-value">{{ violinWidth.toFixed(1) }}</span>
      </div>
      <div v-if="showJitter" class="row items-center q-gutter-sm q-mt-sm">
        <q-icon name="scatter_plot" size="18px" />
        <span class="text-caption graphs-card__slider-label">Разброс jitter</span>
        <q-slider v-model="jitter" :min="0" :max="1" :step="0.05" dense class="col" />
        <span class="text-caption graphs-card__slider-value">{{ jitter.toFixed(2) }}</span>
      </div>
      <div v-if="showHistogramBins" class="row items-center q-gutter-sm q-mt-sm">
        <q-icon name="bar_chart" size="18px" />
        <span class="text-caption graphs-card__slider-label">Количество bins</span>
        <q-slider v-model="histogramBins" :min="5" :max="40" :step="1" dense class="col" />
        <span class="text-caption graphs-card__slider-value">{{ histogramBins }}</span>
      </div>
    </q-card-section>
    <q-card-section v-else class="text-body2 text-grey-7">
      {{ emptyMessage }}
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from "vue";
import { useQuasar } from "quasar";
import VueApexCharts from "vue3-apexcharts";
import "apexcharts/violin";
import { mergeRowsByRecordNo } from "@/scripts/resultsTable.js";
import { normalizeGraphSettings } from "@/scripts/resultsGraphSettings.js";

const props = defineProps({
  rows: { type: Object, required: true },
  selectedRecordNos: { type: Array, default: () => [] },
  focusedRecordNo: { type: Number, default: null },
  settings: { type: Object, default: () => ({}) },
  fill: { type: Boolean, default: false },
});

const $q = useQuasar();
const emit = defineEmits([
  "focus-record",
  "update:settings",
]);

const settingsModel = computed(() => normalizeGraphSettings(props.settings));

const updateSetting = (key, value) => {
  emit("update:settings", { ...settingsModel.value, [key]: value });
};

const chartType = computed({
  get: () => settingsModel.value.chartType,
  set: (value) => updateSetting("chartType", value),
});
const orientation = computed({
  get: () => settingsModel.value.orientation,
  set: (value) => updateSetting("orientation", value),
});
const showLength = computed({
  get: () => settingsModel.value.showLength,
  set: (value) => updateSetting("showLength", value),
});
const showHeight = computed({
  get: () => settingsModel.value.showHeight,
  set: (value) => updateSetting("showHeight", value),
});
const showWidth = computed({
  get: () => settingsModel.value.showWidth,
  set: (value) => updateSetting("showWidth", value),
});
const chartHeight = computed({
  get: () => settingsModel.value.height,
  set: (value) => updateSetting("height", value),
});
const violinWidth = computed({
  get: () => settingsModel.value.violinWidth,
  set: (value) => updateSetting("violinWidth", value),
});
const jitter = computed({
  get: () => settingsModel.value.jitter,
  set: (value) => updateSetting("jitter", value),
});
const histogramBins = computed({
  get: () => settingsModel.value.histogramBins,
  set: (value) => updateSetting("histogramBins", value),
});
const chartKey = computed(() => `${chartType.value}-${orientation.value}`);
// Jitter рисуем собственными point annotations — так работают клики
// по отдельным точкам. true временно включает встроенный jitter ApexCharts.
const USE_NATIVE_JITTER = false;
const isScatter = computed(() => chartType.value === "scatter");
const isHistogram = computed(() => chartType.value === "histogram");
const showOrientation = computed(
  () => chartType.value === "violin" || chartType.value === "boxPlot",
);
const showViolinWidth = computed(() => chartType.value === "violin");
const showJitter = computed(
  () => chartType.value === "violin" || chartType.value === "boxPlot",
);
const showHistogramBins = computed(() => chartType.value === "histogram");
const jitterPixels = computed(() => jitter.value * 32);

const allRows = computed(() => mergeRowsByRecordNo(props.rows));

const records = computed(() => {
  const selected = new Set(props.selectedRecordNos);
  return allRows.value.filter((row) => selected.has(row.record_no));
});

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
};

const recordLength = (row) =>
  toPositiveNumber(row.length) ?? toPositiveNumber(row.length_dorsal);
const recordHeight = (row) => toPositiveNumber(row.height);
const recordWidth = (row) => toPositiveNumber(row.width);

const lengths = computed(() =>
  records.value.map(recordLength).filter((value) => value !== null),
);

const heights = computed(() =>
  records.value.map(recordHeight).filter((value) => value !== null),
);

const widths = computed(() =>
  records.value.map(recordWidth).filter((value) => value !== null),
);

// Подсвечиваем запись, выбранную кликом по строке таблицы
const highlightedRecord = computed(() => {
  if (props.focusedRecordNo == null) return null;
  return allRows.value.find((row) => row.record_no === props.focusedRecordNo) || null;
});

const highlightedLength = computed(() => {
  const row = highlightedRecord.value;
  if (!row) return null;
  return recordLength(row);
});

const highlightedHeight = computed(() => {
  const row = highlightedRecord.value;
  if (!row) return null;
  return recordHeight(row);
});

const highlightedWidth = computed(() => {
  const row = highlightedRecord.value;
  if (!row) return null;
  return recordWidth(row);
});

const sideLabel = computed(() => {
  const side = highlightedRecord.value?.side;
  if (side === "right") return "правая";
  if (side === "left") return "левая";
  return "—";
});

const fullnessLabel = computed(() => {
  const fullness = highlightedRecord.value?.fullness;
  if (fullness === "half") return "половина";
  if (fullness === "full") return "полная";
  return "—";
});

const formatValue = (value) =>
  value === null || value === undefined ? "—" : Math.round(Number(value)).toString();

const distributions = computed(() => {
  const result = [];
  if (showLength.value && lengths.value.length) {
    result.push({ x: "Длина", points: lengths.value });
  }
  if (showHeight.value && heights.value.length) {
    result.push({ x: "Высота", points: heights.value });
  }
  if (showWidth.value && widths.value.length) {
    result.push({ x: "Ширина", points: widths.value });
  }
  return result;
});

const hasData = computed(() =>
  isScatter.value
    ? records.value.some(
      (row) => recordLength(row) !== null && recordHeight(row) !== null,
    )
    : distributions.value.length > 0,
);

const emptyMessage = computed(() => {
  if (!records.value.length) {
    return "Выберите записи в таблице результатов, чтобы построить график.";
  }
  if (isScatter.value) {
    return "Для scatter-графика у выбранных записей должны быть длина и высота.";
  }
  return "Включите хотя бы одну метрику для отображения.";
});

// Scatter строится по парам «длина — высота». Запись, подсвеченная в таблице,
// показывается даже если не входит в набор выбранных записей.
const scatterPoints = computed(() => {
  const selected = new Set(props.selectedRecordNos);
  const rows = records.value.slice();
  if (props.focusedRecordNo != null && !selected.has(props.focusedRecordNo)) {
    const row = allRows.value.find(
      (item) => item.record_no === props.focusedRecordNo,
    );
    if (row) rows.push(row);
  }

  return rows
    .map((row) => {
      const x = recordLength(row);
      const y = recordHeight(row);
      if (x === null || y === null) return null;
      return {
        x,
        y,
        width: recordWidth(row),
        row,
        isFocused: row.record_no === props.focusedRecordNo,
      };
    })
    .filter(Boolean);
});

// Встроенные точки violin не дают событий клика, поэтому рисуем
// наблюдения как point annotations — у них есть собственный click.
const pointAnnotations = computed(() => {
  const hasLength = distributions.value.some((item) => item.x === "Длина");
  const hasHeight = distributions.value.some((item) => item.x === "Высота");
  const hasWidth = distributions.value.some((item) => item.x === "Ширина");
  const isHorizontal = orientation.value === "horizontal";
  const jitterOffset = (recordNo, metricIndex) => {
    const seed = Number(recordNo) * 37 + metricIndex * 101;
    const value = Math.sin(seed) * 10000;
    return (value - Math.floor(value) - 0.5) * jitterPixels.value;
  };

  const annotationsFor = (row, isFocused) => {
    const points = [];
    const addPoint = (value, category, metricIndex) => {
      if (value === null || value === undefined) return;
      const color =
        category === "Длина"
          ? "#1976d2"
          : category === "Высота"
            ? "#2e7d32"
            : "#7b1fa2";
      const offset = isFocused ? 0 : jitterOffset(row.record_no, metricIndex);
      points.push({
        ...(isHorizontal
          ? { x: value, y: category }
          : { x: category, y: value }),
        marker: {
          size: isFocused ? 6 : 3,
          fillColor: isFocused ? "#ff8f00" : color,
          strokeColor: "#ffffff",
          strokeWidth: isFocused ? 2 : 1,
          ...(isHorizontal ? { offsetY: offset } : { offsetX: offset }),
          cssClass: "graphs-point",
        },
        label: isFocused
          ? {
            text: `№ ${row.record_no}`,
            textAnchor: "middle",
            borderColor: "#ff8f00",
            style: {
              background: "#ff8f00",
              color: "#ffffff",
              fontSize: "11px",
            },
          }
          : { text: "" },
        click: () => emit("focus-record", row.record_no),
      });
    };

    if (hasLength) {
      addPoint(
        toPositiveNumber(row.length) ?? toPositiveNumber(row.length_dorsal),
        "Длина",
        0,
      );
    }
    if (hasHeight) {
      addPoint(toPositiveNumber(row.height), "Высота", 1);
    }
    if (hasWidth) {
      addPoint(toPositiveNumber(row.width), "Ширина", 2);
    }

    return points;
  };

  const selected = new Set(props.selectedRecordNos);
  const points = records.value.flatMap((row) =>
    annotationsFor(row, row.record_no === props.focusedRecordNo),
  );

  // Запись могла быть выбрана в таблице, но не входить в набор для описания:
  // показываем её маркер поверх выбранных распределений.
  if (props.focusedRecordNo != null && !selected.has(props.focusedRecordNo)) {
    const row = allRows.value.find(
      (item) => item.record_no === props.focusedRecordNo,
    );
    if (row) points.push(...annotationsFor(row, true));
  }

  return { points };
});

const histogramSeries = computed(() =>
  distributions.value.map((item) => ({
    name: item.x,
    data: [...item.points],
  })),
);

const scatterSeries = computed(() => [
  {
    name: "Записи",
    data: scatterPoints.value.map((point) => ({
      x: point.x,
      y: point.y,
      fillColor: point.isFocused ? "#ff8f00" : "#1976d2",
      strokeColor: "#ffffff",
      meta: { record_no: point.row.record_no },
    })),
  },
]);

const series = computed(() => {
  if (isScatter.value) return scatterSeries.value;
  if (isHistogram.value) return histogramSeries.value;
  return [
    {
      name: "Значения",
      data: distributions.value,
    },
  ];
});

const onDataPointSelection = (event, chartContext, config) => {
  if (!isScatter.value) return;
  const point = scatterPoints.value[config?.dataPointIndex];
  if (point) emit("focus-record", point.row.record_no);
};

const roundChartValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      Number.isFinite(Number(item)) ? Math.round(Number(item)) : item,
    );
  }
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : value;
};

const axisLabelFormatter = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return Number.isInteger(number) ? number.toString() : number.toFixed(1);
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

const tooltipCustom = ({ dataPointIndex }) => {
  const item = distributions.value[dataPointIndex];
  if (!item || !item.points.length) return "";
  const min = Math.round(Math.min(...item.points));
  const max = Math.round(Math.max(...item.points));
  return `
    <div style="padding: 6px 10px; font-size: 12px; line-height: 1.5;">
      <div style="font-weight: 600; margin-bottom: 4px;">${item.x}</div>
      <div>Минимум: <strong>${min}</strong></div>
      <div>Максимум: <strong>${max}</strong></div>
      <div>Наблюдений: <strong>${item.points.length}</strong></div>
    </div>
  `;
};

const scatterTooltip = ({ dataPointIndex }) => {
  const point = scatterPoints.value[dataPointIndex];
  if (!point) return "";
  const row = point.row;
  return `
    <div style="padding: 6px 10px; font-size: 12px; line-height: 1.5;">
      <div style="font-weight: 600; margin-bottom: 4px;">Запись № ${row.record_no}</div>
      <div>Метка: <strong>${escapeHtml(row.label || "без метки")}</strong></div>
      <div>Длина: <strong>${point.x}</strong></div>
      <div>Высота: <strong>${point.y}</strong></div>
      ${point.width !== null ? `<div>Ширина: <strong>${point.width}</strong></div>` : ""}
      ${row.filename ? `<div style="color: #757575;">Файл: ${escapeHtml(row.filename)}</div>` : ""}
    </div>
  `;
};

const histogramTooltip = ({ series: chartSeries, seriesIndex, dataPointIndex, w }) => {
  const item = histogramSeries.value[seriesIndex];
  if (!item) return "";
  const edges = w?.histogramData?.edges;
  const from = edges?.[dataPointIndex];
  const to = edges?.[dataPointIndex + 1];
  const raw = chartSeries?.[seriesIndex]?.[dataPointIndex];
  const count = Array.isArray(raw) ? raw[1] : raw && typeof raw === "object" ? raw.y : raw;
  const range =
    Number.isFinite(Number(from)) && Number.isFinite(Number(to))
      ? `${axisLabelFormatter(from)}–${axisLabelFormatter(to)}`
      : "";
  return `
    <div style="padding: 6px 10px; font-size: 12px; line-height: 1.5;">
      <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(item.name)}</div>
      ${range ? `<div>Интервал: <strong>${range}</strong></div>` : ""}
      <div>Количество: <strong>${Number.isFinite(Number(count)) ? axisLabelFormatter(count) : "—"}</strong></div>
    </div>
  `;
};

const chartOptions = computed(() => {
  const isViolin = chartType.value === "violin";
  const isHorizontal = orientation.value === "horizontal";
  const baseOptions = {
    chart: {
      type: chartType.value,
      toolbar: { show: false },
      background: "transparent",
      foreColor: $q.dark.isActive ? "#e0e0e0" : "#333",
      animations: { enabled: false },
      redrawOnParentResize: true,
      redrawOnWindowResize: true,
    },
    theme: {
      mode: $q.dark.isActive ? "dark" : "light",
    },
    colors: ["#1976d2", "#2e7d32", "#7b1fa2"],
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { width: 1 },
    grid: {
      borderColor: $q.dark.isActive ? "#424242" : "#e0e0e0",
    },
  };

  if (isScatter.value) {
    return {
      ...baseOptions,
      chart: {
        ...baseOptions.chart,
        zoom: { enabled: false },
      },
      markers: {
        size: 5,
        strokeWidth: 1,
        hover: { size: 7 },
      },
      xaxis: {
        type: "numeric",
        title: { text: "Длина" },
        labels: { formatter: axisLabelFormatter },
      },
      yaxis: {
        title: { text: "Высота" },
        labels: { formatter: axisLabelFormatter },
      },
      tooltip: {
        custom: scatterTooltip,
        y: {
          formatter: roundChartValue,
        },
      },
    };
  }

  if (isHistogram.value) {
    return {
      ...baseOptions,
      legend: {
        show: histogramSeries.value.length > 1,
        position: "top",
        horizontalAlign: "left",
      },
      plotOptions: {
        bar: {
          horizontal: false,
          distributed: false,
        },
        histogram: {
          bins: histogramBins.value,
          normalize: "count",
          overlap: false,
        },
      },
      xaxis: {
        type: "numeric",
        title: { text: "Значение" },
        labels: { formatter: axisLabelFormatter },
      },
      yaxis: {
        title: { text: "Количество" },
        labels: { formatter: axisLabelFormatter },
      },
      tooltip: {
        custom: histogramTooltip,
        y: {
          formatter: roundChartValue,
        },
      },
    };
  }

  return {
    ...baseOptions,
    annotations: USE_NATIVE_JITTER
      ? { points: [] }
      : pointAnnotations.value,
    ...(isHorizontal
      ? { xaxis: { labels: { formatter: axisLabelFormatter } } }
      : { yaxis: { labels: { formatter: axisLabelFormatter } } }),
    plotOptions: {
      bar: {
        horizontal: isHorizontal,
        distributed: isViolin,
      },
      ...(isViolin
        ? {
          violin: {
            normalize: "group",
            bandwidthScale: violinWidth.value,
            points: {
              show: USE_NATIVE_JITTER,
              jitter: jitter.value,
              constrainToViolin: true,
            },
          },
        }
        : {
          boxPlot: {
            whiskers: "minmax",
            points: {
              show: USE_NATIVE_JITTER,
              jitter: jitter.value,
            },
            colors: {
              upper: "#1976d2",
              lower: "#2e7d32",
            },
          },
        }),
    },
    tooltip: {
      custom: tooltipCustom,
      y: {
        formatter: roundChartValue,
      },
    },
  };
});
</script>

<style scoped>
.graphs-card {
  width: 100%;
}

.graphs-card--fill {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.graphs-card--fill .graphs-card__chart {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.graphs-card--fill .graphs-chart {
  flex: 1 1 auto;
  min-height: 0;
}

.graphs-card__chart {
  padding-top: 0;
}

.graphs-card__height {
  padding-top: 0;
  padding-bottom: 8px;
}

.graphs-card__slider-label {
  min-width: 92px;
}

.graphs-card__slider-value {
  min-width: 34px;
  text-align: right;
}

.graphs-record-card {
  border: 1px solid var(--otri-border-soft, #e0e0e0);
  border-radius: 4px;
  padding: 8px 10px;
  background: var(--otri-surface, transparent);
}

.graphs-card :deep(.graphs-point) {
  cursor: pointer;
}
</style>
