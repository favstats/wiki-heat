<script setup>
import { ref, computed } from 'vue'
import { X, ExternalLink, Globe, Users, Shield, TrendingUp, RotateCcw, MessageSquare, MapPin, Loader2, AlertTriangle } from 'lucide-vue-next'
import { analyzeEditors, geolocateIPs, getHeatColor, getHeatLevel } from '../composables/useHeatScore'

const props = defineProps({
  page: { type: Object, required: true },
  color: { type: String, default: '#6366f1' },
})

const emit = defineEmits(['close'])

const editorAnalysis = computed(() => {
  if (!props.page?.revisions) return null
  return analyzeEditors(props.page.revisions)
})

const isLoadingGeo = ref(false)
const geoProgress = ref('')
const geoResults = ref([])

const countryStats = computed(() => {
  if (!geoResults.value.length) return []
  const counts = {}
  for (const r of geoResults.value) {
    counts[r.country] = (counts[r.country] || 0) + 1
  }
  return Object.entries(counts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})

async function loadGeolocation() {
  if (!editorAnalysis.value?.ipEditors?.length) return
  isLoadingGeo.value = true
  geoProgress.value = 'Analyzing origins...'
  
  try {
    const ips = [...new Set(editorAnalysis.value.ipEditors.map(e => e.ip))]
    geoResults.value = await geolocateIPs(ips, (done, total) => {
      geoProgress.value = `${done}/${total} IPs`
    })
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingGeo.value = false
  }
}

function openWikipedia() {
  window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(props.page.title.replace(/ /g, '_'))}`, '_blank')
}

const heatColor = computed(() => getHeatColor(props.page?.currentHeat || 0))
const heatLevel = computed(() => getHeatLevel(props.page?.currentHeat || 0))
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end" @click.self="emit('close')">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>
    
    <!-- Panel -->
    <div class="relative w-full max-w-lg bg-base-100 border-l border-white/5 overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-base-100/95 backdrop-blur border-b border-white/5 p-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div 
              class="w-3 h-3 rounded-full mb-2" 
              :style="{ backgroundColor: color }"
            ></div>
            <h2 class="text-xl font-semibold leading-tight">{{ page.title }}</h2>
            <div class="flex items-center gap-3 mt-2 text-sm text-white/50">
              <span 
                class="px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide"
                :style="{ backgroundColor: heatColor + '22', color: heatColor }"
              >
                {{ heatLevel }}
              </span>
              <span class="font-mono">{{ (page.currentHeat || 0).toFixed(3) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button @click="openWikipedia" class="btn btn-ghost btn-sm btn-square">
              <ExternalLink class="w-4 h-4" />
            </button>
            <button @click="emit('close')" class="btn btn-ghost btn-sm btn-square">
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div class="p-4 space-y-6">
        <!-- Signal Grid -->
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <TrendingUp class="w-4 h-4 text-white/30 mb-1" />
            <div class="text-lg font-mono font-medium">{{ page.signals?.editVelocity7d?.toFixed(1) || 0 }}</div>
            <div class="text-xs text-white/40">edits/day</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <RotateCcw class="w-4 h-4 text-white/30 mb-1" />
            <div class="text-lg font-mono font-medium">{{ ((page.signals?.revertRatio30d || 0) * 100).toFixed(0) }}%</div>
            <div class="text-xs text-white/40">reverts</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Users class="w-4 h-4 text-white/30 mb-1" />
            <div class="text-lg font-mono font-medium">{{ page.signals?.uniqueEditors30d || 0 }}</div>
            <div class="text-xs text-white/40">editors</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <MessageSquare class="w-4 h-4 text-white/30 mb-1" />
            <div class="text-lg font-mono font-medium">{{ page.talkRevisionCount || 0 }}</div>
            <div class="text-xs text-white/40">talk edits</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Shield class="w-4 h-4 text-white/30 mb-1" />
            <div class="text-sm font-medium capitalize">{{ page.protectionLevel || 'none' }}</div>
            <div class="text-xs text-white/40">protection</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Globe class="w-4 h-4 text-white/30 mb-1" />
            <div class="text-lg font-mono font-medium">{{ ((page.signals?.anonRatio30d || 0) * 100).toFixed(0) }}%</div>
            <div class="text-xs text-white/40">anonymous</div>
          </div>
        </div>
        
        <!-- Editor Stats -->
        <div v-if="editorAnalysis" class="space-y-4">
          <h3 class="text-sm font-medium text-white/60 uppercase tracking-wider">Editor Analysis</h3>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-center">
              <div class="text-2xl font-mono font-medium">{{ editorAnalysis.totalEditors }}</div>
              <div class="text-xs text-white/40">total editors</div>
            </div>
            <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-center">
              <div class="text-2xl font-mono font-medium text-amber-400">{{ editorAnalysis.anonymousEditors }}</div>
              <div class="text-xs text-white/40">anonymous IPs</div>
              <div class="text-[10px] text-white/20 mt-1">{{ page.revisions?.filter(r => r.isAnon).length || 0 }} anon edits</div>
            </div>
          </div>
          
          <!-- Top Editors -->
          <div v-if="editorAnalysis.topEditors?.length" class="space-y-2">
            <div class="text-xs text-white/40 uppercase tracking-wider">Top Contributors</div>
            <div class="space-y-1">
              <div 
                v-for="(editor, i) in editorAnalysis.topEditors.slice(0, 5)" 
                :key="editor.name"
                class="flex items-center justify-between py-1.5 px-2 rounded bg-white/[0.02]"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs text-white/30 w-4">{{ i + 1 }}</span>
                  <span class="truncate text-sm" :class="editor.isAnon ? 'text-amber-400/80' : ''">
                    {{ editor.name }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-white/50">
                  <span>{{ editor.editCount }}</span>
                  <span v-if="editor.revertCount" class="text-red-400">{{ editor.revertCount }}r</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Geographic Origin -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-white/60 uppercase tracking-wider">Geographic Origin</h3>
            <button
              v-if="!geoResults.length && editorAnalysis?.ipEditors?.length"
              @click="loadGeolocation"
              :disabled="isLoadingGeo"
              class="btn btn-xs btn-ghost gap-1"
            >
              <Loader2 v-if="isLoadingGeo" class="w-3 h-3 animate-spin" />
              <MapPin v-else class="w-3 h-3" />
              {{ isLoadingGeo ? geoProgress : 'Analyze' }}
            </button>
          </div>
          
          <div v-if="!editorAnalysis?.ipEditors?.length" class="text-sm text-white/30 text-center py-4">
            No anonymous IP edits to analyze
          </div>
          
          <div v-else-if="countryStats.length" class="space-y-2">
            <div 
              v-for="stat in countryStats" 
              :key="stat.country"
              class="flex items-center gap-3"
            >
              <div class="flex-1 h-6 bg-white/[0.02] rounded overflow-hidden relative">
                <div 
                  class="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/30 to-purple-500/30"
                  :style="{ width: `${(stat.count / countryStats[0].count) * 100}%` }"
                ></div>
                <div class="absolute inset-0 flex items-center justify-between px-2 text-xs">
                  <span>{{ stat.country }}</span>
                  <span class="font-mono text-white/50">{{ stat.count }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else-if="!isLoadingGeo" class="text-sm text-white/30 text-center py-4">
            Click Analyze to geolocate {{ editorAnalysis?.ipEditors?.length || 0 }} IPs
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
