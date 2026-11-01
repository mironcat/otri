<template>
  <q-card flat bordered class="graphs-card" :class="{ 'graphs-card--fill': fill }">
    <q-card-section>
      <div class="row items-center justify-between q-gutter-sm">
        <div class="text-subtitle2">Длина и высота по выбранным записям</div>
        <div class="row items-center q-gutter-sm">
          <q-btn-toggle v-model="chartType" no-caps dense unelevated toggle-color="primary" :options="[
            { label: 'Violin', value: 'violin' },
            { label: 'BoxPlot', value: 'boxPlot' },
          ]" />
          <q-btn-toggle v-model="orientation" no-caps dense unelevated toggle-color="primary" :options="[
            { label: 'Гориз.', value: 'horizontal' },
            { label: 'Верт.', value: 'vertical' },
          ]" />
          <div class="text-caption text-grey-7">Записей: {{ records.length }}</div>
          <q-btn v-if="!windowMode" icon="open_in_new" flat dense round @click="emit('open-window')">
            <q-tooltip>Открыть в отдельном окне</q-tooltip>
          </q-btn>
          <q-btn v-else icon="close" flat dense round @click="emit('close-window')">
            <q-tooltip>Закрыть окно</q-tooltip>
          </q-btn>
        </div>
      </div>
      <div v-if="lengths.length || heights.length || widths.length"
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
        :options="chartOptions" :series="series" />
    </q-card-section>
    <q-card-section v-else class="text-body2 text-grey-7">
      {{ records.length
        ? "Включите хотя бы одну метрику для отображения."
        : "Выберите записи в таблице результатов, чтобы построить график." }}
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref } from "vue";
import { useQuasar } from "quasar";
import VueApexCharts from "vue3-apexcharts";
import "apexcharts/violin";
import { mergeRowsByRecordNo } from "@/scripts/resultsTable.js";

const props = defineProps({
  rows: { type: Object, required: true },
  selectedRecordNos: { type: Array, default: () => [] },
  focusedRecordNo: { type: Number, default: null },
  fill: { type: Boolean, default: false },
  windowMode: { type: Boolean, default: false },
});

const $q = useQuasar();
const emit = defineEmits(["focus-record", "open-window", "close-window"]);
const chartType = ref("violin");
const orientation = ref("horizontal");
const showLength = ref(true);
const showHeight = ref(true);
const showWidth = ref(true);
const chartKey = computed(() => `${chartType.value}-${orientation.value}`);
const chartHeight = computed(() => (props.fill ? "100%" : 320));

const allRows = computed(() => mergeRowsByRecordNo(props.rows));

const records = computed(() => {
  const selected = new Set(props.selectedRecordNos);
  return allRows.value.filter((row) => selected.has(row.record_no));
});

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
};

const lengths = computed(() =>
  records.value
    .map((row) => toPositiveNumber(row.length) ?? toPositiveNumber(row.length_dorsal))
    .filter((value) => value !== null),
);

const heights = computed(() =>
  records.value
    .map((row) => toPositiveNumber(row.height))
    .filter((value) => value !== null),
);

const widths = computed(() =>
  records.value
    .map((row) => toPositiveNumber(row.width))
    .filter((value) => value !== null),
);

// Подсвечиваем запись, выбранную кликом по строке таблицы
const highlightedRecord = computed(() => {
  if (props.focusedRecordNo == null) return null;
  return allRows.value.find((row) => row.record_no === props.focusedRecordNo) || null;
});

const highlightedLength = computed(() => {
  const row = highlightedRecord.value;
  if (!row) return null;
  return toPositiveNumber(row.length) ?? toPositiveNumber(row.length_dorsal);
});

const highlightedHeight = computed(() => {
  const row = highlightedRecord.value;
  if (!row) return null;
  return toPositiveNumber(row.height);
});

const highlightedWidth = computed(() => {
  const row = highlightedRecord.value;
  if (!row) return null;
  return toPositiveNumber(row.width);
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

const hasData = computed(() => distributions.value.length > 0);

// Встроенные точки violin не дают событий клика, поэтому рисуем
// наблюдения как point annotations — у них есть собственный click.
const pointAnnotations = computed(() => {
  const hasLength = distributions.value.some((item) => item.x === "Длина");
  const hasHeight = distributions.value.some((item) => item.x === "Высота");
  const hasWidth = distributions.value.some((item) => item.x === "Ширина");
  const isHorizontal = orientation.value === "horizontal";
  const jitter = (recordNo, metricIndex) => {
    const seed = Number(recordNo) * 37 + metricIndex * 101;
    const value = Math.sin(seed) * 10000;
    return (value - Math.floor(value) - 0.5) * 16;
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
      const offset = isFocused ? 0 : jitter(row.record_no, metricIndex);
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

const series = computed(() => [
  {
    name: "Значения",
    data: distributions.value,
  },
]);

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
  return Number.isFinite(number) ? Math.round(number) : value;
};

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

const chartOptions = computed(() => {
  const isViolin = chartType.value === "violin";
  const isHorizontal = orientation.value === "horizontal";
  return {
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
    annotations: pointAnnotations.value,
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { width: 1 },
    grid: {
      borderColor: $q.dark.isActive ? "#424242" : "#e0e0e0",
    },
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
            points: {
              show: false,
            },
          },
        }
        : {
          boxPlot: {
            whiskers: "minmax",
            points: { show: false },
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
