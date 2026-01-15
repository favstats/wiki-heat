<script setup>
import { computed, ref, watch } from 'vue'
import { Flame, Trash2, X, Eye, EyeOff, Sliders, TrendingUp, RotateCcw, Users, Globe, Loader2, ChevronRight, Calendar, Info } from 'lucide-vue-next'
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
import PageInput from '../components/PageInput.vue'
import PagePanel from '../components/PagePanel.vue'
import { usePagesStore } from '../stores/pages'
import { useWikipedia } from '../composables/useWikipedia'
import { usePageviews } from '../composables/usePageviews'
import { extractSignals, calculateHeatScore, calculateHeatTimeline, getHeatColor } from '../composables/useHeatScore'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const emit = defineEmits(['open-settings', 'open-about'])

const store = usePagesStore()
const { getPageInfo, getAllRevisions, getTalkPageRevisionCount } = useWikipedia()
const { getPageviews } = usePageviews()

// Selected page for panel
const selectedPage = ref(null)

// Date range
const dateRangePresets = [
  { key: '30d', name: '30 days', days: 30 },
  { key: '90d', name: '90 days', days: 90 },
  { key: '1y', name: '1 year', days: 365 },
  { key: 'custom', name: 'Custom', days: null },
]
const selectedDateRange = ref('90d')
const customStartDate = ref('')
const customEndDate = ref('')

// Calculate effective date range
const effectiveDateRange = computed(() => {
  const preset = dateRangePresets.find(p => p.key === selectedDateRange.value)
  if (preset?.days) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - preset.days)
    return { start, end, days: preset.days }
  }
  // Custom range
  if (customStartDate.value && customEndDate.value) {
    return {
      start: new Date(customStartDate.value),
      end: new Date(customEndDate.value),
      days: null,
    }
  }
  // Default to 90 days
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)
  return { start, end, days: 90 }
})

// Metric selector
const metrics = [
  { key: 'heat', name: 'Heat', icon: Flame, description: 'Composite controversy index' },
  { key: 'editVelocity', name: 'Velocity', icon: TrendingUp, description: 'Editorial activity rate' },
  { key: 'revertRatio', name: 'Reverts', icon: RotateCcw, description: 'Content dispute frequency' },
  { key: 'uniqueEditors', name: 'Editors', icon: Users, description: 'Contributor diversity' },
  { key: 'anonRatio', name: 'Anonymous', icon: Globe, description: 'Unregistered participation' },
]
const selectedMetric = ref('heat')
const currentMetric = computed(() => metrics.find(m => m.key === selectedMetric.value))

// Hidden pages
const hiddenPages = ref(new Set())
const visiblePages = computed(() => store.pages.filter(p => !hiddenPages.value.has(p.id)))
const hasPages = computed(() => store.totalPages > 0)

// Refined color palette
const pageColors = [
  '#94a3b8', // slate
  '#a78bfa', // violet
  '#f472b6', // pink
  '#38bdf8', // sky
  '#4ade80', // green
  '#fbbf24', // amber
  '#fb7185', // rose
  '#2dd4bf', // teal
]

function getPageColor(index) {
  return pageColors[index % pageColors.length]
}

// Helper to compute anonymous ratio for a date range from raw revisions
function computeAnonRatioForDate(revisions, targetDate, windowDays = 30) {
  if (!revisions || revisions.length === 0) {
    console.log('[AnonCalc] No revisions provided')
    return 0
  }
  
  const endDate = new Date(targetDate)
  const startDate = new Date(targetDate)
  startDate.setDate(startDate.getDate() - windowDays)
  
  const windowRevisions = revisions.filter(r => {
    const revDate = new Date(r.timestamp)
    return revDate >= startDate && revDate <= endDate
  })
  
  // Debug first call only
  if (!computeAnonRatioForDate._logged) {
    computeAnonRatioForDate._logged = true
    const totalAnon = revisions.filter(r => r.isAnon).length
    console.log('[AnonCalc Debug]', {
      totalRevisions: revisions.length,
      totalWithIsAnon: totalAnon,
      targetDate,
      windowStart: startDate.toISOString(),
      windowEnd: endDate.toISOString(),
      windowRevisions: windowRevisions.length,
      windowAnon: windowRevisions.filter(r => r.isAnon).length,
      sampleRevision: revisions[0],
      sampleAnonRevision: revisions.find(r => r.isAnon)
    })
  }
  
  if (windowRevisions.length === 0) return 0
  
  const anonCount = windowRevisions.filter(r => r.isAnon).length
  return (anonCount / windowRevisions.length) * 100
}

