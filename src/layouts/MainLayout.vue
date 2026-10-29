<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-btn-group flat>

          <q-btn flat dense round icon="border_horizontal" :color="guidesVisible.h ? 'pink-4' : 'grey-6'"
            aria-label="Toggle horizontal guide" @click="toggleGuide('h')">
            <q-tooltip>Горизонтальная направляющая</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="border_vertical" :color="guidesVisible.v1 ? 'pink-4' : 'grey-6'"
            aria-label="Toggle vertical guide 1" @click="toggleGuide('v1')">
            <q-tooltip>Вертикальная направляющая 1</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="border_vertical" :color="guidesVisible.v2 ? 'pink-4' : 'grey-6'"
            aria-label="Toggle vertical guide 2" @click="toggleGuide('v2')">
            <q-tooltip>Вертикальная направляющая 2</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="search" :color="magnifierVisible ? 'pink-4' : 'grey-6'"
            aria-label="Toggle magnifier" @click="toggleMagnifier">
            <q-tooltip>Лупа при перетаскивании точек (клавиша Z)</q-tooltip>
          </q-btn>

          <!-- <q-btn flat dense round icon="tune" :color="styleChanged ? 'pink-4' : 'grey-6'"
            aria-label="Vector element sizes">
            <q-tooltip>Размер точек и линий</q-tooltip>
            <q-popup-proxy>
              <q-card class="q-pa-md" style="min-width: 240px">
                <div class="text-subtitle2 q-mb-sm">Размер точек и линий</div>
                <q-input dense filled type="number" v-model="pointScale" label="Точки" :min="0.25" :max="4" :step="0.25"
                  @update:model-value="onPointScale" />
                <q-input dense filled type="number" v-model="lineScale" label="Линии" :min="0.25" :max="4" :step="0.25"
                  class="q-mt-sm" @update:model-value="onLineScale" />
              </q-card>
            </q-popup-proxy>
          </q-btn> -->
        </q-btn-group>

        <q-input class="q-mx-lg" bg-color="white" dense filled type="number" v-model="pointScale" label="Точки"
          :min="0.25" :max="4" :step="0.25" @update:model-value="onPointScale" />
        <q-input class="q-mr-md" bg-color="white" dense filled type="number" v-model="lineScale" label="Линии"
          :min="0.25" :max="4" :step="0.25" @update:model-value="onLineScale" />



        <div class="q-ml-auto"> Otri <small>v{{ version }}</small> </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" :mini="false" behavior="desktop" bordered>
      <MeasureResults />
      <InterpretationResults />
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, inject, computed } from "vue";
import MeasureResults from "components/MeasureResults.vue";
import InterpretationResults from "components/InterpretationResults.vue";
import {
  getGuidesVisibility,
  setGuideVisible,
} from "../scripts/guides";
import {
  getMagnifierVisible,
  onMagnifierChange,
  setMagnifierVisible,
} from "../scripts/magnifier";
import {
  getPointScale,
  getLineScale,
  setPointScale,
  setLineScale,
} from "../scripts/geostyle";
import { APP_VERSION } from "../config/version";
const version = APP_VERSION;
// const bus = inject('bus')
// import EssentialLink from 'components/EssentialLink.vue'
const leftDrawerOpen = ref(true);
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

const guidesVisible = ref(getGuidesVisibility());
function toggleGuide(key) {
  guidesVisible.value[key] = !guidesVisible.value[key];
  setGuideVisible(key, guidesVisible.value[key]);
}

const magnifierVisible = ref(getMagnifierVisible());
function toggleMagnifier() {
  setMagnifierVisible(!magnifierVisible.value);
}
// Кнопка следит за состоянием лупы (переключение клавишей Z и т.п.)
onMounted(() => {
  onMagnifierChange((v) => {
    magnifierVisible.value = v;
  });
});

// --- Управление размером точек и линий ---
const bus = inject("bus");
const pointScale = ref(getPointScale());
const lineScale = ref(getLineScale());
const styleChanged = computed(
  () => pointScale.value !== 1 || lineScale.value !== 1,
);

function onPointScale(value) {
  // prev берём из состояния геостиля: v-model уже обновил ref
  const prev = getPointScale();
  setPointScale(value);
  pointScale.value = getPointScale();
  bus.emit("geo-style-changed", { prevPoint: prev, prevLine: lineScale.value });
}

function onLineScale(value) {
  const prev = getLineScale();
  setLineScale(value);
  lineScale.value = getLineScale();
  bus.emit("geo-style-changed", { prevPoint: pointScale.value, prevLine: prev });
}
</script>
