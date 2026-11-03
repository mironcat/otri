<template>
  <div class="custom-vars">
    <div class="custom-vars__hint">
      Переменные описания хранятся в <code>settings.json</code>. Можно менять
      встроенные вторичные/текстовые переменные и добавлять свои. В выражении
      доступны <code>om</code>, <code>Math</code>, <code>fmt()</code>,
      <code>ratio()</code>, <code>degrees()</code>, <code>getLength()</code>,
      <code>getHeight()</code> и функции интерпретации. Токен подставляется
      в текст как <code>{имя}</code>.
    </div>

    <div v-if="settingsPath" class="custom-vars__path">
      Файл настроек: <code>{{ settingsPath }}</code>
    </div>

    <div class="custom-vars__list-header">
      <span class="custom-vars__list-title">Переменные</span>
      <q-btn size="sm" color="primary" icon="add" no-caps label="Добавить"
        @click="startNew" />
    </div>

    <q-expansion-item v-model="newExpanded" icon="add_circle_outline"
      label="Новая переменная" header-class="custom-vars__expansion"
      class="custom-vars__new">
      <div class="custom-vars__form">
        <q-select v-model="newForm.type" :options="typeOptions" emit-value
          map-options dense outlined label="Тип" class="q-mb-sm" />
        <q-input v-model="newForm.label" dense outlined label="Подпись"
          class="q-mb-sm" />
        <q-input v-model="newForm.token" dense outlined
          label="Имя переменной (латиницей)" hint="Подставляется как {имя}"
          :error="!!newTokenError" :error-message="newTokenError"
          class="q-mb-sm" />
        <q-input v-model="newForm.expression" dense outlined type="textarea"
          autogrow label="Выражение" :error="!!newExpressionError"
          :error-message="newExpressionError"
          hint="Например: ratio(om.length, om.height) или om.length >= 500 ? 'крупные' : 'мелкие'"
          class="q-mb-sm" />
        <q-btn color="primary" no-caps icon="add" label="Добавить"
          :disable="!canAdd" @click="addNew" />
      </div>
    </q-expansion-item>

    <q-list v-if="editableList.length" separator class="custom-vars__list">
      <q-expansion-item v-for="item in editableList" :key="item.token"
        :model-value="expandedToken === item.token"
        @update:model-value="(value) => toggleItem(item, value)"
        header-class="custom-vars__expansion" class="custom-vars__item">
        <template v-slot:header>
          <q-item-section>
            <q-item-label class="custom-vars__label">
              {{ item.label }}
              <span class="custom-vars__token">{{ '{' + item.token + '}' }}</span>
              <q-badge :color="item.type === 'text' ? 'teal' : 'primary'" class="q-ml-sm">
                {{ item.type === "text" ? "текст" : "число" }}
              </q-badge>
              <q-badge v-if="item.builtin" color="grey-6" class="q-ml-xs">
                встроенная
              </q-badge>
              <q-badge v-else color="deep-orange" class="q-ml-xs">
                пользовательская
              </q-badge>
              <q-badge v-if="isModified(item)" color="orange-8" class="q-ml-xs">
                изменена
              </q-badge>
            </q-item-label>
            <q-item-label caption class="custom-vars__expr">
              {{ item.expression }}
            </q-item-label>
          </q-item-section>
        </template>

        <div class="custom-vars__form">
          <q-select :model-value="item.type" :options="typeOptions" emit-value
            map-options dense outlined label="Тип" class="q-mb-sm"
            @update:model-value="(value) => setType(item, value)" />
          <q-input v-model="item.label" dense outlined label="Подпись"
            class="q-mb-sm" />
          <q-input :model-value="item.token" dense outlined
            label="Имя переменной" disable class="q-mb-sm" />
          <q-input v-model="item.expression" dense outlined type="textarea"
            autogrow label="Выражение" :error="!!expressionErrorOf(item)"
            :error-message="expressionErrorOf(item)"
            hint="Например: ratio(om.length, om.height)" class="q-mb-sm" />

          <div class="row items-center q-gutter-sm">
            <q-btn v-if="item.builtin" flat color="warning" no-caps
              icon="restart_alt" label="Сбросить" @click="resetItem(item)" />
            <q-btn v-else flat color="negative" no-caps icon="delete"
              label="Удалить" @click="removeItem(item)" />
          </div>
        </div>
      </q-expansion-item>
    </q-list>

    <div v-else class="custom-vars__empty">
      Пока нет редактируемых переменных.
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import {
  variables,
  settingsPath,
  addVariable,
  updateVariable,
  removeVariable,
  resetVariable,
} from "@/scripts/variablesStore.js";
import {
  DEFAULT_VARIABLES,
  isExpressionValid,
} from "@/scripts/variablesDefaults.js";

