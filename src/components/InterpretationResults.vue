<template>
  <q-list dense>
    <q-item>
      По длине раковины {{ lateraShellLength }}.
    </q-item>
    <q-item>
      По степени удлиненности {{ degreeOfElongation }}.
    </q-item>
  </q-list>
  <q-list v-show="om.lateral_side" dense>
    <q-item>
      <strong>Передне-спинная дуга (ad) </strong>
    </q-item>
    <q-item>
      {{ curveOrientationType.ad }}, <br>{{ curveSLNtype.ad }}, {{ curveAlfaType.ad }}
    </q-item>
    <q-item>
      <strong>Задне-спинная дуга (pd) </strong>
    </q-item>
    <q-item>
      {{ curveOrientationType.pd }}, <br>{{ curveSLNtype.pd }}, {{ curveAlfaType.pd }}
    </q-item>
    <q-item>
      <strong>Передне-брюшная дуга (av) </strong>
    </q-item>
    <q-item>
      {{ curveOrientationType.av }}, <br>{{ curveSLNtype.av }}, {{ curveAlfaType.av }}
    </q-item>
    <q-item>
      <strong>Задне-брюшная дуга (pv) </strong>
    </q-item>
    <q-item>
      {{ curveOrientationType.pv }}, <br>{{ curveSLNtype.pv }}, {{ curveAlfaType.pv }}
    </q-item>
  </q-list>
  <q-list v-show="om.lateral_side & om.concave_vs" dense>
    <q-item-label header>
      Брюшной край
    </q-item-label>

  </q-list>
</template>
<script setup>
import { inject, ref, computed } from 'vue'
const bus = inject('bus')
// import EssentialLink from 'components/EssentialLink.vue'
const om = ref({
  record_no: 0,
  filename: '',
  length: 0,
  height: 0,
  ad: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  pd: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  av: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 },
  pv: { alfa: 0, hc: 0, vc: 0, ln: 1, sln: 1 }
})
const lateraShellLength = computed(() => {
  const l = om.value.length
  // console.log(l)
  let lSL = ''
  if (l < 500) {
    lSL = "мелкие"
  } else if (l > 500 & l < 900) {
    lSL = "средние"
  } else {
    lSL = "крупные"
  }
  return lSL
})
const degreeOfElongation = computed(() => {
  const LH = om.value.length / om.value.height
  // console.log(l)
  let dOfE = ''
  if (LH < 1.7) {
    dOfE = "укороченные"
  } else if (LH > 1.7 & LH < 2.1) {
    dOfE = "умеренно удлиненные"
  } else if (LH > 2.1) {
    dOfE = "удлиненные"
  }
  return dOfE
})
function getSLNTypeofCurve(sln_rate) {
  if (sln_rate < 0.35) {
    return "крутая"
  } else if (sln_rate > 0.35 & sln_rate < 0.7) {
    return "умеренная"
  } else if (sln_rate > 0.7) {
    return "пологая"
  }
}
function getAlfaTypeofCurve(alfa) {
  if (alfa < 30) {
    return "проксимальная"
  } else if (alfa > 30 & alfa < 60) {
    return "медиальная"
  } else if (alfa > 60) {
    return "дистальная"
  }
}
function getOrientationTypeofCurve({ hc, vc }) {
  if (hc > vc) {
    return "горизонтальная"
  } else if (Math.abs(hc - vc) < 20) {
    return "нормальная"
  } else if (hc < vc) {
    return "вертикальная"
  }
}
const curveSLNtype = computed(() => {
  return {
    ad: getSLNTypeofCurve(om.value.ad.sln / om.value.ad.ln),
    pd: getSLNTypeofCurve(om.value.pd.sln / om.value.pd.ln),
    av: getSLNTypeofCurve(om.value.av.sln / om.value.av.ln),
    pv: getSLNTypeofCurve(om.value.pv.sln / om.value.pv.ln)
  }
})
const curveAlfaType = computed(() => {
  return {
    ad: getAlfaTypeofCurve(om.value.ad.alfa),
    pd: getAlfaTypeofCurve(om.value.pd.alfa),
    av: getAlfaTypeofCurve(om.value.av.alfa),
    pv: getAlfaTypeofCurve(om.value.pv.alfa)
  }
})
const curveOrientationType = computed(() => {
  return {
    ad: getOrientationTypeofCurve({ hc: om.value.ad.hc, vc: om.value.ad.vc }),
    pd: getOrientationTypeofCurve({ hc: om.value.pd.hc, vc: om.value.pd.vc }),
    av: getOrientationTypeofCurve({ hc: om.value.av.hc, vc: om.value.av.vc }),
    pv: getOrientationTypeofCurve({ hc: om.value.pv.hc, vc: om.value.pv.vc })
  }
})
bus.on('measure-updated', (e) => {
  // do some work
  om.value = e
})

</script>
