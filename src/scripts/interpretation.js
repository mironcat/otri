// Качественная интерпретация измерений остракоды.
// Модуль общий для боковой панели (InterpretationResults.vue) и
// текстового описания под таблицами (IndexPage.vue), чтобы правила
// классификации были в одном месте.

export function getShellLengthType(length) {
  if (!(length > 0)) return "";
  if (length < 500) return "мелкая";
  if (length < 900) return "средней длины";
  return "крупная";
}
export function getPlenateType(plenateRatio) {
  const ratio = Number(plenateRatio);
  if (!Number.isFinite(ratio) || ratio <= 0) return "";
  if (ratio < 0.8) return "преплетная";
  if (ratio <= 1.2) return "амплетная";
  return "постплетная";
}

export function getDegreeOfElongation(length, height) {
  if (!(length > 0) || !(height > 0)) return "";
  const ratio = length / height;
  if (ratio < 1.7) return "укороченные";
  if (ratio < 2.1) return "умеренно удлинённые";
  return "удлинённые";
}

export function getSLNTypeofCurve(slnRate) {
  if (!Number.isFinite(slnRate)) return "";
  if (slnRate < 0.35) return "крутая";
  if (slnRate < 0.7) return "умеренная";
  return "пологая";
}

export function getAlfaTypeofCurve(alfa) {
  if (!(alfa > 0)) return "";
  if (alfa < 30) return "проксимальная";
  if (alfa < 60) return "медиальная";
  return "дистальная";
}

export function getOrientationTypeofCurve({ hc, vc }) {
  if (hc > vc) return "горизонтальная";
  if (Math.abs(hc - vc) < 20) return "нормальная";
  return "вертикальная";
}

const LATERAL_ARCS = {
  ad: "Передне-спинная дуга (ad)",
  pd: "Задне-спинная дуга (pd)",
  av: "Передне-брюшная дуга (av)",
  pv: "Задне-брюшная дуга (pv)",
};

const DORSAL_ARCS = {
  ar: "Передне-правая дуга (ar)",
  pr: "Задне-правая дуга (pr)",
  al: "Передне-левая дуга (al)",
  pl: "Задне-левая дуга (pl)",
};

const formatNumber = (value) =>
  Number.isFinite(value) ? value.toFixed(1) : "—";

