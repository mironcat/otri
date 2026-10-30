<template>
  <q-list v-show="om.lateral_side" dense>
    <q-item-label header>
      <div class="text-subtitle1"> {{ om.side == "left" ? "Левая" : "Правая" }} сторона </div>
    </q-item-label>
    <q-item>
      <strong class="q-mr-sm">Длина:</strong> {{ om.length.toFixed(1) }}
      <strong class="q-mx-sm">Высота:</strong> {{ om.height.toFixed(1) }}
    </q-item>

    <q-item>
      <strong class="q-mr-sm">Альфа:</strong> ad: {{ om.ad.alfa.toFixed() }}, av:
      {{ om.av.alfa.toFixed() }}, pv: {{ om.pv.alfa.toFixed() }}, pd:
      {{ om.pd.alfa.toFixed() }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">HC:</strong> ad: {{ om.ad.hc.toFixed() }}, av:
      {{ om.av.hc.toFixed() }}, pv: {{ om.pv.hc.toFixed() }}, pd:
      {{ om.pd.hc.toFixed() }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">VC:</strong> ad: {{ om.ad.vc.toFixed() }}, av:
      {{ om.av.vc.toFixed() }}, pv: {{ om.pv.vc.toFixed() }}, pd:
      {{ om.pd.vc.toFixed() }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">LN:</strong> ad: {{ om.ad.ln.toFixed() }}, av:
      {{ om.av.ln.toFixed() }}, pv: {{ om.pv.ln.toFixed() }}, pd:
      {{ om.pd.ln.toFixed() }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">sLN:</strong>ad: {{ om.ad.sln.toFixed() }}, av:
      {{ om.av.sln.toFixed() }}, pv: {{ om.pv.sln.toFixed() }}, pd:
      {{ om.pd.sln.toFixed() }}
    </q-item>
  </q-list>
  <q-list v-show="om.concave_vs" dense>
    <q-item>
      <strong class="q-mr-sm">V:</strong> lv: {{ om.v.lv.toFixed() }}, lv1:
      {{ om.v.lvl.toFixed() }}, dv: {{ om.v.dv.toFixed() }}
    </q-item>
  </q-list>
  <q-list v-show="om.dorsal_side" dense>
    <q-item-label header>
      Дорсальная сторона {{ om.half ? "(половина)" : "" }}
    </q-item-label>
    <q-item>
      <strong class="q-mr-sm">Длина (дорсальная):</strong>
      {{ om.length_dorsal.toFixed(1) }}<strong class="q-mx-sm">Ширина:</strong>
      {{ om.width.toFixed(1) }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">Альфа:</strong> ar: {{ om.ar.alfa.toFixed() }},pr:
      {{ om.pr.alfa.toFixed() }},al: {{ om.al.alfa.toFixed() }},pl:
      {{ om.pl.alfa.toFixed() }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">HC:</strong> ar: {{ om.ar.hc.toFixed() }}, pr:
      {{ om.pr.hc.toFixed() }}, al: {{ om.al.hc.toFixed() }}, pl:
      {{ om.pl.hc.toFixed() }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">VC:</strong> ar: {{ om.ar.vc.toFixed() }}, pr:
      {{ om.pr.vc.toFixed() }}, al: {{ om.al.vc.toFixed() }}, pl:
      {{ om.pl.vc.toFixed() }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">LN:</strong> ar: {{ om.ar.ln.toFixed() }}, pr:
      {{ om.pr.ln.toFixed() }}, al: {{ om.al.ln.toFixed() }}, pl:
      {{ om.pl.ln.toFixed() }}
    </q-item>
    <q-item>
      <strong class="q-mr-sm">sLN:</strong>ar: {{ om.ar.sln.toFixed() }}, pr:
      {{ om.pr.sln.toFixed() }}, al: {{ om.al.sln.toFixed() }}, pl:
      {{ om.pl.sln.toFixed() }}
    </q-item>
  </q-list>
</template>
<script setup>
import { inject, ref } from "vue";
const bus = inject("bus");
// import EssentialLink from '@/components/EssentialLink.vue'
const om = ref({
  record_no: 0,
  label: "без метки",
  filename: "",
  length: 0,
  length_dorsal: 0,
  height: 0,
  width: 0,
  lateral_side: true,
  dorsal_side: false,
  concave_vs: false,
  ad: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  pd: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  av: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  pv: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  al: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  pl: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  ar: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  pr: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  v: { lv: 0, lvl: 0, dv: 1 },
  settings: {
    image_lock: false,
    scalebar_ready: false,
  },
});
bus.on("measure-updated", (e) => {
  // do some work
  om.value = e;
});
</script>
