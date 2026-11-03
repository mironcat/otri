<template>
  <div class="tables-panel q-mx-md q-mb-md">
    <q-splitter v-model="descriptionSplit" class="tables-split" :limits="splitLimits"
      :disable="!descriptionVisible">
      <template v-slot:before>
        <ResultsTable :rows="combinedRows" :selected-record-nos="selectedNos" :active-record-no="activeRecordNo"
          :show-description="descriptionVisible" @update:selected-record-nos="selectedNos = $event"
          @create-description="createDescription" @export-csv="emit('export-csv')"
          @focus-record="emit('focus-record', $event)" @edit-record="emit('edit-record', $event)"
          @delete-record="emit('delete-record', $event)" @update:show-description="descriptionVisible = $event" />
      </template>
      <template v-slot:after>
        <DescriptionPanel :visible="descriptionVisible" :descriptions="descriptionsModel"
          :selected-description-id="selectedDescriptionIdModel" :description="selectedDescription"
          :editor-mode="descriptionEditor"
          @update:selected-description-id="selectedDescriptionIdModel = $event"
          @toggle-description-editor="descriptionEditor = !descriptionEditor"
          @update-description-markdown="updateDescriptionMarkdown"
          @delete-description="deleteDescription" />
      </template>
    </q-splitter>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useQuasar } from "quasar";
import { mergeRowsByRecordNo } from "@/scripts/resultsTable.js";
import { buildAveragedDescription } from "@/scripts/resultsDescription.js";
import { defaultDescriptionMarkdown } from "@/scripts/descriptionMarkdown.js";
import { getDescriptionTemplate } from "@/scripts/descriptionTemplate.js";
import ResultsTable from "@/components/results/ResultsTable.vue";
import DescriptionPanel from "@/components/results/DescriptionPanel.vue";

const $q = useQuasar();

const props = defineProps({
  rows: { type: Object, required: true },
  selectedRecordNos: { type: Array, default: () => [] },
  activeRecordNo: { type: Number, default: null },
  descriptions: { type: Array, default: () => [] },
  selectedDescriptionId: { type: String, default: null },
  showDescription: { type: Boolean, default: true },
});

const emit = defineEmits([
  "update:selectedRecordNos",
  "update:descriptions",
  "update:selectedDescriptionId",
  "update:showDescription",
  "export-csv",
  "focus-record",
  "edit-record",
  "delete-record",
]);

const selectedNos = computed({
  get: () => props.selectedRecordNos,
  set: (value) => emit("update:selectedRecordNos", value || []),
});

const descriptionsModel = computed({
  get: () => props.descriptions,
  set: (value) => emit("update:descriptions", value),
});

const selectedDescriptionIdModel = computed({
  get: () => props.selectedDescriptionId,
  set: (value) => emit("update:selectedDescriptionId", value),
});

const descriptionVisible = computed({
  get: () => props.showDescription,
  set: (value) => emit("update:showDescription", value),
});

// Режим редактора описания: таблица — 1/3, описание — 2/3
const descriptionEditor = ref(false);

// Положение разделителя таблица/описание (проценты, ширина таблицы).
// В режиме редактора описание шире; при скрытом описании таблица на всю ширину.
const descriptionSplit = ref(50);
const splitLimits = computed(() =>
  descriptionVisible.value ? [20, 80] : [100, 100],
);
watch(
  () => [descriptionVisible.value, descriptionEditor.value],
  ([visible, editor]) => {
    descriptionSplit.value = visible ? (editor ? 34 : 50) : 100;
  },
  { immediate: true },
);

// Единая таблица: латеральная и дорсальная части одной записи
const combinedRows = computed(() => mergeRowsByRecordNo(props.rows));

// Выбранное пользователем описание (созданное по средним значениям)
const selectedDescription = computed(
  () =>
    props.descriptions.find(
      (description) => description.id === props.selectedDescriptionId,
    ) || null,
);