// Одна дуга: ориентация, крутизна, положение точки перегиба
function describeArc(arc) {
  if (!arc) return "данных недостаточно";
  const ln = Number(arc.ln);
  const parts = [
    getOrientationTypeofCurve(arc),
    getSLNTypeofCurve(ln ? Number(arc.sln) / ln : NaN),
    getAlfaTypeofCurve(arc.alfa),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "данных недостаточно";
}

// Полный текст описания на основе измерений (структура как у om)
export function buildDescription(om) {
  if (!om) return "Недостаточно данных для описания.";

  const hasLateral = Boolean(om.lateral_side);
  const hasDorsal = Boolean(om.dorsal_side);
  if (!hasLateral && !hasDorsal) {
    return "Недостаточно данных для описания.";
  }

  const lines = [];
  lines.push("Общее описание");
  if (om.record_no !== undefined && om.record_no !== null) {
    lines.push(`Запись № ${om.record_no} — ${om.label || "без метки"}.`);
  }

  const numeric = [];
  if (om.length > 0) numeric.push(`длина: ${formatNumber(om.length)}`);
  if (om.height > 0) numeric.push(`высота: ${formatNumber(om.height)}`);
  if (om.length_dorsal > 0) {
    numeric.push(`длина (дорс.): ${formatNumber(om.length_dorsal)}`);
  }
  if (om.width > 0) numeric.push(`ширина: ${formatNumber(om.width)}`);
  if (numeric.length) {
    const text = numeric.join(", ");
    lines.push(`${text.charAt(0).toUpperCase()}${text.slice(1)}.`);
  }

  const length = om.length > 0 ? om.length : om.length_dorsal;
  const height = om.height > 0 ? om.height : om.width;
  if (length > 0) {
    lines.push(`По длине раковины: ${getShellLengthType(length)}.`);
  }
  if (length > 0 && height > 0) {
    const basis = om.length > 0 && om.height > 0 ? "" : " (L/W)";
    lines.push(
      `По степени удлинённости${basis}: ${getDegreeOfElongation(
        length,
        height,
      )}.`,
    );
  }
  if (hasLateral) {
    lines.push(`Сторона: ${om.side === "right" ? "правая" : "левая"}.`);
  }
  if (hasDorsal) {
    lines.push(`Полнота: ${om.fullness === "half" ? "половина" : "полная"}.`);
  }

  if (hasLateral) {
    lines.push("");
    lines.push("Латеральная сторона");
    Object.entries(LATERAL_ARCS).forEach(([key, name]) => {
      lines.push(`${name}: ${describeArc(om[key])}.`);
    });
  }

  if (hasLateral) {
    lines.push("");
    lines.push("Брюшной край");
    lines.push(
      `V: lv = ${formatNumber(om.v?.lv)}, lvl = ${formatNumber(om.v?.lvl)}, ` +
        `dv = ${formatNumber(om.v?.dv)}.`,
    );
  }

  if (hasDorsal) {
    lines.push("");
    lines.push("Дорсальная сторона");
    Object.entries(DORSAL_ARCS).forEach(([key, name]) => {
      lines.push(`${name}: ${describeArc(om[key])}.`);
    });
  }

  return lines.join("\n");
}

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

// Дуга из плоской строки таблицы: ad_alfa, ad_hc, ... -> { alfa, hc, ... }
const arcFromRow = (row, prefix) => ({
  alfa: toNumber(row[`${prefix}_alfa`]),
  hc: toNumber(row[`${prefix}_hc`]),
  vc: toNumber(row[`${prefix}_vc`]),
  ln: toNumber(row[`${prefix}_ln`]),
  sln: toNumber(row[`${prefix}_sln`]),
});

// Строка латеральной таблицы -> структура измерений
export function lateralRowToMeasurements(row) {
  if (!row) return null;
  return {
    record_no: row.record_no,
    label: row.label,
    filename: row.filename,
    side: row.side,
    length: toNumber(row.length),
    height: toNumber(row.height),
    ad: arcFromRow(row, "ad"),
    pd: arcFromRow(row, "pd"),
    av: arcFromRow(row, "av"),
    pv: arcFromRow(row, "pv"),
    v: {
      lv: toNumber(row.v_lv),
      lvl: toNumber(row.v_lvl),
      dv: toNumber(row.v_dv),
    },
  };
}

// Строка дорсальной таблицы -> структура измерений
export function dorsalRowToMeasurements(row) {
  if (!row) return null;
  return {
    record_no: row.record_no,
    label: row.label,
    filename: row.filename,
    fullness: row.fullness,
    length_dorsal: toNumber(row.length_dorsal),
    width: toNumber(row.width),
    ar: arcFromRow(row, "ar"),
    pr: arcFromRow(row, "pr"),
    al: arcFromRow(row, "al"),
    pl: arcFromRow(row, "pl"),
  };
}

// Объединённые измерения записи: латеральная и дорсальная строки
// таблиц сводятся в структуру, с которой работают описание и интерфейс
export function combineRecordMeasurements(lateralRow, dorsalRow) {
  const lateral = lateralRowToMeasurements(lateralRow);
  const dorsal = dorsalRowToMeasurements(dorsalRow);
  if (!lateral && !dorsal) return null;
  return {
    ...(dorsal || {}),
    ...(lateral || {}),
    lateral_side: Boolean(lateral),
    dorsal_side: Boolean(dorsal),
    concave_vs: Boolean(lateral),
  };
}

// Описание по записям таблиц: латеральная и дорсальная строки
// объединяются по номеру измерения (record_no)
export function buildDescriptionFromRecords(lateralRow, dorsalRow) {
  const om = combineRecordMeasurements(lateralRow, dorsalRow);
  return om ? buildDescription(om) : "Недостаточно данных для описания.";
}
