<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div v-if="om" class="description-content">
    <p v-if="om.record_no !== undefined && om.record_no !== null" class="description-record">
      <strong>Запись № {{ om.record_no }}</strong> —
      {{ om.label || "без метки" }}
      <span v-if="om.filename">({{ om.filename }})</span>
    </p>

    <h4>Общее описание</h4>
    <p v-if="om.lateral_side">Сторона: <strong>{{ side }}</strong>.</p>
    <div>
      Раковина в латеральной проекции ?????, {{ shellLengthType || "—" }} (L = {{ fmt(om.length) + 'μ' }}), умеренно
      удлиненная (L/H={{
        ratio(om.length, om.height) }}), {{ plenateType || "—" }} (AD-l/PD-l = {{ ratio(om.ad?.hc, om.pd?.hc) }}).
      Максимальная выпуклость в поперечном срезе располагается в средней части раковины. Замочный
      край слабовыпуклый, сильно наклонен к переднему концу.
    </div>

    <p v-if="om.dorsal_side">
      Дорсальная проекция: по длине раковины —
      <strong>{{ shellLengthType || "—" }}</strong> (L = {{ fmt(om.length_dorsal) }}),
      по степени удлинённости — <strong>{{ elongation || "—" }}</strong>
      (L/W = {{ ratio(om.length_dorsal, om.width) }}),
      полнота — <strong>{{ fullness }}</strong>.
    </p>

    <!-- <template v-if="om.lateral_side">
      <h4>Латеральная сторона</h4>
      <p v-for="arc in lateralArcs" :key="arc.key">
        {{ arc.name }}
        <strong>{{ arc.orientation || "—" }}</strong>
        ({{ arc.short }}-h/{{ arc.short }}-l = {{ ratio(arc.vc, arc.hc) }}),
        <strong>{{ arc.steepness || "—" }}</strong>
        ({{ arc.short }}-s/{{ arc.short }}-n = {{ ratio(arc.sln, arc.ln) }}),
        <strong>{{ arc.position || "—" }}</strong>
        ({{ arc.short }}-α = {{ degrees(arc.alfa) }}).
      </p>

      <h4>Брюшной край</h4>
      <p>
        V: lv = {{ fmt(om.v?.lv) }}, lvl = {{ fmt(om.v?.lvl) }},
        dv = {{ fmt(om.v?.dv) }}.
      </p>
    </template>

<template v-if="om.dorsal_side">
      <h4>Дорсальная сторона</h4>
      <p v-for="arc in dorsalArcs" :key="arc.key">
        {{ arc.name }}
        <strong>{{ arc.orientation || "—" }}</strong>
        ({{ arc.short }}-h/{{ arc.short }}-l = {{ ratio(arc.vc, arc.hc) }}),
        <strong>{{ arc.steepness || "—" }}</strong>
        ({{ arc.short }}-s/{{ arc.short }}-n = {{ ratio(arc.sln, arc.ln) }}),
        <strong>{{ arc.position || "—" }}</strong>
        ({{ arc.short }}-α = {{ degrees(arc.alfa) }}).
      </p>
    </template> -->
  </div>
  <div v-else class="description-empty">
    Нет данных для описания. Добавьте запись в таблицу или выберите её.
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  getShellLengthType,
  getPlenateType,
  getDegreeOfElongation,
  getSLNTypeofCurve,
  getAlfaTypeofCurve,
  getOrientationTypeofCurve,
} from "@/scripts/interpretation.js";

const props = defineProps({
  om: { type: Object, default: null },
});

const LATERAL_ARCS = [
  { key: "ad", short: "AD", name: "Передне-спинная дуга (AD)" },
  { key: "pd", short: "PD", name: "Задне-спинная дуга (PD)" },
  { key: "av", short: "AV", name: "Передне-брюшная дуга (AV)" },
  { key: "pv", short: "PV", name: "Задне-брюшная дуга (PV)" },
];

const DORSAL_ARCS = [
  { key: "ar", short: "AR", name: "Передне-правая дуга (AR)" },
  { key: "pr", short: "PR", name: "Задне-правая дуга (PR)" },
  { key: "al", short: "AL", name: "Передне-левая дуга (AL)" },
  { key: "pl", short: "PL", name: "Задне-левая дуга (PL)" },
];

const buildArcs = (source, definitions) =>
  definitions.map(({ key, short, name }) => {
    const arc = source[key] || {};
    return {
      key,
      short,
      name,
      orientation:
        arc.hc || arc.vc ? getOrientationTypeofCurve(arc) : "",
      steepness: getSLNTypeofCurve(arc.ln ? arc.sln / arc.ln : NaN),
      position: getAlfaTypeofCurve(arc.alfa),
      hc: arc.hc,
      vc: arc.vc,
      sln: arc.sln,
      ln: arc.ln,
      alfa: arc.alfa,
    };
  });

const lateralArcs = computed(() => {
  if (!props.om?.lateral_side) return [];
  return buildArcs(props.om, LATERAL_ARCS);
});

const dorsalArcs = computed(() => {
  if (!props.om?.dorsal_side) return [];
  return buildArcs(props.om, DORSAL_ARCS);
});

const length = computed(() => {
  const om = props.om;
  if (!om) return 0;
  return om.length > 0 ? om.length : om.length_dorsal;
});

const height = computed(() => {
  const om = props.om;
  if (!om) return 0;
  return om.height > 0 ? om.height : om.width;
});

const shellLengthType = computed(() => getShellLengthType(length.value));

const elongation = computed(() =>
  getDegreeOfElongation(length.value, height.value),
);

const plenateType = computed(() =>
  getPlenateType(props.om?.ad?.hc / props.om?.pd?.hc),
);

const side = computed(() => (props.om?.side === "right" ? "правая" : "левая"));

const fullness = computed(() =>
  props.om?.fullness === "half" ? "половина" : "полная",
);

const fmt = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed() : "—";
};

const ratio = (a, b) => {
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && y !== 0
    ? (x / y).toFixed(2)
    : "—";
};

const degrees = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}°` : "—";
};
</script>

<style scoped>
.description-content {
  font-size: 13px;
  line-height: 1.5;
}

.description-content h4 {
  margin: 10px 0 4px;
  font-size: 13px;
  font-weight: 600;
}

.description-content h4:first-of-type {
  margin-top: 0;
}

.description-content p {
  margin: 0 0 6px;
}

.description-record {
  color: #555;
  margin-bottom: 8px;
}

.description-empty {
  color: #777;
  font-size: 13px;
}
</style>
