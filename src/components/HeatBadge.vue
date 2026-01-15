<script setup>
import { computed } from 'vue'
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'
import { getHeatLevel, getHeatColor } from '../composables/useHeatScore'

const props = defineProps({
  score: {
    type: Number,
    required: true,
  },
  size: {
    type: String,
    default: 'md', // sm, md, lg
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
  trend: {
    type: String,
    default: null, // 'up', 'down', 'stable'
  },
})

const level = computed(() => getHeatLevel(props.score))
const color = computed(() => getHeatColor(props.score))

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-sm px-2 py-0.5 gap-1'
    case 'lg':
      return 'text-lg px-4 py-2 gap-2'
    default:
      return 'text-base px-3 py-1 gap-1.5'
  }
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-3 h-3'
    case 'lg': return 'w-5 h-5'
    default: return 'w-4 h-4'
  }
})

const labelText = computed(() => {
  switch (level.value) {
    case 'critical': return 'Critical'
    case 'high': return 'High'
    case 'moderate': return 'Moderate'
    default: return 'Low'
  }
})
</script>

<template>
  <div 
    class="inline-flex items-center rounded-full font-mono font-medium"
    :class="sizeClasses"
    :style="{
      backgroundColor: color + '22',
      color: color,
      border: `1px solid ${color}44`,
    }"
  >
    <Flame :class="iconSize" />
    <span>{{ score.toFixed(2) }}</span>
    <span v-if="showLabel" class="opacity-70">{{ labelText }}</span>
    
    <TrendingUp v-if="trend === 'up'" :class="iconSize" class="ml-1" />
    <TrendingDown v-else-if="trend === 'down'" :class="iconSize" class="ml-1" />
    <Minus v-else-if="trend === 'stable'" :class="iconSize" class="ml-1 opacity-50" />
  </div>
</template>
