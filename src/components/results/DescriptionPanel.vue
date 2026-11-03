<template>
  <div v-show="visible" class="description-half col q-pl-md">
    <div class="row items-center q-mb-xs">
      <div class="text-subtitle2">Описание</div>
      <q-space />
      <q-btn size="sm" no-caps class="q-mr-sm" :color="editorMode ? 'secondary' : 'primary'"
        :icon="editorMode ? 'done' : 'edit'" :label="editorMode ? 'Готово' : 'Редактор описания'"
        @click="emit('toggle-description-editor')">
        <q-tooltip>{{ editorMode ? 'Вернуться к просмотру описания' : 'Редактировать описание в формате Markdown' }}</q-tooltip>
      </q-btn>
      <q-btn size="sm" no-caps class="q-mr-sm" color="primary" icon="save" label="Сохранить шаблон"
        :disable="!description" @click="saveDescriptionTemplate">
        <q-tooltip>Сохранить текущий markdown как шаблон для новых описаний во всех будущих проектах</q-tooltip>
      </q-btn>
      <q-select :model-value="selectedDescriptionId" :options="descriptions" option-value="id"
        option-label="name" emit-value map-options dense outlined options-dense label="Описание"
        :disable="descriptions.length === 0" class="record-select"
        @update:model-value="emit('update:selected-description-id', $event)" />
      <q-btn icon="delete" flat dense round color="negative" class="q-ml-xs" :disable="!selectedDescriptionId"
        @click="emit('delete-description')">
        <q-tooltip>Удалить описание</q-tooltip>
      </q-btn>
    </div>
    <div class="description-body">
      <div v-if="description" class="text-caption description-source">
        Записи: № {{ description.recordNos.join(", № ") }}
      </div>
      <Description :key="description?.id" :om="description?.measurements"
        :markdown="description?.markdown" :editor-mode="editorMode"
        @update:markdown="emit('update-description-markdown', $event)" />
    </div>
  </div>
</template>

<script setup>
import { useQuasar } from "quasar";
import Description from "@/components/Description.vue";
import { defaultDescriptionMarkdown } from "@/scripts/descriptionMarkdown.js";
import { setDescriptionTemplate } from "@/scripts/descriptionTemplate.js";

const $q = useQuasar();

const props = defineProps({
  visible: { type: Boolean, default: true },
  descriptions: { type: Array, default: () => [] },
  selectedDescriptionId: { type: String, default: null },
  description: { type: Object, default: null },
  editorMode: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:selected-description-id",
  "toggle-description-editor",
  "delete-description",
  "update-description-markdown",
]);

// Сохранить markdown текущего описания как глобальный шаблон для новых
// описаний. Уже созданные описания (в т.ч. текущего проекта) не меняются.
const saveDescriptionTemplate = () => {
  if (!props.description) return;
  const markdown =
    props.description.markdown ??
    defaultDescriptionMarkdown(props.description.measurements);
  if (!markdown) return;

  if (setDescriptionTemplate(markdown)) {
    $q.notify({
      message: "Шаблон описания сохранён",
      color: "positive",
      icon: "save",
      timeout: 1500,
    });
  } else {
    $q.notify({
      message: "Не удалось сохранить шаблон",
      color: "negative",
      icon: "error",
    });
  }
};
</script>

<style scoped>
.description-source {
  margin-bottom: 6px;
  color: var(--otri-text-muted);
}
</style>
