// Параметры панели графиков. Используются и в IndexPage (окно),
// и в MainLayout (sidebar), чтобы состояние было общим.
export const DEFAULT_GRAPH_SETTINGS = {
  chartType: "violin",
  orientation: "horizontal",
  showLength: true,
  showHeight: true,
  showWidth: true,
  height: 320,
  // Множитель ширины violin (plotOptions.violin.bandwidthScale).
  violinWidth: 1,
  // Доля разброса встроенных точек ApexCharts (points.jitter), 0..1.
  jitter: 0.5,
  // Количество бинов гистограммы.
  histogramBins: 10,
};

export const normalizeGraphSettings = (value) => ({
  ...DEFAULT_GRAPH_SETTINGS,
  ...(value && typeof value === "object" ? value : {}),
});
