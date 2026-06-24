<template>
  <div class="gauge-ring" :class="[`gauge-${severity}`]">
    <svg viewBox="0 0 100 100" class="gauge-svg">
      <circle cx="50" cy="50" :r="radius" class="gauge-bg" />
      <circle
        cx="50" cy="50" :r="radius"
        class="gauge-fill"
        :style="{ strokeDashoffset: dashOffset }"
        :stroke-dasharray="circumference"
      />
    </svg>
    <div class="gauge-center">
      <span class="gauge-value metric-value">{{ displayValue }}</span>
      <span v-if="sub" class="gauge-sub">{{ sub }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  max?: number
  sub?: string
  precision?: number
}>(), { max: 100, precision: 1 })

const radius = 42
const circumference = 2 * Math.PI * radius

const displayValue = computed(() =>
  props.max === 100
    ? `${props.value.toFixed(props.precision)}%`
    : `${props.value.toFixed(props.precision)}`
)

const dashOffset = computed(() =>
  circumference - (Math.min(props.value, props.max) / props.max) * circumference
)

const severity = computed(() => {
  const pct = props.value / props.max
  if (pct >= 0.9) return 'critical'
  if (pct >= 0.75) return 'warning'
  return 'ok'
})
</script>

<style scoped>
.gauge-ring {
  position: relative;
  width: 100px;
  height: 100px;
}

.gauge-svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.gauge-bg {
  fill: none;
  stroke: var(--bg-overlay);
  stroke-width: 8;
}

.gauge-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s ease;
}

.gauge-ok .gauge-fill { stroke: var(--accent-secondary); }
.gauge-warning .gauge-fill { stroke: var(--status-warn); }
.gauge-critical .gauge-fill { stroke: var(--status-critical); }

.gauge-ok .gauge-value { color: var(--accent-secondary); }
.gauge-warning .gauge-value { color: var(--status-warn); }
.gauge-critical .gauge-value { color: var(--status-critical); }

.gauge-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gauge-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.gauge-sub {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
