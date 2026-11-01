// Экспорт объединённой таблицы результатов в CSV.
import { exportFile } from "quasar";
import {
  formatNumber,
  formatSide,
  formatFullness,
} from "@/scripts/resultsTable.js";

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

// rows — объект { lateral, dorsal }, $q — экземпляр Quasar для уведомления
export const exportCombinedTable = (rows, $q) => {
  const mergedData = {};

  rows.lateral.forEach((row) => {
    const key = row.record_no;
    if (!mergedData[key]) {
      mergedData[key] = {};
    }
    mergedData[key] = { ...mergedData[key], ...row };
  });

  rows.dorsal.forEach((row) => {
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
