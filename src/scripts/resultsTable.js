// Форматирование и структура таблицы результатов.
// Модуль общий для панели результатов и экспорта CSV,
// чтобы подписи и форматы значений не расходились.

// Вспомогательная функция для форматирования чисел
export const formatNumber = (val) =>
  val !== undefined && val !== null ? `${val.toFixed()}` : "";

// Значения данных (left/right, full/half) остаются прежними —
// переводим только их отображение в таблицах и CSV
export const formatSide = (val) =>
  val === "right" ? "правая" : val === "left" ? "левая" : val;

export const formatFullness = (val) =>
  val === "half" ? "половина" : val === "full" ? "полная" : val;

const baseColumns = [
  {
    name: "no",
    align: "center",
    label: "№",
    field: "record_no",
    sortable: true,
  },
  {
    name: "filename",
    required: true,
    label: "Имя файла",
    align: "left",
    field: "filename",
    // format: val => `File:${val}`,
    sortable: true,
  },
  {
    name: "label",
    align: "center",
    label: "Метка",
    field: "label",
    sortable: true,
  },
];

// Колонки объединённой таблицы: латеральные и дорсальные данные в одной строке
export const tableColumns = baseColumns.concat([
  {
    name: "side",
    align: "center",
    label: "Сторона",
    field: "side",
    format: formatSide,
    sortable: true,
  },
  {
    name: "fullness",
    align: "center",
    label: "Полнота",
    field: "fullness",
    format: formatFullness,
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
    align: "center",
    label: "H",
    field: "height",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "width",
    align: "center",
    label: "W",
    field: "width",
    format: formatNumber,
    sortable: true,
  },
  {
    name: "action",
    align: "center",
    label: "Действия",
    field: "action",
  },
]);

// Единая таблица: латеральная и дорсальная части одной записи
// объединяются по record_no.
export const mergeRowsByRecordNo = ({ lateral = [], dorsal = [] } = {}) => {
  const merged = new Map();
  const mergeRow = (row) => {
    merged.set(row.record_no, {
      ...(merged.get(row.record_no) || {}),
      ...row,
    });
  };
  lateral.forEach(mergeRow);
  dorsal.forEach(mergeRow);
  return [...merged.values()].sort((a, b) => a.record_no - b.record_no);
};
