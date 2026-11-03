<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div v-if="om" class="description-content" :class="{ 'description-content--editor': editorMode }">
    <p v-if="om.record_no !== undefined && om.record_no !== null" class="description-record">
      <strong>Запись № {{ om.record_no }}</strong> —
      {{ om.label || "без метки" }}
      <span v-if="om.filename">({{ om.filename }})</span>
    </p>

    <!-- Режим редактора: markdown-исходник + панель переменных.
         Ширина панели переменных меняется перетаскиванием разделителя. -->
    <div v-if="editorMode" ref="editorRootRef" class="description-editor">
      <div class="description-editor__main">
        <q-tabs v-model="editorTab" dense no-caps align="left" class="description-editor__tabs">
          <q-tab name="markdown" icon="code" label="" />
          <q-tab name="variables" icon="functions" label="" />
        </q-tabs>
        <q-tab-panels v-model="editorTab" keep-alive class="description-editor__panels">
          <q-tab-panel name="markdown" class="description-editor__panel">
            <MarkdownEditor ref="editorRef" v-model="editorText" class="description-editor__code" />
          </q-tab-panel>
          <q-tab-panel name="variables" class="description-editor__panel">
            <CustomVariablesEditor />
          </q-tab-panel>
        </q-tab-panels>
      </div>
      <div class="description-editor__resizer" role="separator" aria-orientation="vertical" tabindex="0"
        aria-label="Изменить ширину панели переменных" @pointerdown="startEditorResize"
        @keydown.left.prevent="nudgeEditorVars(-16)" @keydown.right.prevent="nudgeEditorVars(16)"></div>
      <div class="description-editor__vars" :style="{ width: `${editorVarsWidth}px` }">
        <DescriptionVariablesPanel :groups="variableGroups" @insert="insertToken" />
      </div>
    </div>

    <!-- Режим просмотра: markdown рендерится в HTML -->
    <div v-else class="description-rendered" v-html="renderedHtml"></div>
  </div>
  <div v-else class="description-empty">
    Нет данных для описания. Выберите созданное описание или создайте его по выбранным записям.
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import CustomVariablesEditor from "@/components/CustomVariablesEditor.vue";
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

// Активная вкладка левой части редактора: markdown или редактор переменных.
const editorTab = ref("markdown");

// Ширина панели переменных (px). Меняется перетаскиванием разделителя.
const EDITOR_VARS_MIN = 160;
const EDITOR_CODE_MIN = 240;
const editorVarsWidth = ref(260);
const editorRootRef = ref(null);

const clampEditorVarsWidth = (width) => {
  const root = editorRootRef.value;
  const max = root
    ? Math.max(EDITOR_VARS_MIN, root.clientWidth - EDITOR_CODE_MIN)
    : width;
  return Math.min(max, Math.max(EDITOR_VARS_MIN, width));
};

const nudgeEditorVars = (delta) => {
  editorVarsWidth.value = clampEditorVarsWidth(editorVarsWidth.value + delta);
};

// Перетаскивание разделителя: ширина считается от правого края редактора.
const startEditorResize = (event) => {
  const resizer = event.currentTarget;
  const root = resizer?.parentElement;
  if (!root) return;
  event.preventDefault();
  const right = root.getBoundingClientRect().right;
  const onMove = (moveEvent) => {
    const next = right - moveEvent.clientX - resizer.offsetWidth / 2;
    editorVarsWidth.value = clampEditorVarsWidth(next);
  };
  const stop = () => {
    resizer.removeEventListener("pointermove", onMove);
    resizer.removeEventListener("pointerup", stop);
    resizer.removeEventListener("pointercancel", stop);
  };
  resizer.setPointerCapture?.(event.pointerId);
  resizer.addEventListener("pointermove", onMove);
  resizer.addEventListener("pointerup", stop);
  resizer.addEventListener("pointercancel", stop);
};

watch(editorText, (value) => emit("update:markdown", value));

// Вставка плейсхолдера: показываем вкладку markdown и вставляем в позицию курсора.
const insertToken = (token) => {
  editorTab.value = "markdown";
  nextTick(() => editorRef.value?.insertAtCursor(token));
};
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
  flex: 1 1 0%;
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
   Обе колонки растягиваются на всю высоту, разделитель меняет их ширину. */
.description-editor {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex: 1 1 0%;
  min-height: 0;
}

/* Левая часть: вкладки Markdown / Переменные */
.description-editor__main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.description-editor__tabs {
  flex: 0 0 auto;
}

.description-editor__panels {
  flex: 1 1 auto;
  min-height: 0;
}

.description-editor__panels :deep(.q-panel) {
  height: 100%;
}

.description-editor__panel {
  height: 100%;
  padding: 0;
}

.description-editor__code {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

/* Панель переменных: ширина задаётся из скрипта, высота — растяжением */
.description-editor__vars {
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Перетаскиваемая граница между кодом и панелью переменных */
.description-editor__resizer {
  flex: 0 0 8px;
  position: relative;
  cursor: col-resize;
  touch-action: none;
}

.description-editor__resizer::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 3px;
  width: 2px;
  border-radius: 1px;
  background: var(--otri-border);
}

.description-editor__resizer:hover::before,
.description-editor__resizer:focus-visible::before {
  background: var(--q-primary);
}

.description-editor__resizer:focus-visible {
  outline: none;
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
