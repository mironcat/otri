<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Меню" @click="toggleLeftDrawer" />
        <q-btn flat dense round icon="save" aria-label="Сохранить проект"
          @click="bus.emit('save-project')">
          <q-tooltip>Сохранить проект (.otr)</q-tooltip>
        </q-btn>
        <q-btn flat dense round icon="folder_open" aria-label="Открыть проект"
          @click="bus.emit('open-project')">
          <q-tooltip>Открыть проект (.otr)</q-tooltip>
        </q-btn>
        <q-btn-group flat>

          <q-btn flat dense round icon="border_horizontal" :color="guidesVisible.h ? 'pink-4' : 'grey-6'"
            aria-label="Показать или скрыть горизонтальную направляющую" @click="toggleGuide('h')">
            <q-tooltip>Горизонтальная направляющая</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="border_vertical" :color="guidesVisible.v1 ? 'pink-4' : 'grey-6'"
            aria-label="Показать или скрыть вертикальную направляющую 1" @click="toggleGuide('v1')">
            <q-tooltip>Вертикальная направляющая 1</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="border_vertical" :color="guidesVisible.v2 ? 'pink-4' : 'grey-6'"
            aria-label="Показать или скрыть вертикальную направляющую 2" @click="toggleGuide('v2')">
            <q-tooltip>Вертикальная направляющая 2</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="search" :color="magnifierVisible ? 'pink-4' : 'grey-6'"
            aria-label="Лупа" @click="toggleMagnifier">
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

        <q-input class="q-mx-lg" :bg-color="inputBgColor" dense filled type="number" v-model="pointScale" label="Точки"
          :min="0.25" :max="4" :step="0.25" @update:model-value="onPointScale" />
        <q-input class="q-mr-md" :bg-color="inputBgColor" dense filled type="number" v-model="lineScale" label="Линии"
          :min="0.25" :max="4" :step="0.25" @update:model-value="onLineScale" />

        <q-space />

        <q-btn flat dense round :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          :aria-label="$q.dark.isActive ? 'Включить светлую тему' : 'Включить тёмную тему'"
          :aria-pressed="$q.dark.isActive" @click="onToggleTheme">
          <q-tooltip>{{ $q.dark.isActive ? "Светлая тема" : "Тёмная тема" }}</q-tooltip>
        </q-btn>

        <div class="q-ml-sm"> Otri <small>v{{ version }}</small> </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" :mini="false" :width="drawerWidth" behavior="desktop" bordered>
      <div class="drawer-inner">
        <div class="sidebar-tabs">
          <q-tabs v-model="sidebarTab" dense no-caps align="left" active-color="primary"
            indicator-color="primary" switch-indicator>
            <q-tab name="info" label="Измерения" />
            <q-tab name="graphs" label="Графики" :disable="graphSelectedRecordNos.length === 0" />
          </q-tabs>
          <q-tab-panels v-model="sidebarTab" animated class="sidebar-panels">
            <q-tab-panel name="info" class="q-pa-none sidebar-panel">
              <MeasureResults />
              <InterpretationResults />
            </q-tab-panel>
            <q-tab-panel name="graphs" class="q-pa-none sidebar-panel sidebar-graph-panel">
              <ResultsGraphs :rows="graphRows" :selected-record-nos="graphSelectedRecordNos"
                :focused-record-no="graphFocusedRecordNo" :settings="graphSettings" fill
                @focus-record="onGraphFocus" @update:settings="onGraphSettingsUpdate" />
            </q-tab-panel>
          </q-tab-panels>
        </div>
        <div class="drawer-resize-handle" title="Изменить ширину панели"
          @pointerdown="startDrawerResize" @dblclick="resetDrawerWidth"></div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject, watch, defineAsyncComponent } from "vue";
import { useQuasar } from "quasar";
import MeasureResults from "@/components/MeasureResults.vue";
import InterpretationResults from "@/components/InterpretationResults.vue";
const ResultsGraphs = defineAsyncComponent(
  () => import("@/components/results/ResultsGraphs.vue"),
);
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
import { toggleTheme } from "../scripts/theme";
import { normalizeGraphSettings } from "../scripts/resultsGraphSettings";
const version = APP_VERSION;
const $q = useQuasar();
// В тёмной теме поля в шапке не должны оставаться белыми
const inputBgColor = computed(() => ($q.dark.isActive ? "grey-9" : "white"));
function onToggleTheme() {
  toggleTheme($q);
}
// const bus = inject('bus')
// import EssentialLink from '@/components/EssentialLink.vue'
const leftDrawerOpen = ref(true);
const sidebarTab = ref("info");
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// --- Ширина левой панели: изменение мышью -------------------------------
const DRAWER_DEFAULT_WIDTH = 300;
const DRAWER_MIN_WIDTH = 220;
const DRAWER_MAX_WIDTH = 600;
const DRAWER_WIDTH_KEY = "otri.leftDrawerWidth";

const clampDrawerWidth = (value) => {
  const max = Math.max(
    DRAWER_MIN_WIDTH,
    Math.min(DRAWER_MAX_WIDTH, window.innerWidth * 0.5),
  );
  const number = Number(value);
  return Math.min(
    max,
    Math.max(DRAWER_MIN_WIDTH, Number.isFinite(number) ? number : DRAWER_DEFAULT_WIDTH),
  );
};

