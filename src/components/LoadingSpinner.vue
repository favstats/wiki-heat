<script setup>
import { Loader2 } from 'lucide-vue-next'

defineProps({
  size: {
    type: String,
    default: 'md',
  },
  text: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3">
    <Loader2 
      class="animate-spin text-primary"
      :class="{
        'w-6 h-6': size === 'sm',
        'w-8 h-8': size === 'md',
        'w-12 h-12': size === 'lg',
      }"
    />
    <span v-if="text" class="text-base-content/60 text-sm">{{ text }}</span>
  </div>
</template>
