<script setup>
import { computed } from 'vue'
import { ExternalLink, Trash2, RefreshCw, BarChart3 } from 'lucide-vue-next'
import HeatBadge from './HeatBadge.vue'
import TrendChart from './TrendChart.vue'
import { usePagesStore } from '../stores/pages'
import { getHeatColor } from '../composables/useHeatScore'

const props = defineProps({
  page: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['refresh', 'remove', 'select'])

const store = usePagesStore()

const heatColor = computed(() => getHeatColor(props.page.currentHeat || 0))

const trend = computed(() => {
  const timeline = props.page.heatTimeline || []
  if (timeline.length < 2) return 'stable'
  
  const recent = timeline.slice(-4)
  const earlier = timeline.slice(-8, -4)
  
  if (recent.length === 0 || earlier.length === 0) return 'stable'
  
  const recentAvg = recent.reduce((a, b) => a + b.heat, 0) / recent.length
  const earlierAvg = earlier.reduce((a, b) => a + b.heat, 0) / earlier.length
  
  const diff = recentAvg - earlierAvg
  if (diff > 0.05) return 'up'
  if (diff < -0.05) return 'down'
  return 'stable'
})

const stats = computed(() => {
  const signals = props.page.signals || {}
  return [
    { label: 'Edits (7d)', value: signals.editCount7d || 0 },
    { label: 'Editors', value: signals.uniqueEditors30d || 0 },
    { label: 'Reverts', value: `${((signals.revertRatio30d || 0) * 100).toFixed(0)}%` },
  ]
})

function openWikipedia() {
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(props.page.title.replace(/ /g, '_'))}`
  window.open(url, '_blank')
}
</script>

<template>
  <div 
    class="group relative bg-base-200/50 rounded-2xl border border-base-content/5 hover:border-base-content/10 transition-all cursor-pointer overflow-hidden"
    @click="emit('select', page.id)"
  >
    <!-- Heat glow effect -->
    <div 
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
      :style="{
        background: `radial-gradient(circle at 50% 0%, ${heatColor}22 0%, transparent 70%)`,
      }"
    ></div>
    
    <div class="relative p-5">
      <!-- Header -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-lg truncate">{{ page.title }}</h3>
          <div class="flex items-center gap-2 mt-1">
            <HeatBadge :score="page.currentHeat || 0" size="sm" :trend="trend" />
          </div>
        </div>
        
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            class="btn btn-ghost btn-sm btn-square"
            @click.stop="openWikipedia"
            title="Open on Wikipedia"
          >
            <ExternalLink class="w-4 h-4" />
          </button>
          <button 
            class="btn btn-ghost btn-sm btn-square text-error"
            @click.stop="emit('remove', page.id)"
            title="Remove"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <!-- Mini Chart -->
      <div v-if="page.heatTimeline?.length" class="mb-4">
        <TrendChart 
          :data="page.heatTimeline" 
          :height="50"
          :color="heatColor"
        />
      </div>
      
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-2">
        <div 
          v-for="stat in stats" 
          :key="stat.label"
          class="text-center p-2 rounded-lg bg-base-300/50"
        >
          <div class="text-lg font-mono font-semibold">{{ stat.value }}</div>
          <div class="text-xs text-base-content/50">{{ stat.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
