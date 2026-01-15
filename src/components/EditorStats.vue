<script setup>
import { computed } from 'vue'
import { Users, UserX, Bot, Shield } from 'lucide-vue-next'

const props = defineProps({
  revisions: {
    type: Array,
    required: true,
  },
  protectionLevel: {
    type: String,
    default: 'none',
  },
})

const stats = computed(() => {
  if (!props.revisions || props.revisions.length === 0) {
    return {
      total: 0,
      anonymous: 0,
      registered: 0,
      topEditors: [],
    }
  }
  
  const editorCounts = {}
  let anonymous = 0
  let registered = 0
  
  for (const rev of props.revisions) {
    const user = rev.user || 'Unknown'
    editorCounts[user] = (editorCounts[user] || 0) + 1
    
    if (rev.isAnon) {
      anonymous++
    } else {
      registered++
    }
  }
  
  const topEditors = Object.entries(editorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))
  
  return {
    total: Object.keys(editorCounts).length,
    anonymous,
    registered,
    topEditors,
  }
})

const protectionLabel = computed(() => {
  switch (props.protectionLevel?.toLowerCase()) {
    case 'autoconfirmed': return 'Semi-protected'
    case 'extendedconfirmed': return 'Extended protection'
    case 'sysop': return 'Fully protected'
    default: return 'Not protected'
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Summary Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-base-300/50 rounded-xl p-4 text-center">
        <Users class="w-5 h-5 mx-auto mb-2 text-primary" />
        <div class="text-2xl font-mono font-bold">{{ stats.total }}</div>
        <div class="text-xs text-base-content/50">Unique Editors</div>
      </div>
      
      <div class="bg-base-300/50 rounded-xl p-4 text-center">
        <UserX class="w-5 h-5 mx-auto mb-2 text-warning" />
        <div class="text-2xl font-mono font-bold">{{ stats.anonymous }}</div>
        <div class="text-xs text-base-content/50">Anonymous Edits</div>
      </div>
      
      <div class="bg-base-300/50 rounded-xl p-4 text-center">
        <Bot class="w-5 h-5 mx-auto mb-2 text-info" />
        <div class="text-2xl font-mono font-bold">{{ stats.registered }}</div>
        <div class="text-xs text-base-content/50">Registered Edits</div>
      </div>
      
      <div class="bg-base-300/50 rounded-xl p-4 text-center">
        <Shield class="w-5 h-5 mx-auto mb-2 text-success" />
        <div class="text-sm font-medium">{{ protectionLabel }}</div>
        <div class="text-xs text-base-content/50">Protection Level</div>
      </div>
    </div>
    
    <!-- Top Editors -->
    <div v-if="stats.topEditors.length > 0">
      <h4 class="text-sm font-medium text-base-content/60 mb-3">Top Contributors</h4>
      <div class="space-y-2">
        <div 
          v-for="(editor, index) in stats.topEditors" 
          :key="editor.name"
          class="flex items-center gap-3 p-2 rounded-lg bg-base-300/30"
        >
          <div class="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs font-mono">
            {{ index + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="truncate text-sm">{{ editor.name }}</div>
          </div>
          <div class="font-mono text-sm text-base-content/60">
            {{ editor.count }} edits
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
