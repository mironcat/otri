<template>
  <div class="description-vars">
    <div class="description-vars__title">Переменные</div>
    <template v-for="group in groups" :key="group.name">
      <div class="description-vars__group">{{ group.name }}</div>
      <template v-for="subgroup in group.subgroups" :key="subgroup.name || '__all'">
        <div v-if="subgroup.name" class="description-vars__subgroup">{{ subgroup.name }}</div>
        <div class="description-vars__chips">
          <q-chip
            v-for="variable in subgroup.variables"
            :key="variable.token"
            dense
            clickable
            outline
            class="description-vars__chip"
            @click="onChipClick(variable)"
          >
            {{ variable.label }}
            <q-tooltip>{{ token(variable) }}</q-tooltip>
          </q-chip>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
defineProps({
  groups: { type: Array, default: () => [] },
});

const emit = defineEmits(["insert", "edit"]);

const token = (variable) => `{${variable.token}}`;

// Вторичные и текстовые переменные открываем в редакторе, остальные —
// вставляем в markdown.
const EDITABLE_GROUPS = new Set(["Числовые вторичные", "Текстовые"]);

const onChipClick = (variable) => {
  if (variable.editable && EDITABLE_GROUPS.has(variable.group)) {
    emit("edit", variable);
    return;
  }
  emit("insert", token(variable));
};
</script>

<style scoped>
.description-vars {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 8px;
  overflow-y: auto;
  background: var(--otri-surface);
}

.description-vars__title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--otri-text-muted);
}

.description-vars__group {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin: 8px 0 4px;
  color: var(--otri-text-subtle);
}

/* Подгруппа (например, дуга AD/AV/PV/PD) внутри «Первичных» */
.description-vars__subgroup {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  margin: 6px 0 3px;
  color: var(--otri-text-muted);
  opacity: 0.85;
}

.description-vars__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.description-vars__chip {
  margin: 0;
  font-size: 11px;
}
</style>
