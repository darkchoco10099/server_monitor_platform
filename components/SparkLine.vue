<template>
  <div class="nano-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none">
      <path
        v-if="data.length > 1"
        :d="pathD"
        class="spark-line"
        :class="[`spark-${color}`]"
      />
      <path
        v-if="area && data.length > 1"
        :d="areaD"
        class="spark-area"
        :class="[`spark-area-${color}`]"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  data: number[]
  color?: 'primary' | 'green' | 'purple' | 'orange' | 'red'
  area?: boolean
  width?: number
  height?: number
}>(), {
  color: 'primary',
  area: true,
  width: 200,
  height: 40,
})

const pathD = computed(() => {
  const pts = normalize(props.data, props.width, props.height)
  if (!pts.length) return ''
  const first = pts[0]
  const rest = pts.slice(1).map(([x, y]) => `L${x},${y}`).join(' ')
  return `M${first[0]},${first[1]} ${rest}`
})

const areaD = computed(() => {
  const pts = normalize(props.data, props.width, props.height)
  if (!pts.length) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  const rest = pts.slice(1).map(([x, y]) => `L${x},${y}`).join(' ')
  return `M${first[0]},${first[1]} ${rest} L${last[0]},${props.height} L${first[0]},${props.height} Z`
})

function normalize(arr: number[], w: number, h: number): [number, number][] {
  if (arr.length < 2) return []
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const range = max - min || 1
  const stepX = w / (arr.length - 1)
  return arr.map((v, i) => [i * stepX, h - ((v - min) / range) * (h * 0.8) - h * 0.1])
}
</script>

<style scoped>
.nano-chart {
  width: 100%;
  height: 100%;
}

.nano-chart svg {
  width: 100%;
  height: 100%;
  display: block;
}

.spark-line {
  fill: none;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.spark-primary { stroke: var(--accent-primary); }
.spark-green { stroke: var(--accent-secondary); }
.spark-purple { stroke: var(--accent-tertiary); }
.spark-orange { stroke: var(--disk-color); }
.spark-red { stroke: var(--status-critical); }

.spark-area {
  opacity: 0.12;
}
.spark-area-primary { fill: var(--accent-primary); }
.spark-area-green { fill: var(--accent-secondary); }
.spark-area-purple { fill: var(--accent-tertiary); }
.spark-area-orange { fill: var(--disk-color); }
.spark-area-red { fill: var(--status-critical); }
</style>