// Chart data with date filtering
const chartData = computed(() => {
  const pages = visiblePages.value
  if (pages.length === 0) return null
  
  const { start, end } = effectiveDateRange.value
  
  const allDates = new Set()
  for (const page of pages) {
    if (page.heatTimeline) {
      for (const point of page.heatTimeline) {
        const pointDate = new Date(point.date)
        // Filter by date range
        if (pointDate >= start && pointDate <= end) {
          allDates.add(point.date)
        }
      }
    }
  }
  
  const sortedDates = [...allDates].sort()
  const labels = sortedDates.map(d => {
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
  
  const datasets = pages.map((page, index) => {
    const color = getPageColor(index)
    
    const data = sortedDates.map(date => {
      const point = page.heatTimeline?.find(p => p.date === date)
      if (!point) return null
      
      switch (selectedMetric.value) {
        case 'heat': return point.heat
        case 'editVelocity': return point.signals?.editVelocity7d || 0
        case 'revertRatio': return (point.signals?.revertRatio30d || 0) * 100
        case 'uniqueEditors': return point.signals?.uniqueEditors30d || 0
        case 'anonRatio': 
          // Compute directly from revisions to avoid stored signal issues
          return computeAnonRatioForDate(page.revisions, date, 30)
        default: return point.heat
      }
    })
    
    return {
      label: page.title,
      data,
      borderColor: color,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 1.5,
    }
  })
  
  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 15, 23, 0.95)',
      titleColor: 'rgba(255,255,255,0.7)',
      bodyColor: 'rgba(255,255,255,0.9)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 12,
      titleFont: { family: 'JetBrains Mono', size: 11 },
      bodyFont: { family: 'JetBrains Mono', size: 12 },
      callbacks: {
        label: (ctx) => {
          const suffix = selectedMetric.value === 'heat' ? '' : 
            ['revertRatio', 'anonRatio'].includes(selectedMetric.value) ? '%' : ''
          return `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2) || 0}${suffix}`
        }
      }
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
      ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 }, maxRotation: 0 },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
      ticks: { color: 'rgba(255,255,255,0.3)', font: { family: 'JetBrains Mono', size: 10 } },
      min: 0,
      max: selectedMetric.value === 'heat' ? 1 : undefined,
    },
  },
  interaction: { intersect: false, mode: 'index' },
}))

// Suggestions
const addingSuggestion = ref(null)
const suggestions = ['ChatGPT', 'Taylor Swift', 'Donald Trump', 'Climate change']

async function addSuggestion(title) {
  if (addingSuggestion.value || store.pages.find(p => p.title === title)) return
  addingSuggestion.value = title
  
  try {
    const pageInfo = await getPageInfo(title)
    if (!pageInfo?.exists) throw new Error('Not found')
    
    // Fetch more revisions for longer time ranges
    const revisions = await getAllRevisions(title, 3000)
    const talkCount = await getTalkPageRevisionCount(title)
    const pageviews = await getPageviews(title, 365)
    
    const signals = extractSignals(revisions, {
      protectionLevel: pageInfo.protectionLevel,
      talkRevisionCount: talkCount,
    })
    
    store.addPage({
      id: `${title}_${Date.now()}`,
      title: pageInfo.title,
      pageId: pageInfo.pageId,
      protectionLevel: pageInfo.protectionLevel,
      revisions, pageviews,
      currentHeat: calculateHeatScore(signals),
      // Generate 52 weeks (1 year) of timeline data
      heatTimeline: calculateHeatTimeline(revisions, {
        protectionLevel: pageInfo.protectionLevel,
        talkRevisionCount: talkCount,
        weeks: 52,
      }),
      signals,
      talkRevisionCount: talkCount,
    })
  } catch (e) {
    console.error(e)
  } finally {
    addingSuggestion.value = null
  }
}

function toggleVisibility(pageId) {
  if (hiddenPages.value.has(pageId)) {
    hiddenPages.value.delete(pageId)
  } else {
    hiddenPages.value.add(pageId)
  }
  hiddenPages.value = new Set(hiddenPages.value)
}

function removePage(pageId) {
  store.removePage(pageId)
  hiddenPages.value.delete(pageId)
  if (selectedPage.value?.id === pageId) selectedPage.value = null
}

function openPage(page) {
  selectedPage.value = page
}

