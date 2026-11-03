<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div v-if="om" class="description-content" :class="{ 'description-content--editor': editorMode }">
    <p
      v-if="om.record_no !== undefined && om.record_no !== null"
      class="description-record"
    >
      <strong>Запись № {{ om.record_no }}</strong> —
      {{ om.label || "без метки" }}
      <span v-if="om.filename">({{ om.filename }})</span>
    </p>

    <!-- Режим редактора: markdown-исходник + панель переменных -->
    <div v-if="editorMode" class="description-editor">
      <MarkdownEditor
        ref="editorRef"
        v-model="editorText"
        class="description-editor__code"
      />
      <DescriptionVariablesPanel :groups="variableGroups" @insert="insertToken" />
    </div>

    <!-- Режим просмотра: markdown рендерится в HTML -->
    <div v-else class="description-rendered" v-html="renderedHtml"></div>
  </div>
  <div v-else class="description-empty">
    Нет данных для описания. Выберите созданное описание или создайте его по выбранным записям.
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import DescriptionVariablesPanel from "@/components/results/DescriptionVariablesPanel.vue";
import {
  DESCRIPTION_VARIABLE_GROUPS,
  defaultDescriptionMarkdown,
  renderDescriptionMarkdown,
} from "@/scripts/descriptionMarkdown.js";

const props = defineProps({
  om: { type: Object, default: null },
  markdown: { type: String, default: null },
  editorMode: { type: Boolean, default: false },
});

const emit = defineEmits(["update:markdown"]);

const variableGroups = DESCRIPTION_VARIABLE_GROUPS;

// markdown-источник: сохранённый текст либо дефолт, собранный по измерениям.
const markdownSource = computed(
  () => props.markdown ?? defaultDescriptionMarkdown(props.om),
);

const renderedHtml = computed(() =>
  renderDescriptionMarkdown(markdownSource.value, props.om),
);

// Локальный буфер редактора (компонент перемонтируется при смене описания).
const editorText = ref(markdownSource.value);

const editorRef = ref(null);

watch(editorText, (value) => emit("update:markdown", value));

// Вставка плейсхолдера в позицию курсора.
const insertToken = (token) => editorRef.value?.insertAtCursor(token);
</script>

<style scoped>
.description-content {
  font-size: 13px;
  line-height: 1.5;
}

/* В режиме редактора содержимое занимает всю доступную высоту */
.description-content--editor {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.description-record {
  color: var(--otri-text-muted);
  margin-bottom: 8px;
}

.description-empty {
  color: var(--otri-text-subtle);
  font-size: 13px;
}

/* Редактор: слева код, справа панель переменных.
   Обе колонки растягиваются на всю высоту и прокручиваются внутри. */
.description-editor {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
}

.description-editor__code {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

/* Стили отрендеренного markdown (v-html) */
.description-rendered :deep(h1),
.description-rendered :deep(h2),
.description-rendered :deep(h3),
.description-rendered :deep(h4) {
  margin: 10px 0 4px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

.description-rendered :deep(h2:first-child) {
  margin-top: 0;
}

.description-rendered :deep(p) {
  margin: 0 0 6px;
}

.description-rendered :deep(ul) {
  margin: 0 0 6px;
  padding-left: 18px;
}

.description-rendered :deep(li) {
  margin: 0 0 2px;
}
</style>
