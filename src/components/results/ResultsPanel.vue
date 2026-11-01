<template>
  <div class="tables-panel q-mx-md q-mb-md">
    <div class="tables-split">
      <ResultsTable :rows="combinedRows" :selected-record-no="selectedNo" :show-description="descriptionVisible"
        @row-click="onRowClick" @edit-record="emit('edit-record', $event)"
        @delete-record="emit('delete-record', $event)" @update:show-description="descriptionVisible = $event" />
      <DescriptionPanel :visible="descriptionVisible" :options="recordOptions" :selected-record-no="selectedNo"
        :measurements="selectedMeasurements" @update:selected-record-no="selectedNo = $event" />
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from "vue";
import { combineRecordMeasurements } from "@/scripts/interpretation.js";
import { mergeRowsByRecordNo } from "@/scripts/resultsTable.js";
import ResultsTable from "@/components/results/ResultsTable.vue";
import DescriptionPanel from "@/components/results/DescriptionPanel.vue";

const props = defineProps({
  rows: { type: Object, required: true },
  selectedRecordNo: { type: Number, default: null },
  showDescription: { type: Boolean, default: true },
});

const emit = defineEmits([
  "update:selectedRecordNo",
  "update:showDescription",
  "edit-record",
  "delete-record",
]);

const selectedNo = computed({
  get: () => props.selectedRecordNo,
  set: (value) => emit("update:selectedRecordNo", value),
});

const descriptionVisible = computed({
  get: () => props.showDescription,
  set: (value) => emit("update:showDescription", value),
});

// Единая таблица: латеральная и дорсальная части одной записи
const combinedRows = computed(() => mergeRowsByRecordNo(props.rows));

// Список записей: латеральная и дорсальная строки объединяются по record_no
const recordOptions = computed(() => {
  const records = new Map();
  props.rows.lateral.forEach((row) => {
    records.set(row.record_no, {
      record_no: row.record_no,
      label: row.label,
      filename: row.filename,
      sides: ["Л"],
    });
  });
  props.rows.dorsal.forEach((row) => {
    const record = records.get(row.record_no);
    if (record) {
      record.sides.push("Д");
    } else {
      records.set(row.record_no, {
        record_no: row.record_no,
        label: row.label,
        filename: row.filename,
        sides: ["Д"],
      });
    }
  });
  return [...records.values()]
    .sort((a, b) => a.record_no - b.record_no)
    .map((record) => ({
      ...record,
      recordLabel: `№ ${record.record_no} — ${record.label || "без метки"} (${record.sides.join("+")})`,
    }));
});

// Если выбранной записи больше нет (например, её удалили),
// выбираем последнюю сохранённую
watch(recordOptions, (options) => {
  if (!options.length) {
    selectedNo.value = null;
    return;
  }
  if (!options.some((option) => option.record_no === selectedNo.value)) {
    selectedNo.value = options[options.length - 1].record_no;
  }
});

// Строки таблиц для выбранной записи
const selectedRecord = computed(() => {
  const recordNo = selectedNo.value;
  if (recordNo === null || recordNo === undefined) return null;
  return {
    lateral:
      props.rows.lateral.find((row) => row.record_no === recordNo) || null,
    dorsal:
      props.rows.dorsal.find((row) => row.record_no === recordNo) || null,
  };
});

// Измерения выбранной записи для компонента описания
const selectedMeasurements = computed(() => {
  const record = selectedRecord.value;
  if (!record) return null;
  return combineRecordMeasurements(record.lateral, record.dorsal);
});

// Клик по строке таблицы выбирает запись и показывает её описание.
// Редактирование записи запускается только иконкой «карандаш» на рамке,
// а не выбором строки: иначе случайный клик переключал бы активную геометрию.
const onRowClick = (row) => {
  if (row?.record_no === undefined || row?.record_no === null) return;
  selectedNo.value = row.record_no;
  descriptionVisible.value = true;
};
</script>

<style>
/* Нижняя панель: слева таблицы, справа текстовое описание.
   Ограниченная высота + независимая прокрутка половин,
   чтобы канвас всегда сохранял свободное место */
.tables-panel {
  flex: 0 1 auto;
  min-height: 0;
  max-height: 40vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Две равные половины по горизонтали */
.tables-split {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.tables-half {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

/* Правая половина с описанием */
.description-half {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--otri-border-soft);
}

/* Селектор записи в заголовке описания */
.record-select {
  min-width: 190px;
  max-width: 260px;
}

/* Прокручиваемая область описания */
.description-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--otri-border);
  border-radius: 4px;
  padding: 8px;
  background: var(--otri-surface);
}

/* Клик по строке таблицы выбирает запись для описания */
.tables-half .q-table tbody tr {
  cursor: pointer;
}

/* Подсветка выбранной записи */
.q-table tbody tr.selected-record-row,
.q-table tbody tr.selected-record-row>td {
  background: var(--otri-selected-row);
}

/* Таблицы подстраиваются под ширину половины панели:
   без горизонтальной прокрутки, содержимое переносится */
.table-wrap {
  width: 100%;
  min-width: 0;
}

.tables-half .q-table__middle {
  overflow-x: hidden;
}

.tables-half table.q-table {
  table-layout: fixed;
  width: 100%;
}

/* Верхняя панель таблицы (заголовок и кнопка экспорта)
   тоже переносится, а не расширяет таблицу */
.tables-half .q-table__top {
  flex-wrap: wrap;
}

/* Узкие колонки для компактного отображения */
.q-table th,
.q-table td {
  padding: 4px 8px;
  font-size: 12px;
}

/* Заголовки и ячейки с переносом текста */
.q-table th,
.q-table td {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.q-table th {
  max-width: 100px;
}

/* Компактные строки объединённой таблицы результатов */
.compact-table .q-table__middle table.q-table th,
.compact-table .q-table__middle table.q-table td {
  padding: 2px 6px;
  line-height: 1.15;
  vertical-align: middle;
}
</style>