// Удалённые записи не должны оставаться в выборе для нового описания
watch(combinedRows, (rows) => {
  const valid = new Set(rows.map((row) => row.record_no));
  const next = props.selectedRecordNos.filter((recordNo) =>
    valid.has(recordNo),
  );
  if (next.length !== props.selectedRecordNos.length) {
    selectedNos.value = next;
  }
});

const recordsWord = (count) => {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "записей";
  if (last === 1) return "запись";
  if (last >= 2 && last <= 4) return "записи";
  return "записей";
};

// Создать описание по средним значениям выбранных записей
const createDescription = () => {
  const records = combinedRows.value.filter((row) =>
    props.selectedRecordNos.includes(row.record_no),
  );
  if (!records.length) return;

  const measurements = buildAveragedDescription(records);
  if (!measurements) return;

  const number = props.descriptions.length + 1;
  const count = records.length;
  // Шаблон из localStorage применяется к новым описаниям; если его нет —
  // используем встроенный шаблон, собранный по измерениям.
  const template = getDescriptionTemplate();
  const description = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Среднее №${number} — ${count} ${recordsWord(count)}`,
    recordNos: records.map((row) => row.record_no),
    measurements,
    markdown: template ?? defaultDescriptionMarkdown(measurements),
    createdAt: new Date().toISOString(),
  };

  descriptionsModel.value = [...props.descriptions, description];
  selectedDescriptionIdModel.value = description.id;
  descriptionVisible.value = true;
};

// Обновить markdown-текст выбранного описания
const updateDescriptionMarkdown = (markdown) => {
  const description = selectedDescription.value;
  if (!description) return;
  descriptionsModel.value = props.descriptions.map((item) =>
    item.id === description.id ? { ...item, markdown } : item,
  );
};

// Удалить выбранное описание, выбрав соседнее оставшееся
const deleteDescription = () => {
  const description = selectedDescription.value;
  if (!description) return;

  $q.dialog({
    title: "Удаление описания",
    message: `Удалить «${description.name}»?`,
    cancel: { label: "Отмена", flat: true, color: "grey" },
    ok: { label: "Удалить", color: "negative", unelevated: true },
    persistent: true,
    focus: "cancel",
  }).onOk(() => {
    const index = props.descriptions.findIndex(
      (item) => item.id === description.id,
    );
    const next = props.descriptions.filter(
      (item) => item.id !== description.id,
    );
    descriptionsModel.value = next;
    selectedDescriptionIdModel.value =
      next[Math.min(index, next.length - 1)]?.id ?? null;
  });
};
</script>

<style>
/* Нижняя панель: слева таблицы, справа текстовое описание.
   Фиксированная высота даёт q-splitter определённую высоту для панелей. */
.tables-panel {
  flex: 0 0 40vh;
  height: 40vh;
  min-height: 0;
  max-height: 40vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Когда холст скрыт, панель результатов занимает освободившееся место */
.tables-panel--expanded {
  flex: 1 1 0%;
  height: auto;
  max-height: none;
}

/* q-splitter: таблица слева, описание справа */
.tables-split {
  flex: 1 1 0%;
  min-height: 0;
  height: auto;
}

.tables-half {
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

/* Правая половина с описанием */
.description-half {
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Селектор записи в заголовке описания */
.record-select {
  min-width: 190px;
  max-width: 260px;
}

/* Прокручиваемая область описания */
.description-body {
  flex: 1 1 0%;
  height: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border: 1px solid var(--otri-border);
  border-radius: 4px;
  padding: 8px;
  background: var(--otri-surface);
}

/* Подсветка записей, выбранных для создания описания */
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

/* Колонка выбора: при table-layout: fixed нужна явная ширина,
   иначе чекбокс выходит за границы ячейки и соседняя ячейка
   перехватывает клики по его правой половине */
.tables-half table.q-table .q-table--col-auto-width {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  text-align: center;
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