const readDrawerWidth = () => {
  try {
    const saved = Number(localStorage.getItem(DRAWER_WIDTH_KEY));
    return Number.isFinite(saved) && saved > 0
      ? clampDrawerWidth(saved)
      : DRAWER_DEFAULT_WIDTH;
  } catch {
    return DRAWER_DEFAULT_WIDTH;
  }
};

const drawerWidth = ref(readDrawerWidth());

const persistDrawerWidth = () => {
  try {
    localStorage.setItem(DRAWER_WIDTH_KEY, String(drawerWidth.value));
  } catch {
    // localStorage может быть недоступен — ширина просто не сохранится
  }
};

let drawerResizeState = null;

const onDrawerResize = (event) => {
  if (!drawerResizeState) return;
  drawerWidth.value = clampDrawerWidth(
    drawerResizeState.width + event.clientX - drawerResizeState.x,
  );
};

const stopDrawerResize = () => {
  if (!drawerResizeState) return;
  drawerResizeState = null;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  window.removeEventListener("pointermove", onDrawerResize);
  window.removeEventListener("pointerup", stopDrawerResize);
  window.removeEventListener("pointercancel", stopDrawerResize);
  persistDrawerWidth();
  broadcastSidebarWidth();
};

const startDrawerResize = (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  drawerResizeState = { x: event.clientX, width: drawerWidth.value };
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("pointermove", onDrawerResize);
  window.addEventListener("pointerup", stopDrawerResize);
  window.addEventListener("pointercancel", stopDrawerResize);
};

const resetDrawerWidth = () => {
  drawerWidth.value = DRAWER_DEFAULT_WIDTH;
  persistDrawerWidth();
  broadcastSidebarWidth();
};

onBeforeUnmount(stopDrawerResize);

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
  broadcastSidebarWidth();
});

// --- Управление размером точек и линий ---
const bus = inject("bus");

// --- Данные для вкладки графиков в sidebar ---------------------------------
const graphRows = ref({ lateral: [], dorsal: [] });
const graphSelectedRecordNos = ref([]);
const graphFocusedRecordNo = ref(null);
const graphSettings = ref(normalizeGraphSettings());

const onGraphFocus = (recordNo) => {
  graphFocusedRecordNo.value = recordNo;
  bus.emit("graphs-focus-record", recordNo);
};

const onGraphSettingsUpdate = (settings) => {
  graphSettings.value = normalizeGraphSettings(settings);
  bus.emit("graph-settings-changed", graphSettings.value);
};

const onGraphsState = (state) => {
  if (!state) return;
  graphRows.value = state.rows || { lateral: [], dorsal: [] };
  graphSelectedRecordNos.value = state.selectedRecordNos || [];
  graphFocusedRecordNo.value = state.focusedRecordNo ?? null;
  if (state.graphSettings) {
    graphSettings.value = normalizeGraphSettings(state.graphSettings);
  }
};

bus.on("graphs-state", onGraphsState);

const applySidebarWidth = (width) => {
  drawerWidth.value = clampDrawerWidth(width);
  persistDrawerWidth();
};
bus.on("sidebar-width-set", applySidebarWidth);

const broadcastSidebarWidth = () => {
  bus.emit("sidebar-width-changed", drawerWidth.value);
};

watch(
  () => graphSelectedRecordNos.value.length,
  (count, previous) => {
    if (count === 0) {
      if (sidebarTab.value === "graphs") sidebarTab.value = "info";
      return;
    }
    if (count > 1 && previous <= 1) {
      leftDrawerOpen.value = true;
      sidebarTab.value = "graphs";
    }
  },
);

onBeforeUnmount(() => {
  bus.off("graphs-state", onGraphsState);
  bus.off("sidebar-width-set", applySidebarWidth);
});

// Команды из меню Electron «Файл» пробрасываем в шину приложения,
// чтобы их обработал IndexPage теми же функциями, что и кнопки шапки.
const disposeProjectMenu = window.otriProject?.onProjectAction?.((action) => {
  if (action === "save") bus.emit("save-project");
  else if (action === "open") bus.emit("open-project");
});

onBeforeUnmount(() => {
  if (typeof disposeProjectMenu === "function") disposeProjectMenu();
});

const pointScale = ref(getPointScale());
const lineScale = ref(getLineScale());

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

<style scoped>
.drawer-inner {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-tabs {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-panels {
  flex: 1 1 auto;
  min-height: 0;
}

.sidebar-panels :deep(.q-tab-panel) {
  height: 100%;
  padding: 0;
  overflow-y: auto;
}

.sidebar-graph-panel {
  overflow: hidden;
}

.sidebar-graph-panel :deep(.graphs-card) {
  height: 100%;
}

.drawer-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: 6px;
  cursor: col-resize;
  touch-action: none;
}

.drawer-resize-handle::after {
  content: "";
  position: absolute;
  top: 0;
  right: 2px;
  bottom: 0;
  width: 2px;
  background: transparent;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.drawer-resize-handle:hover::after,
.drawer-resize-handle:active::after {
  background: var(--q-primary);
  opacity: 0.45;
}
</style>
