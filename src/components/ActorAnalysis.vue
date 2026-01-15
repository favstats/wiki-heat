<script setup>
import { ref, computed, onMounted } from 'vue'
import { Users, Globe, MapPin, AlertTriangle, Loader2, Shield, Clock, TrendingUp, Eye } from 'lucide-vue-next'
import { analyzeEditors, geolocateIPs } from '../composables/useHeatScore'

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

const isLoadingGeo = ref(false)
const geoProgress = ref('')
const geoResults = ref([])
const editorAnalysis = ref(null)

onMounted(() => {
  editorAnalysis.value = analyzeEditors(props.revisions)
})

const countryStats = computed(() => {
  if (!geoResults.value.length) return []
  
  const counts = {}
  for (const result of geoResults.value) {
    const country = result.country || 'Unknown'
    counts[country] = (counts[country] || 0) + 1
  }
  
  return Object.entries(counts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
})

const totalGeolocated = computed(() => geoResults.value.length)

async function loadGeolocation() {
  if (!editorAnalysis.value?.ipEditors?.length) return
  
  isLoadingGeo.value = true
  geoProgress.value = 'Starting geolocation...'
  
  try {
    const ips = editorAnalysis.value.ipEditors.map(e => e.ip)
    const uniqueIPs = [...new Set(ips)]
    
    geoResults.value = await geolocateIPs(uniqueIPs, (done, total) => {
      geoProgress.value = `Geolocating IPs: ${done}/${total}`
    })
  } catch (e) {
    console.error('Geolocation failed:', e)
  } finally {
    isLoadingGeo.value = false
    geoProgress.value = ''
  }
}

// Detect suspicious patterns
const suspiciousPatterns = computed(() => {
  if (!editorAnalysis.value) return []
  
  const patterns = []
  
  // High anonymous ratio
  const anonRatio = editorAnalysis.value.anonymousEditors / editorAnalysis.value.totalEditors
  if (anonRatio > 0.3) {
    patterns.push({
      type: 'high_anon',
      severity: anonRatio > 0.5 ? 'high' : 'medium',
      description: `${(anonRatio * 100).toFixed(0)}% of edits from anonymous IPs`,
    })
  }
  
  // Single-purpose accounts (editors with very few total edits but many on this page)
  const topEditors = editorAnalysis.value.topEditors || []
  const highActivityEditors = topEditors.filter(e => e.editCount > 10 && !e.isBot)
  if (highActivityEditors.length > 5) {
    patterns.push({
      type: 'concentrated',
      severity: 'medium',
      description: `${highActivityEditors.length} editors with 10+ edits on this page`,
    })
  }
  
  // High revert users
  const revertHeavy = topEditors.filter(e => e.revertCount > 3)
  if (revertHeavy.length > 3) {
    patterns.push({
      type: 'edit_war',
      severity: 'high',
      description: `${revertHeavy.length} editors actively reverting each other`,
    })
  }
  
  return patterns
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
  <div class="space-y-6">
    <!-- Summary Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-base-300/50 rounded-xl p-4 text-center">
        <Users class="w-5 h-5 mx-auto mb-2 text-primary" />
        <div class="text-2xl font-mono font-bold">{{ editorAnalysis?.totalEditors || 0 }}</div>
        <div class="text-xs text-base-content/50">Unique Editors</div>
      </div>
      
      <div class="bg-base-300/50 rounded-xl p-4 text-center">
        <Globe class="w-5 h-5 mx-auto mb-2 text-warning" />
        <div class="text-2xl font-mono font-bold">{{ editorAnalysis?.anonymousEditors || 0 }}</div>
        <div class="text-xs text-base-content/50">Anonymous (IPs)</div>
      </div>
      
      <div class="bg-base-300/50 rounded-xl p-4 text-center">
        <Eye class="w-5 h-5 mx-auto mb-2 text-info" />
        <div class="text-2xl font-mono font-bold">{{ editorAnalysis?.registeredEditors || 0 }}</div>
        <div class="text-xs text-base-content/50">Registered</div>
      </div>
      
      <div class="bg-base-300/50 rounded-xl p-4 text-center">
        <Shield class="w-5 h-5 mx-auto mb-2 text-success" />
        <div class="text-sm font-medium">{{ protectionLabel }}</div>
        <div class="text-xs text-base-content/50">Protection</div>
      </div>
    </div>
    
    <!-- Suspicious Patterns -->
    <div v-if="suspiciousPatterns.length > 0" class="space-y-2">
      <h4 class="text-sm font-medium text-base-content/60 flex items-center gap-2">
        <AlertTriangle class="w-4 h-4" />
        Detected Patterns
      </h4>
      <div 
        v-for="pattern in suspiciousPatterns" 
        :key="pattern.type"
        class="p-3 rounded-lg flex items-center gap-3"
        :class="{
          'bg-error/10 border border-error/20': pattern.severity === 'high',
          'bg-warning/10 border border-warning/20': pattern.severity === 'medium',
        }"
      >
        <AlertTriangle 
          class="w-4 h-4 flex-shrink-0"
          :class="{
            'text-error': pattern.severity === 'high',
            'text-warning': pattern.severity === 'medium',
          }"
        />
        <span class="text-sm">{{ pattern.description }}</span>
      </div>
    </div>
    
    <!-- Geographic Analysis -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-base-content/60 flex items-center gap-2">
          <MapPin class="w-4 h-4" />
          Geographic Origin (Anonymous Edits)
        </h4>
        <button
          v-if="!geoResults.length && editorAnalysis?.ipEditors?.length"
          @click="loadGeolocation"
          :disabled="isLoadingGeo"
          class="btn btn-sm btn-ghost gap-2"
        >
          <Loader2 v-if="isLoadingGeo" class="w-4 h-4 animate-spin" />
          <Globe v-else class="w-4 h-4" />
          {{ isLoadingGeo ? geoProgress : 'Analyze Origins' }}
        </button>
      </div>
      
      <div v-if="!editorAnalysis?.ipEditors?.length" class="text-sm text-base-content/50 p-4 bg-base-300/30 rounded-lg text-center">
        No anonymous IP edits found in this dataset
      </div>
      
      <div v-else-if="!geoResults.length && !isLoadingGeo" class="text-sm text-base-content/50 p-4 bg-base-300/30 rounded-lg text-center">
        Click "Analyze Origins" to geolocate {{ editorAnalysis.ipEditors.length }} anonymous IP addresses
      </div>
      
      <div v-else-if="countryStats.length > 0" class="space-y-3">
        <div class="text-xs text-base-content/50">
          Successfully geolocated {{ totalGeolocated }} IPs
        </div>
        
        <div class="space-y-2">
          <div 
            v-for="(stat, index) in countryStats" 
            :key="stat.country"
            class="flex items-center gap-3"
          >
            <div class="w-6 text-right text-sm text-base-content/50">{{ index + 1 }}</div>
            <div class="flex-1 bg-base-300/30 rounded-full h-8 relative overflow-hidden">
              <div 
                class="absolute inset-y-0 left-0 bg-primary/30 rounded-full"
                :style="{ width: `${(stat.count / countryStats[0].count) * 100}%` }"
              ></div>
              <div class="absolute inset-0 flex items-center px-3 justify-between">
                <span class="text-sm font-medium">{{ stat.country }}</span>
                <span class="text-sm font-mono text-base-content/60">{{ stat.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Top Editors -->
    <div v-if="editorAnalysis?.topEditors?.length">
      <h4 class="text-sm font-medium text-base-content/60 mb-3 flex items-center gap-2">
        <TrendingUp class="w-4 h-4" />
        Top Contributors
      </h4>
      <div class="space-y-2">
        <div 
          v-for="(editor, index) in editorAnalysis.topEditors.slice(0, 10)" 
          :key="editor.name"
          class="flex items-center gap-3 p-2 rounded-lg bg-base-300/30"
        >
          <div class="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs font-mono">
            {{ index + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="truncate text-sm" :class="{ 'text-warning': editor.isAnon, 'text-info': editor.isBot }">
              {{ editor.name }}
              <span v-if="editor.isAnon" class="text-xs text-base-content/50">(IP)</span>
              <span v-if="editor.isBot" class="text-xs text-base-content/50">(Bot)</span>
            </div>
          </div>
          <div class="flex items-center gap-4 text-sm">
            <span class="font-mono">{{ editor.editCount }} edits</span>
            <span v-if="editor.revertCount > 0" class="font-mono text-error">
              {{ editor.revertCount }} reverts
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