function clearAll() {
  if (confirm('Remove all pages?')) {
    store.clearAllData()
    hiddenPages.value.clear()
    selectedPage.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0f]">
    <!-- Subtle gradient overlay -->
    <div class="fixed inset-0 pointer-events-none opacity-40">
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-purple-950/20"></div>
      <div class="absolute top-0 left-1/3 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]"></div>
    </div>
    
    <!-- Header -->
    <header class="relative z-10 border-b border-white/[0.03]">
      <div class="max-w-[1600px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/80 to-orange-500/80 flex items-center justify-center">
              <Flame class="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 class="text-base font-medium tracking-tight text-white/90">Wikipedia Heat</h1>
              <p class="text-[10px] uppercase tracking-[0.2em] text-white/30">Controversy Index</p>
            </div>
          </div>
          
          <div class="flex items-center gap-1">
            <button @click="emit('open-about')" class="p-2 rounded-lg hover:bg-white/5 transition-colors" title="About">
              <Info class="w-4 h-4 text-white/40" />
            </button>
            <button @click="emit('open-settings')" class="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Settings">
              <Sliders class="w-4 h-4 text-white/40" />
            </button>
            <button v-if="hasPages" @click="clearAll" class="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Clear all">
              <Trash2 class="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>
      </div>
    </header>
    
    <main class="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
      <!-- Search -->
      <div class="mb-8">
        <PageInput @added="() => {}" />
      </div>
      
      <!-- Empty State -->
      <div v-if="!hasPages" class="text-center py-24">
        <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 flex items-center justify-center">
          <Flame class="w-7 h-7 text-white/20" />
        </div>
        <h2 class="text-lg font-light text-white/60 mb-2">Begin your analysis</h2>
        <p class="text-sm text-white/30 mb-8">Search for Wikipedia pages to compare their controversy indices</p>
        
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="s in suggestions"
            :key="s"
            class="px-4 py-2 rounded-lg text-sm text-white/50 bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:text-white/70 transition-all"
            :disabled="addingSuggestion !== null"
            @click="addSuggestion(s)"
          >
            <Loader2 v-if="addingSuggestion === s" class="w-3 h-3 animate-spin inline mr-1" />
            {{ s }}
          </button>
        </div>
      </div>
      
      <!-- Main Content -->
      <div v-else class="space-y-6">
        <!-- Controls Row -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <!-- Metric Tabs -->
            <div class="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-white/5">
              <button
                v-for="m in metrics"
                :key="m.key"
                @click="selectedMetric = m.key"
                class="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5"
                :class="selectedMetric === m.key 
                  ? 'bg-white/10 text-white/90' 
                  : 'text-white/40 hover:text-white/60'"
              >
                <component :is="m.icon" class="w-3 h-3" />
                {{ m.name }}
              </button>
            </div>
            
            <!-- Date Range -->
            <div class="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-white/5">
              <Calendar class="w-3 h-3 text-white/30 ml-2" />
              <button
                v-for="dr in dateRangePresets"
                :key="dr.key"
                @click="selectedDateRange = dr.key"
                class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                :class="selectedDateRange === dr.key 
                  ? 'bg-white/10 text-white/90' 
                  : 'text-white/40 hover:text-white/60'"
              >
                {{ dr.name }}
              </button>
            </div>
          </div>
          
          <div class="text-xs text-white/30">
            {{ currentMetric?.description }}
          </div>
        </div>
        
        <!-- Custom Date Range Inputs -->
        <div v-if="selectedDateRange === 'custom'" class="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <span class="text-xs text-white/40">From:</span>
          <input
            v-model="customStartDate"
            type="date"
            class="h-8 px-3 rounded-lg bg-white/[0.02] border border-white/5 text-sm text-white/70"
          />
          <span class="text-xs text-white/40">To:</span>
          <input
            v-model="customEndDate"
            type="date"
            class="h-8 px-3 rounded-lg bg-white/[0.02] border border-white/5 text-sm text-white/70"
          />
          <span v-if="customStartDate && customEndDate" class="text-xs text-white/30 ml-2">
            {{ Math.ceil((new Date(customEndDate) - new Date(customStartDate)) / (1000 * 60 * 60 * 24)) }} days
          </span>
        </div>
        
        <!-- Page Tags -->
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(page, index) in store.pages"
            :key="page.id"
            @click="openPage(page)"
            class="group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border"
            :class="hiddenPages.has(page.id) 
              ? 'bg-white/[0.01] border-white/5 opacity-40' 
              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'"
          >
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getPageColor(index) }"></span>
            <span class="text-white/70 max-w-[120px] truncate">{{ page.title }}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40">
              {{ (page.currentHeat || 0).toFixed(2) }}
            </span>
            <ChevronRight class="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
            
            <button 
              @click.stop="toggleVisibility(page.id)"
              class="p-0.5 rounded hover:bg-white/10 transition-colors"
            >
              <EyeOff v-if="hiddenPages.has(page.id)" class="w-3 h-3 text-white/30" />
              <Eye v-else class="w-3 h-3 text-white/30" />
            </button>
            <button 
              @click.stop="removePage(page.id)"
              class="p-0.5 rounded hover:bg-red-500/20 transition-colors"
            >
              <X class="w-3 h-3 text-white/30 hover:text-red-400" />
            </button>
          </button>
        </div>
        
        <!-- Chart -->
        <div class="rounded-2xl bg-white/[0.01] border border-white/5 p-6">
          <div class="h-[400px]">
            <Line v-if="chartData" :data="chartData" :options="chartOptions" />
          </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <button 
            v-for="(page, index) in visiblePages" 
            :key="page.id"
            @click="openPage(page)"
            class="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-all text-left group"
          >
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getPageColor(index) }"></span>
              <span class="text-xs text-white/50 truncate flex-1">{{ page.title }}</span>
            </div>
            <div class="text-2xl font-mono font-light text-white/80">
              {{ (page.currentHeat || 0).toFixed(2) }}
            </div>
            <div class="text-[10px] text-white/30 mt-1">
              {{ page.signals?.uniqueEditors30d || 0 }} contributors
            </div>
          </button>
        </div>
      </div>
    </main>
    
    <!-- Page Panel -->
    <Transition name="slide">
      <PagePanel 
        v-if="selectedPage" 
        :page="selectedPage" 
        :color="getPageColor(store.pages.findIndex(p => p.id === selectedPage.id))"
        @close="selectedPage = null"
      />
    </Transition>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
