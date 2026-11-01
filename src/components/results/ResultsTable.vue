<template>
  <div class="tables-half col q-pr-sm">
    <div class="row">
      <div class="table-wrap">
        <q-table class="compact-table" :rows="rows" :columns="tableColumns" row-key="record_no" dense
          no-data-label="нет данных" @row-click="onRowClick" :row-class="rowClass">
          <template v-slot:body-cell-action="props">
            <q-td :props="props">
              <q-btn color="primary" icon="edit" flat dense @click.stop="emit('edit-record', props.row.record_no)">
                <q-tooltip>Редактировать рамку</q-tooltip>
              </q-btn>
              <q-btn color="primary" icon-right="delete" no-caps flat dense
                @click.stop="emit('delete-record', props.row)" />
            </q-td>
          </template>
          <template v-slot:top-left>
            <strong>Результаты измерений</strong>
          </template>
          <template v-slot:top-right>
            <q-btn size="sm" no-caps class="q-ml-sm" :color="showDescription ? 'secondary' : 'primary'"
              :icon="showDescription ? 'visibility_off' : 'visibility'"
              :label="showDescription ? 'Скрыть описание' : 'Показать описание'"
              @click="emit('update:show-description', !showDescription)">
              <q-tooltip>{{ showDescription ? 'Скрыть текстовое описание' : 'Показать текстовое описание'
              }}</q-tooltip>
            </q-btn>
          </template>
        </q-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { tableColumns } from "@/scripts/resultsTable.js";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  selectedRecordNo: { type: Number, default: null },
  showDescription: { type: Boolean, default: true },
});

const emit = defineEmits([
  "row-click",
  "edit-record",
  "delete-record",
  "update:show-description",
]);

// Подсветка строки выбранной записи
const rowClass = computed(
  () => (row) =>
    row.record_no === props.selectedRecordNo ? "selected-record-row" : "",
);

const onRowClick = (evt, row) => {
  emit("row-click", row);
};
</script>
