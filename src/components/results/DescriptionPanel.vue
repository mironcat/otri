<template>
  <div v-show="visible" class="description-half col q-pl-md">
    <div class="row items-center q-mb-xs">
      <div class="text-subtitle2">Описание</div>
      <q-space />
      <q-select :model-value="selectedRecordNo" :options="options" option-value="record_no"
        option-label="recordLabel" emit-value map-options dense outlined options-dense label="Запись"
        :disable="options.length === 0" class="record-select"
        @update:model-value="emit('update:selected-record-no', $event)" />
    </div>
    <div class="description-body">
      <Description :om="measurements" />
    </div>
  </div>
</template>

<script setup>
import Description from "@/components/Description.vue";

defineProps({
  visible: { type: Boolean, default: true },
  options: { type: Array, default: () => [] },
  selectedRecordNo: { type: Number, default: null },
  measurements: { type: Object, default: null },
});

const emit = defineEmits(["update:selected-record-no"]);
</script>