const expandedToken = ref(null);
const newExpanded = ref(false);
const newForm = reactive({
  type: "number",
  label: "",
  token: "",
  expression: "",
});

const typeOptions = [
  { label: "Числовая (вторичная)", value: "number" },
  { label: "Текстовая", value: "text" },
];

const defaultByToken = new Map(
  DEFAULT_VARIABLES.map((item) => [item.token, item]),
);

const editableList = computed(() =>
  variables.value.filter((item) => item.editable),
);

const isModified = (item) => {
  const def = defaultByToken.get(item.token);
  if (!def) return false;
  return (
    def.expression !== item.expression ||
    def.label !== item.label ||
    def.type !== item.type
  );
};

const expressionErrorOf = (item) => {
  const expression = String(item.expression || "").trim();
  if (!expression) return "Укажите выражение";
  return isExpressionValid(expression) ? "" : "Ошибка в выражении";
};

const newTokenError = computed(() => {
  const token = newForm.token.trim();
  if (!token) return "";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
    return "Только латинские буквы, цифры и _";
  }
  if (variables.value.some((item) => item.token === token)) {
    return "Такое имя уже используется";
  }
  return "";
});

const newExpressionError = computed(() => {
  const expression = newForm.expression.trim();
  if (!expression) return "Укажите выражение";
  return isExpressionValid(expression) ? "" : "Ошибка в выражении";
});

const canAdd = computed(
  () =>
    newForm.label.trim() &&
    newForm.token.trim() &&
    newForm.expression.trim() &&
    !newTokenError.value &&
    !newExpressionError.value,
);

const toggleItem = (item, value) => {
  expandedToken.value = value ? item.token : null;
  if (value) newExpanded.value = false;
};

const startNew = () => {
  expandedToken.value = null;
  newExpanded.value = true;
  newForm.type = "number";
  newForm.label = "";
  newForm.token = "";
  newForm.expression = "";
};

const addNew = () => {
  if (!canAdd.value) return;
  const token = newForm.token.trim();
  addVariable({
    token,
    label: newForm.label.trim(),
    type: newForm.type,
    expression: newForm.expression.trim(),
  });
  newExpanded.value = false;
  expandedToken.value = token;
};

const setType = (item, type) => {
  updateVariable(item.token, { type });
};

const resetItem = (item) => resetVariable(item.token);

const removeItem = (item) => {
  removeVariable(item.token);
  if (expandedToken.value === item.token) expandedToken.value = null;
};

// Открыть переменную по токену (из панели chip'ов).
const selectByToken = (token) => {
  if (editableList.value.some((item) => item.token === token)) {
    newExpanded.value = false;
    expandedToken.value = token;
  }
};

defineExpose({ selectByToken });
</script>

<style scoped>
.custom-vars {
  height: 100%;
  overflow-y: auto;
  padding: 8px;
}

.custom-vars__hint {
  font-size: 12px;
  line-height: 1.4;
  color: var(--otri-text-muted);
  border: 1px solid var(--otri-border-soft);
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 8px;
}

.custom-vars__hint code {
  font-size: 11px;
}

.custom-vars__path {
  font-size: 11px;
  color: var(--otri-text-subtle);
  margin-bottom: 8px;
  word-break: break-all;
}

.custom-vars__path code {
  font-size: 11px;
}

.custom-vars__list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.custom-vars__list-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--otri-text-muted);
}

.custom-vars__expansion {
  min-height: 0;
  padding: 4px 8px;
}

.custom-vars__label {
  font-size: 13px;
}

.custom-vars__token {
  margin-left: 6px;
  font-family: Fira Code, Fira Mono, Consolas, monospace;
  font-size: 11px;
  color: var(--otri-text-muted);
}

.custom-vars__expr {
  font-family: Fira Code, Fira Mono, Consolas, monospace;
  font-size: 11px;
  word-break: break-word;
}

.custom-vars__empty {
  font-size: 12px;
  color: var(--otri-text-subtle);
  padding: 8px 0;
}

.custom-vars__form {
  padding: 8px 4px 4px;
}

.custom-vars__new {
  margin-bottom: 8px;
}
</style>
