<template>
  <div class="tables-half col q-pr-sm">
    <div class="row">
      <div class="table-wrap">
        <q-table class="compact-table" :rows="rows" :columns="tableColumns" row-key="record_no" dense
          no-data-label="нет данных" selection="multiple" :selected="selectedRows"
          :selected-rows-label="selectedRowsLabel" :row-class="rowClass"
          @row-click="onRowClick" @update:selected="onSelectionUpdate">
          <template v-slot:body-cell-action="props">
            <q-td :props="props">
              <q-btn :color="activeRecordNo === props.row.record_no ? 'orange-8' : 'primary'" icon="edit" flat dense
                @click.stop="emit('edit-record', props.row.record_no)">
                <q-tooltip>{{ activeRecordNo === props.row.record_no ? 'Отменить редактирование' : 'Редактировать рамку' }}</q-tooltip>
              </q-btn>
              <q-btn color="primary" icon-right="delete" no-caps flat dense
                @click.stop="emit('delete-record', props.row)" />
            </q-td>
          </template>
          <template v-slot:top-left>
            <strong>Результаты измерений</strong>
          </template>
          <template v-slot:top-right>
            <q-btn size="sm" no-caps class="q-ml-sm" color="primary" label="Создать описание"
              :disable="selectedRecordNos.length === 0" @click="emit('create-description')">
              <q-tooltip>
                {{ selectedRecordNos.length === 0
                  ? 'Выберите хотя бы одну запись'
                  : `Создать описание по ${selectedRecordNos.length} ${selectedRecordNos.length === 1 ? 'записи' : 'записям'}`
                }}
              </q-tooltip>
            </q-btn>
            <q-btn size="sm" no-caps class="q-ml-sm" :color="showDescription ? 'secondary' : 'primary'"
              :icon="showDescription ? 'visibility_off' : 'visibility'"
              :label="showDescription ? 'Скрыть описание' : 'Показать описание'"
              @click="emit('update:show-description', !showDescription)">
              <q-tooltip>{{ showDescription ? 'Скрыть текстовое описание' : 'Показать текстовое описание'
              }}</q-tooltip>
            </q-btn>
          </template>
        </q-table>
        <div class="results-table-footer">
          <q-btn v-show="rows.length > 0" size="sm" no-caps color="brown" icon-right="archive"
            label="Экспорт в CSV" @click="emit('export-csv')" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { tableColumns } from "@/scripts/resultsTable.js";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  selectedRecordNos: { type: Array, default: () => [] },
  activeRecordNo: { type: Number, default: null },
  showDescription: { type: Boolean, default: true },
});

const emit = defineEmits([
  "update:selected-record-nos",
  "create-description",
  "export-csv",
  "focus-record",
  "edit-record",
  "delete-record",
  "update:show-description",
]);

// Quasar хранит в selected сами строки, а наружу отдаём только номера записей.
// Иначе в состояние попадают реактивные объекты строк, которые нельзя
// передать через IPC при сохранении проекта.
const selectedRows = computed(() =>
  props.rows.filter((row) => props.selectedRecordNos.includes(row.record_no)),
);

const onSelectionUpdate = (rows) => {
  emit(
    "update:selected-record-nos",
    rows.map((row) => row.record_no),
  );
};

// Клик по строке только выбирает запись для подсветки на графике
const onRowClick = (evt, row) => {
  emit("focus-record", row.record_no);
};

// Подсветка строк, выбранных для создания описания
const rowClass = computed(
  () => (row) =>
    props.selectedRecordNos.includes(row.record_no)
      ? "selected-record-row"
      : "",
);

const selectedRowsLabel = (numberOfRows) =>
  numberOfRows === 0 ? "" : `Выбрано записей: ${numberOfRows}`;
</script>

<style scoped>
/* Подвал таблицы: экспорт результатов */
.results-table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px;
  border-top: 1px solid var(--otri-border-soft);
}
</style>
