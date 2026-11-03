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
          <!-- Пагинация + экспорт в одном подвале таблицы -->
          <template v-slot:pagination="scope">
            <span v-if="scope.pagination.rowsPerPage !== 0" class="q-table__bottom-item">
              {{ paginationLabel(scope) }}
            </span>
            <template v-if="scope.pagesNumber > 1">
              <q-btn v-if="scope.pagesNumber > 2" round dense flat size="sm" color="primary" icon="first_page"
                :disable="scope.isFirstPage" aria-label="Первая страница" @click="scope.firstPage" />
              <q-btn round dense flat size="sm" color="primary" icon="chevron_left" :disable="scope.isFirstPage"
                aria-label="Предыдущая страница" @click="scope.prevPage" />
              <q-btn round dense flat size="sm" color="primary" icon="chevron_right" :disable="scope.isLastPage"
                aria-label="Следующая страница" @click="scope.nextPage" />
              <q-btn v-if="scope.pagesNumber > 2" round dense flat size="sm" color="primary" icon="last_page"
                :disable="scope.isLastPage" aria-label="Последняя страница" @click="scope.lastPage" />
            </template>
            <q-btn size="sm" no-caps color="brown" icon-right="archive" label="Экспорт в CSV" class="q-ml-md"
              @click="emit('export-csv')" />
          </template>
        </q-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useQuasar } from "quasar";
import { tableColumns } from "@/scripts/resultsTable.js";

const $q = useQuasar();

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

// Текст диапазона строк в пагинации (как в стандартном подвале QTable)
const paginationLabel = ({ pagination }) => {
  const total = props.rows.length;
  if (pagination.rowsPerPage === 0) {
    return $q.lang.table.pagination(1, total, total);
  }
  const first = (pagination.page - 1) * pagination.rowsPerPage + 1;
  const last = Math.min(pagination.page * pagination.rowsPerPage, total);
  return $q.lang.table.pagination(first, last, total);
};
</script>
