<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title> Otri </q-toolbar-title>

        <q-btn-group flat>
          <q-btn
            flat
            dense
            round
            icon="border_horizontal"
            :color="guidesVisible.h ? 'pink-4' : 'grey-6'"
            aria-label="Toggle horizontal guide"
            @click="toggleGuide('h')"
          >
            <q-tooltip>Горизонтальная направляющая</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            icon="border_vertical"
            :color="guidesVisible.v1 ? 'pink-4' : 'grey-6'"
            aria-label="Toggle vertical guide 1"
            @click="toggleGuide('v1')"
          >
            <q-tooltip>Вертикальная направляющая 1</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            icon="border_vertical"
            :color="guidesVisible.v2 ? 'pink-4' : 'grey-6'"
            aria-label="Toggle vertical guide 2"
            @click="toggleGuide('v2')"
          >
            <q-tooltip>Вертикальная направляющая 2</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            icon="search"
            :color="magnifierVisible ? 'pink-4' : 'grey-6'"
            aria-label="Toggle magnifier"
            @click="toggleMagnifier"
          >
            <q-tooltip>Лупа при перетаскивании точек (клавиша Z)</q-tooltip>
          </q-btn>
        </q-btn-group>

        <small>v{{ version }}</small>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      :mini="false"
      behavior="desktop"
      bordered
    >
      <MeasureResults />
      <InterpretationResults />
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
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
</script>
