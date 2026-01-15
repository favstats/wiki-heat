<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, ExternalLink, RefreshCw, Trash2, Flame, Activity, Users, MessageSquare, Globe, Calendar, Sliders, TrendingUp, Shield, RotateCcw } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import HeatBadge from '../components/HeatBadge.vue'
import TrendChart from '../components/TrendChart.vue'
import ActorAnalysis from '../components/ActorAnalysis.vue'
import { usePagesStore } from '../stores/pages'
import { getHeatColor, getHeatLevel, getNormalizedSignals, DEFAULT_WEIGHTS } from '../composables/useHeatScore'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const emit = defineEmits(['open-settings'])

const store = usePagesStore()
const page = computed(() => store.selectedPage)
const activeTab = ref('overview')
const selectedSignal = ref(null) // For signal focus mode

// Signal definitions for the selector
const signalDefinitions = [
  { key: 'editVelocity', name: 'Edit Velocity', icon: TrendingUp, color: 'primary' },
  { key: 'revertRatio', name: 'Revert Ratio', icon: RotateCcw, color: 'error' },
  { key: 'uniqueEditors', name: 'Unique Editors', icon: Users, color: 'info' },
  { key: 'talkActivity', name: 'Talk Activity', icon: MessageSquare, color: 'secondary' },
  { key: 'protection', name: 'Protection', icon: Shield, color: 'warning' },
  { key: 'anonRatio', name: 'Anonymous', icon: Globe, color: 'accent' },
]

// Get normalized signal values for the selected signal
const normalizedSignals = computed(() => {
  if (!page.value?.signals) return null
  return getNormalizedSignals(page.value.signals)
})

// Get the current weights (custom or default)
const currentWeights = computed(() => {
  return store.settings.weights || DEFAULT_WEIGHTS
})

const heatColor = computed(() => getHeatColor(page.value?.currentHeat || 0))

const signalData = computed(() => {
  const signals = page.value?.signals || {}
  const weights = store.settings.weights || DEFAULT_WEIGHTS
  return [
    { 
      key: 'editVelocity',
      label: 'Edit Velocity', 
      value: signals.editVelocity7d?.toFixed(1) || '0', 
      unit: '/day',
      description: 'Average edits per day over last 7 days',
      weight: `${(weights.editVelocity * 100).toFixed(0)}%`,
    },
    { 
      key: 'revertRatio',
      label: 'Revert Ratio', 
      value: ((signals.revertRatio30d || 0) * 100).toFixed(0), 
      unit: '%',
      description: 'Percentage of edits that are reverts',
      weight: `${(weights.revertRatio * 100).toFixed(0)}%`,
    },
    { 
      key: 'uniqueEditors',
      label: 'Unique Editors', 
      value: signals.uniqueEditors30d || 0, 
      unit: '',
      description: 'Distinct editors in last 30 days',
      weight: `${(weights.uniqueEditors * 100).toFixed(0)}%`,
    },
    { 
      key: 'talkActivity',
      label: 'Talk Activity', 
      value: page.value?.talkRevisionCount || 0, 
      unit: '',
      description: 'Discussion page edit count',
      weight: `${(weights.talkActivity * 100).toFixed(0)}%`,
    },
    { 
      key: 'protection',
      label: 'Protection', 
      value: page.value?.protectionLevel || 'none', 
      unit: '',
      description: 'Page protection level',
      weight: `${(weights.protection * 100).toFixed(0)}%`,
    },
    { 
      key: 'anonRatio',
      label: 'Anonymous', 
      value: ((signals.anonRatio30d || 0) * 100).toFixed(0), 
      unit: '%',
      description: 'Edits from unregistered users',
      weight: `${(weights.anonRatio * 100).toFixed(0)}%`,
    },
  ]
})

const pageviewChartData = computed(() => {
  const pageviews = page.value?.pageviews || []
  const last30 = pageviews.slice(-30)
  
  return {
    labels: last30.map(p => p.date.substring(4, 8)), // MMDD
    datasets: [{
      label: 'Daily Views',
      data: last30.map(p => p.views),
      borderColor: '#6366f1',
      backgroundColor: '#6366f122',
      fill: true,
      tension: 0.4,
    }],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e1e2e',
      padding: 12,
    },
  },
  scales: {
    x: {
      grid: { color: '#ffffff11' },
      ticks: { color: '#ffffff66' },
    },
    y: {
      grid: { color: '#ffffff11' },
      ticks: { color: '#ffffff66' },
    },
  },
}

function goBack() {
  store.deselectPage()
}

