<template>
  <div class="markdown-editor">
    <pre ref="highlightRef" class="markdown-editor__highlight" aria-hidden="true" v-html="highlightedHtml"></pre>
    <textarea
      ref="textareaRef"
      class="markdown-editor__input"
      :value="modelValue"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      data-gramm="false"
      @input="onInput"
      @scroll="syncScroll"
      @keydown.tab.prevent="onTab"
    ></textarea>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import prism from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism-solarizedlight.css";

const props = defineProps({
  modelValue: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const textareaRef = ref(null);
const highlightRef = ref(null);

const escapeHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Подсветка markdown; завершающий перенос строки оставляет место
// под курсор после последней строки.
const highlightedHtml = computed(() => {
  const code = props.modelValue || "";
  const grammar = prism.languages.markdown;
  return (grammar ? prism.highlight(code, grammar, "markdown") : escapeHtml(code)) +
    "\n";
});

const onInput = (event) => emit("update:modelValue", event.target.value);

// Подложка подсветки не прокручивается сама — повторяем позицию textarea.
const syncScroll = () => {
  const input = textareaRef.value;
  const highlight = highlightRef.value;
  if (!input || !highlight) return;
  highlight.scrollTop = input.scrollTop;
  highlight.scrollLeft = input.scrollLeft;
};

const onTab = () => insertAtCursor("  ");

// Вставка текста в позицию курсора.
const insertAtCursor = (text) => {
  const el = textareaRef.value;
  if (!el) return;
  const current = props.modelValue || "";
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? start;
  const next = current.slice(0, start) + text + current.slice(end);
  emit("update:modelValue", next);
  nextTick(() => {
    el.focus();
    const position = start + text.length;
    el.setSelectionRange(position, position);
    syncScroll();
  });
};

defineExpose({ insertAtCursor });
</script>

<style scoped>
.markdown-editor {
  position: relative;
  box-sizing: border-box;
  height: 100%;
  min-height: 180px;
  overflow: hidden;
  border: 1px solid var(--otri-border);
  border-radius: 4px;
  background: #fdf6e3;
  font-family: Fira Code, Fira Mono, Consolas, Menlo, Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
}

/* Подложка с подсветкой и текстовое поле поверх должны совпадать
   по всем шрифтовым/отступным настройкам, чтобы текст не разъезжался. */
.markdown-editor__highlight,
.markdown-editor__input {
  margin: 0;
  border: 0;
  padding: 8px;
  box-sizing: border-box;
  font: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  tab-size: 2;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: normal;
  background: transparent;
}

.markdown-editor__highlight {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: #657b83;
  pointer-events: none;
}

.markdown-editor__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  resize: none;
  overflow: auto;
  outline: none;
  /* текст прозрачный — видна только подсвеченная подложка */
  color: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: #657b83;
  /* скрытый скроллбар, чтобы ширина строк совпадала с подложкой */
  scrollbar-width: none;
}

.markdown-editor__input::-webkit-scrollbar {
  display: none;
}

.markdown-editor__input::placeholder {
  color: #93a1a1;
}
</style>
