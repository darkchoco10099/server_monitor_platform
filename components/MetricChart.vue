<template>
  <div class="chart-card glass-card">
    <div class="chart-header">
      <h3 class="chart-title">{{ title }}</h3>
      <span v-if="value != null" class="chart-value metric-value">{{ value }}</span>
    </div>
    <div ref="chartDom" class="chart-body" />
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const props = defineProps<{
  title: string
  value?: string
  option: Record<string, unknown>
}>()

const chartDom = ref<HTMLElement>()
let instance: ReturnType<typeof echarts.init> | null = null

function render() {
  if (!chartDom.value) return
  if (!instance) {
    instance = echarts.init(chartDom.value, 'dark')
  }
  instance.setOption({ ...props.option, backgroundColor: 'transparent' })
}

onMounted(render)
watch(() => props.option, render, { deep: true })

onUnmounted(() => {
  instance?.dispose()
})

// resize
const ro = new ResizeObserver(() => instance?.resize())
onMounted(() => chartDom.value && ro.observe(chartDom.value))
onUnmounted(() => ro.disconnect())
</script>

<style scoped>
.chart-card {
  padding: 16px 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.chart-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-primary);
}

.chart-body {
  width: 100%;
  height: 200px;
}
</style>
