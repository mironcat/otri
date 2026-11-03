<template>
  <div class="custom-vars">
    <div class="custom-vars__hint">
      Пользовательские переменные на основе первичных данных. В выражении
      доступны <code>om</code>, <code>Math</code>, <code>fmt()</code>,
      <code>ratio()</code>, <code>degrees()</code> и функции интерпретации
      (<code>getShellLengthType</code> и др.). Токен подставляется в текст
      как <code>{имя}</code>.
    </div>

    <q-list v-if="customVariables.length" separator class="custom-vars__list">
      <q-item v-for="variable in customVariables" :key="variable.id">
        <q-item-section>
          <q-item-label class="custom-vars__label">
            {{ variable.label }}
            <span class="custom-vars__token">{{ '{' + variable.token + '}' }}</span>
            <q-badge :color="variable.type === 'text' ? 'teal' : 'primary'" class="q-ml-sm">
              {{ variable.type === "text" ? "текст" : "число" }}
            </q-badge>
          </q-item-label>
          <q-item-label caption class="custom-vars__expr">
            {{ variable.expression }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row no-wrap">
            <q-btn flat dense round icon="edit" aria-label="Редактировать" @click="startEdit(variable)">
              <q-tooltip>Редактировать</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete" color="negative" aria-label="Удалить" @click="remove(variable)">
              <q-tooltip>Удалить</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else class="custom-vars__empty">
      Пока нет пользовательских переменных.
    </div>

    <q-btn class="custom-vars__add" color="primary" icon="add" no-caps
      label="Добавить переменную" @click="startAdd" />

    <q-dialog v-model="dialogOpen">
      <q-card class="custom-vars__dialog">
        <q-card-section class="text-subtitle1">
          {{ editingId ? "Редактирование переменной" : "Новая переменная" }}
        </q-card-section>

        <q-card-section class="q-gutter-sm">
          <q-select v-model="form.type" :options="typeOptions" emit-value
            map-options dense outlined label="Тип" />
          <q-input v-model="form.label" dense outlined
            label="Подпись (в панели переменных)" />
          <q-input v-model="form.token" dense outlined
            label="Имя переменной (латиницей)" hint="Подставляется как {имя}"
            :error="!!tokenError" :error-message="tokenError" />
          <q-input v-model="form.expression" dense outlined type="textarea"
            autogrow label="Выражение" :error="!!expressionError"
            :error-message="expressionError"
            hint="Например: ratio(om.length, om.height) или om.length >= 500 ? 'крупные' : 'мелкие'" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn color="primary" label="Сохранить" :disable="!canSave" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useQuasar } from "quasar";
import {
  customVariables,
  addCustomVariable,
  updateCustomVariable,
  removeCustomVariable,
} from "@/scripts/customVariables.js";
import { DESCRIPTION_VARIABLES } from "@/scripts/descriptionMarkdown.js";

const $q = useQuasar();

const dialogOpen = ref(false);
const editingId = ref(null);
const form = reactive({
  type: "number",
  label: "",
  token: "",
  expression: "",
});

const typeOptions = [
  { label: "Числовая (вторичная)", value: "number" },
  { label: "Текстовая", value: "text" },
];

const builtinTokens = new Set(DESCRIPTION_VARIABLES.map((v) => v.token));

const compile = (expression) => {
  try {
    new Function(
      "om",
      "Math",
      "fmt",
      "ratio",
      "degrees",
      "getShellLengthType",
      "getPlenateType",
      "getDegreeOfElongation",
      "getSLNTypeofCurve",
      "getAlfaTypeofCurve",
      "getOrientationTypeofCurve",
      `"use strict"; return (${expression});`,
    );
    return true;
  } catch {
    return false;
  }
};

const tokenError = computed(() => {
  const token = form.token.trim();
  if (!token) return "";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
    return "Только латинские буквы, цифры и _";
  }
  if (builtinTokens.has(token)) {
    return "Совпадает со встроенной переменной";
  }
  const duplicate = customVariables.value.some(
    (variable) => variable.token === token && variable.id !== editingId.value,
  );
  return duplicate ? "Такое имя уже используется" : "";
});

const expressionError = computed(() => {
  const expression = form.expression.trim();
  if (!expression) return "Укажите выражение";
  return compile(expression) ? "" : "Ошибка в выражении";
});

const canSave = computed(
  () =>
    form.label.trim() &&
    form.token.trim() &&
    form.expression.trim() &&
    !tokenError.value &&
    !expressionError.value,
);

const resetForm = () => {
  form.type = "number";
  form.label = "";
  form.token = "";
  form.expression = "";
};

const startAdd = () => {
  editingId.value = null;
  resetForm();
  dialogOpen.value = true;
};

const startEdit = (variable) => {
  editingId.value = variable.id;
  form.type = variable.type;
  form.label = variable.label;
  form.token = variable.token;
  form.expression = variable.expression;
  dialogOpen.value = true;
};

const save = () => {
  if (!canSave.value) return;
  const payload = {
    label: form.label.trim(),
    token: form.token.trim(),
    type: form.type,
    expression: form.expression.trim(),
  };
  if (editingId.value) {
    updateCustomVariable(editingId.value, payload);
  } else {
    addCustomVariable(payload);
  }
  dialogOpen.value = false;
};

const remove = (variable) => {
  $q.dialog({
    title: "Удаление переменной",
    message: `Удалить «${variable.label}»?`,
    cancel: { label: "Отмена", flat: true },
    ok: { label: "Удалить", color: "negative", unelevated: true },
    persistent: true,
  }).onOk(() => removeCustomVariable(variable.id));
};
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

.custom-vars__add {
  margin-top: 8px;
}

.custom-vars__dialog {
  min-width: 360px;
  max-width: 520px;
}
</style>
