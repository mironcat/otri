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

        <small>v0.2</small>
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
import { ref } from "vue";
import MeasureResults from "components/MeasureResults.vue";
import InterpretationResults from "components/InterpretationResults.vue";
// const bus = inject('bus')
// import EssentialLink from 'components/EssentialLink.vue'
const leftDrawerOpen = ref(true);
function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
