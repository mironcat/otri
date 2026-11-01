// Построение описания по средним значениям нескольких записей.
// Числовые поля усредняются через simple-statistics, категориальные
// (сторона, полнота) берутся как самое частое значение.
import { mean } from "simple-statistics";
import { combineRecordMeasurements } from "@/scripts/interpretation.js";

const LATERAL_NUMERIC_FIELDS = [
  "length",
  "height",
  "ad_alfa",
  "ad_hc",
  "ad_vc",
  "ad_ln",
  "ad_sln",
  "pd_alfa",
  "pd_hc",
  "pd_vc",
  "pd_ln",
  "pd_sln",
  "av_alfa",
  "av_hc",
  "av_vc",
  "av_ln",
  "av_sln",
  "pv_alfa",
  "pv_hc",
  "pv_vc",
  "pv_ln",
  "pv_sln",
  "v_lv",
  "v_lvl",
  "v_dv",
];

const DORSAL_NUMERIC_FIELDS = [
  "length_dorsal",
  "width",
  "ar_alfa",
  "ar_hc",
  "ar_vc",
  "ar_ln",
  "ar_sln",
  "pr_alfa",
  "pr_hc",
  "pr_vc",
  "pr_ln",
  "pr_sln",
  "al_alfa",
  "al_hc",
  "al_vc",
  "al_ln",
  "al_sln",
  "pl_alfa",
  "pl_hc",
  "pl_vc",
  "pl_ln",
  "pl_sln",
];

const hasLateralData = (row) =>
  row.length !== undefined ||
  row.height !== undefined ||
  row.side !== undefined;

const hasDorsalData = (row) =>
  row.length_dorsal !== undefined ||
  row.width !== undefined ||
  row.fullness !== undefined;

const averageFields = (rows, fields) => {
  if (!rows.length) return null;
  const result = {};
  fields.forEach((field) => {
    const values = rows
      .map((row) => row[field])
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    result[field] = values.length ? mean(values) : 0;
  });
  return result;
};

const mostFrequent = (values, fallback) => {
  const counts = new Map();
  values
    .filter((value) => value !== undefined && value !== null && value !== "")
    .forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  let best = fallback;
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
};

const averageLabel = (count) =>
  count === 1 ? "Среднее по 1 записи" : `Среднее по ${count} записям`;

// records — объединённые строки таблицы (латеральные + дорсальные поля)
export const buildAveragedDescription = (records = []) => {
  const lateralRows = records.filter(hasLateralData);
  const dorsalRows = records.filter(hasDorsalData);
  const lateral = averageFields(lateralRows, LATERAL_NUMERIC_FIELDS);
  const dorsal = averageFields(dorsalRows, DORSAL_NUMERIC_FIELDS);
  const meta = {
    record_no: null,
    label: averageLabel(records.length),
    filename: "",
  };

  if (lateral) {
    Object.assign(lateral, meta, {
      side: mostFrequent(
        lateralRows.map((row) => row.side),
        "left",
      ),
    });
  }
  if (dorsal) {
    Object.assign(dorsal, meta, {
      fullness: mostFrequent(
        dorsalRows.map((row) => row.fullness),
        "full",
      ),
    });
  }

  return combineRecordMeasurements(lateral, dorsal);
};