function openWikipedia() {
  if (page.value) {
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(page.value.title.replace(/ /g, '_'))}`
    window.open(url, '_blank')
  }
}

function removePage() {
  if (confirm('Remove this page from tracking?')) {
    const id = page.value?.id
    store.deselectPage()
    if (id) store.removePage(id)
  }
}
</script>

<template>
  <div v-if="page" class="min-h-screen">
    <!-- Header -->
    <header class="sticky top-0 z-40 backdrop-blur-xl bg-base-100/80 border-b border-base-content/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button @click="goBack" class="btn btn-ghost btn-sm btn-square">
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div>
              <h1 class="text-xl font-bold">{{ page.title }}</h1>
              <div class="flex items-center gap-2 mt-1">
                <HeatBadge :score="page.currentHeat || 0" size="sm" />
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button 
              class="btn btn-ghost btn-sm gap-2"
              @click="openWikipedia"
            >
              <ExternalLink class="w-4 h-4" />
              <span class="hidden sm:inline">Wikipedia</span>
            </button>
            <button 
              class="btn btn-ghost btn-sm gap-2"
              @click="emit('open-settings')"
              title="Edit heat score calculation"
            >
              <Sliders class="w-4 h-4" />
            </button>
            <button 
              class="btn btn-ghost btn-sm text-error"
              @click="removePage"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
    
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Timeframe Info -->
      <div v-if="page.timeframe" class="mb-4 flex items-center gap-2 text-sm text-base-content/60">
        <Calendar class="w-4 h-4" />
        <span>Analyzing: {{ page.timeframe.start }} to {{ page.timeframe.end }}</span>
      </div>
      
      <!-- Tabs -->
      <div class="tabs tabs-boxed bg-base-200/50 inline-flex mb-8">
        <button 
          class="tab"
          :class="{ 'tab-active': activeTab === 'overview' }"
          @click="activeTab = 'overview'"
        >
          <Activity class="w-4 h-4 mr-2" />
          Overview
        </button>
        <button 
          class="tab"
          :class="{ 'tab-active': activeTab === 'actors' }"
          @click="activeTab = 'actors'"
        >
          <Globe class="w-4 h-4 mr-2" />
          Actors
        </button>
        <button 
          class="tab"
          :class="{ 'tab-active': activeTab === 'signals' }"
          @click="activeTab = 'signals'"
        >
          <Flame class="w-4 h-4 mr-2" />
          Signals
        </button>
      </div>
      
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-8 fade-in">
        <!-- Heat Score Card -->
        <div 
          class="relative rounded-3xl overflow-hidden p-8"
          :style="{
            background: `linear-gradient(135deg, ${heatColor}22 0%, transparent 60%)`,
            border: `1px solid ${heatColor}33`,
          }"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div class="text-sm text-base-content/60 mb-2">Current Heat Score</div>
              <div class="flex items-baseline gap-3">
                <span 
                  class="text-6xl font-mono font-bold"
                  :style="{ color: heatColor }"
                >
                  {{ (page.currentHeat || 0).toFixed(2) }}
                </span>
                <span class="text-2xl text-base-content/40">/ 1.00</span>
              </div>
              <div class="mt-2 text-base-content/60">
                {{ getHeatLevel(page.currentHeat || 0).toUpperCase() }} activity level
              </div>
            </div>
            
            <div class="flex-1 max-w-md">
              <div class="text-sm text-base-content/60 mb-2">Last 12 Weeks</div>
              <TrendChart 
                v-if="page.heatTimeline?.length"
                :data="page.heatTimeline"
                :height="80"
                :color="heatColor"
                :showLabels="true"
              />
            </div>
          </div>
        </div>
        
        <!-- Quick Signal Selector -->
        <div class="bg-base-200/20 rounded-2xl p-4 border border-base-content/5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-base-content/60">Focus on Signal:</span>
            <button 
              v-if="selectedSignal"
              @click="selectedSignal = null"
              class="btn btn-ghost btn-xs"
            >
              Show All
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="sig in signalDefinitions"
              :key="sig.key"
              @click="selectedSignal = selectedSignal === sig.key ? null : sig.key"
              class="btn btn-sm gap-2"
              :class="selectedSignal === sig.key ? `btn-${sig.color}` : 'btn-ghost bg-base-300/50'"
            >
              <component :is="sig.icon" class="w-4 h-4" />
              {{ sig.name }}
            </button>
          </div>
          
          <!-- Selected Signal Detail -->
          <div v-if="selectedSignal && normalizedSignals" class="mt-4 p-4 rounded-xl bg-base-300/30">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <component 
                  :is="signalDefinitions.find(s => s.key === selectedSignal)?.icon" 
                  class="w-5 h-5" 
                  :class="`text-${signalDefinitions.find(s => s.key === selectedSignal)?.color}`"
                />
                <span class="font-medium">{{ signalDefinitions.find(s => s.key === selectedSignal)?.name }}</span>
              </div>
              <span class="text-sm text-base-content/50">
                Weight: {{ (currentWeights[selectedSignal] * 100).toFixed(0) }}%
              </span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-3 rounded-lg bg-base-200/50">
                <div class="text-2xl font-mono font-bold">
                  {{ typeof normalizedSignals[selectedSignal]?.raw === 'number' 
                    ? normalizedSignals[selectedSignal].raw.toFixed(2) 
                    : normalizedSignals[selectedSignal]?.raw || 0 }}
                </div>
                <div class="text-xs text-base-content/50">Raw Value</div>
              </div>
              <div class="text-center p-3 rounded-lg bg-base-200/50">
                <div class="text-2xl font-mono font-bold">
                  {{ (normalizedSignals[selectedSignal]?.normalized * 100).toFixed(0) }}%
                </div>
                <div class="text-xs text-base-content/50">Normalized (0-100%)</div>
              </div>
            </div>
            <div class="mt-3">
              <div class="text-xs text-base-content/50 mb-1">Contribution to Heat Score</div>
              <div class="w-full bg-base-300 rounded-full h-3 overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all"
                  :class="`bg-${signalDefinitions.find(s => s.key === selectedSignal)?.color}`"
                  :style="{ width: `${normalizedSignals[selectedSignal]?.normalized * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="grid md:grid-cols-3 gap-4">
          <div class="bg-base-200/30 rounded-2xl p-6 border border-base-content/5">
            <div class="text-sm text-base-content/60 mb-1">Total Revisions</div>
            <div class="text-3xl font-mono font-bold">{{ page.revisions?.length || 0 }}</div>
          </div>
          <div class="bg-base-200/30 rounded-2xl p-6 border border-base-content/5">
            <div class="text-sm text-base-content/60 mb-1">Unique Editors (30d)</div>
            <div class="text-3xl font-mono font-bold">{{ page.signals?.uniqueEditors30d || 0 }}</div>
          </div>
          <div class="bg-base-200/30 rounded-2xl p-6 border border-base-content/5">
            <div class="text-sm text-base-content/60 mb-1">Protection Level</div>
            <div class="text-xl font-medium capitalize">{{ page.protectionLevel || 'none' }}</div>
          </div>
        </div>
        
        <!-- Pageviews Chart -->
        <div class="bg-base-200/30 rounded-2xl p-6 border border-base-content/5">
          <h3 class="text-lg font-semibold mb-4">Page Views (Last 30 Days)</h3>
          <div class="h-64">
            <Line :data="pageviewChartData" :options="chartOptions" />
          </div>
        </div>
      </div>
      
      <!-- Actors Tab -->
      <div v-if="activeTab === 'actors'" class="fade-in">
        <ActorAnalysis 
          :revisions="page.revisions || []"
          :protectionLevel="page.protectionLevel"
        />
      </div>
      
      <!-- Signals Tab -->
      <div v-if="activeTab === 'signals'" class="fade-in">
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="signal in signalData"
            :key="signal.label"
            class="bg-base-200/30 rounded-2xl p-6 border border-base-content/5"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-base-content/60">{{ signal.label }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {{ signal.weight }}
              </span>
            </div>
            <div class="text-3xl font-mono font-bold">
              {{ signal.value }}<span class="text-lg text-base-content/40">{{ signal.unit }}</span>
            </div>
            <p class="text-xs text-base-content/50 mt-2">{{ signal.description }}</p>
          </div>
        </div>
        
        <!-- Score Formula -->
        <div class="mt-8 p-6 rounded-2xl bg-base-200/30 border border-base-content/5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Heat Score Formula</h3>
            <button @click="emit('open-settings')" class="btn btn-ghost btn-sm gap-2">
              <Sliders class="w-4 h-4" />
              Edit Weights
            </button>
          </div>
          <div class="font-mono text-sm bg-base-300/50 p-4 rounded-xl overflow-x-auto">
            <code>
              heat = (velocity × {{ currentWeights.editVelocity.toFixed(2) }}) + 
              (reverts × {{ currentWeights.revertRatio.toFixed(2) }}) + 
              (editors × {{ currentWeights.uniqueEditors.toFixed(2) }}) + 
              (talk × {{ currentWeights.talkActivity.toFixed(2) }}) + 
              (protection × {{ currentWeights.protection.toFixed(2) }}) + 
              (anon × {{ currentWeights.anonRatio.toFixed(2) }})
            </code>
          </div>
          <p class="text-sm text-base-content/50 mt-4">
            Each signal is normalized to a 0-1 range before weighting. Higher scores indicate more controversy or engagement.
            <span v-if="store.settings.weights" class="text-primary"> (Using custom weights)</span>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
