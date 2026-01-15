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

// Date range presets
const dateRangePresets = [
  { key: '30d', name: '30d', days: 30 },
  { key: '90d', name: '90d', days: 90 },
  { key: '1y', name: '1y', days: 365 },
  { key: '5y', name: '5y', days: 1825 },
  { key: 'custom', name: 'Custom', days: null },
]

// Sync with store for persistence and sharing with PageInput
const selectedDateRange = computed({
  get: () => store.dateRangeSettings.preset,
  set: (val) => { 
    console.log('[DateRange] Setting preset to:', val)
    store.dateRangeSettings.preset = val 
  }
})

// Initialize custom dates with sensible defaults
const today = new Date()
const ninetyDaysAgo = new Date()
ninetyDaysAgo.setDate(today.getDate() - 90)

const customStartDate = computed({
  get: () => store.dateRangeSettings.customStart || ninetyDaysAgo.toISOString().split('T')[0],
  set: (val) => { 
    console.log('[DateRange] Setting customStart to:', val)
    store.dateRangeSettings.customStart = val 
  }
})
const customEndDate = computed({
  get: () => store.dateRangeSettings.customEnd || today.toISOString().split('T')[0],
  set: (val) => { 
    console.log('[DateRange] Setting customEnd to:', val)
    store.dateRangeSettings.customEnd = val 
  }
})

// Calculate effective date range
const effectiveDateRange = computed(() => {
  const presetKey = selectedDateRange.value
  const preset = dateRangePresets.find(p => p.key === presetKey)
  
  console.log('[effectiveDateRange] Computing...', {
    presetKey,
    presetDays: preset?.days,
    customStart: customStartDate.value,
    customEnd: customEndDate.value,
    storeCustomStart: store.dateRangeSettings.customStart,
    storeCustomEnd: store.dateRangeSettings.customEnd,
  })
  
  if (preset?.days) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - preset.days)
    console.log('[effectiveDateRange] Using preset:', preset.days, 'days')
    return { start, end, days: preset.days }
  }
  
  // Custom range
  if (customStartDate.value && customEndDate.value) {
    const start = new Date(customStartDate.value)
    const end = new Date(customEndDate.value)
    console.log('[effectiveDateRange] Using custom:', customStartDate.value, 'to', customEndDate.value)
    return { start, end, days: null }
  }
  
  // Default to 90 days
  console.log('[effectiveDateRange] Using default 90 days')
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
  if (!revisions || revisions.length === 0) return 0
  
  const endDate = new Date(targetDate)
  const startDate = new Date(targetDate)
  startDate.setDate(startDate.getDate() - windowDays)
  
  const windowRevisions = revisions.filter(r => {
    const revDate = new Date(r.timestamp)
    return revDate >= startDate && revDate <= endDate
  })
  
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
  
  // Determine if we need year labels (for ranges > 1 year)
  const rangeMs = end - start
  const rangeDays = rangeMs / (24 * 60 * 60 * 1000)
  const showYear = rangeDays > 180 // Show year if range > 6 months
  
  // Create labels with year info
  const labels = sortedDates.map(d => {
    const date = new Date(d)
    if (showYear) {
      // For multi-year: show "Jan 15, 2024" or "Jan '24" for axis
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
  
  // Store raw dates for tooltip access
  const rawDates = sortedDates
  
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
  
  return { labels, datasets, rawDates }
})

// Get metric display info
const metricInfo = computed(() => {
  const info = {
    heat: { suffix: '', decimals: 2, name: 'Heat Score' },
    editVelocity: { suffix: '/day', decimals: 1, name: 'Edit Velocity' },
    revertRatio: { suffix: '%', decimals: 1, name: 'Revert Ratio' },
    uniqueEditors: { suffix: '', decimals: 0, name: 'Unique Editors' },
    anonRatio: { suffix: '%', decimals: 1, name: 'Anonymous' },
  }
  return info[selectedMetric.value] || info.heat
})

const chartOptions = computed(() => {
  // Determine date range for axis formatting
  const { start, end } = effectiveDateRange.value
  const rangeDays = (end - start) / (24 * 60 * 60 * 1000)
  const isMultiYear = rangeDays > 365
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 15, 0.95)',
        titleColor: 'rgba(255,255,255,0.9)',
        bodyColor: 'rgba(255,255,255,0.8)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 8,
        titleFont: { family: 'system-ui', size: 12, weight: '600' },
        bodyFont: { family: 'JetBrains Mono, monospace', size: 11 },
        titleMarginBottom: 8,
        callbacks: {
          title: (items) => {
            if (!items.length) return ''
            // Get the actual raw date for nice formatting
            const idx = items[0].dataIndex
            const rawDates = chartData.value?.rawDates || []
            const rawDate = rawDates[idx]
            if (rawDate) {
              const date = new Date(rawDate)
              // Always show full date in tooltip: "January 15, 2024"
              return date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })
            }
            return items[0].label || ''
          },
          label: (ctx) => {
            const { suffix, decimals } = metricInfo.value
            const value = ctx.parsed.y?.toFixed(decimals) || '0'
            return `  ${ctx.dataset.label}: ${value}${suffix}`
          },
          labelColor: (ctx) => ({
            borderColor: ctx.dataset.borderColor,
            backgroundColor: ctx.dataset.borderColor,
            borderWidth: 2,
            borderRadius: 2,
          }),
        }
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false },
        ticks: { 
          color: 'rgba(255,255,255,0.3)', 
          font: { size: 10 }, 
          maxRotation: isMultiYear ? 45 : 0,
          autoSkip: true,
          maxTicksLimit: isMultiYear ? 12 : 15,
        },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
        ticks: { 
          color: 'rgba(255,255,255,0.3)', 
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (value) => {
            const { suffix } = metricInfo.value
            return value + suffix
          }
        },
        min: 0,
        max: selectedMetric.value === 'heat' ? 1 : undefined,
      },
    },
    interaction: { intersect: false, mode: 'index' },
  }
})

// Suggestions
const addingSuggestion = ref(null)
const suggestions = ['ChatGPT', 'Taylor Swift', 'Donald Trump', 'Climate change']

// Calculate how many weeks of data to fetch based on date range
function getWeeksForDateRange() {
  const { start, end } = effectiveDateRange.value
  const diffMs = end - start
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  const diffWeeks = Math.ceil(diffDays / 7)
  // Minimum 12 weeks, maximum 1040 weeks (20 years)
  const result = Math.max(12, Math.min(diffWeeks + 4, 1040))
  
  console.log('[Dashboard getWeeksForDateRange]', { 
    start: start.toISOString(), 
    end: end.toISOString(), 
    diffDays, 
    diffWeeks,
    result 
  })
  return result
}

async function addSuggestion(title) {
  if (addingSuggestion.value || store.pages.find(p => p.title === title)) return
  addingSuggestion.value = title
  
  try {
    const pageInfo = await getPageInfo(title)
    if (!pageInfo?.exists) throw new Error('Not found')
    
    // Calculate weeks needed based on selected date range
    const weeksNeeded = getWeeksForDateRange()
    // Fetch more revisions for longer time ranges (up to 10000 for very long ranges)
    const maxRevisions = Math.min(weeksNeeded * 20, 10000)
    
    const revisions = await getAllRevisions(title, maxRevisions)
    const talkCount = await getTalkPageRevisionCount(title)
    const pageviews = await getPageviews(title, Math.min(weeksNeeded * 7, 730))
    
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
      // Generate timeline data based on selected date range
      heatTimeline: calculateHeatTimeline(revisions, {
        protectionLevel: pageInfo.protectionLevel,
        talkRevisionCount: talkCount,
        weeks: weeksNeeded,
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
      <div v-if="!hasPages" class="text-center py-12">
        <!-- Date Range Controls - Visible from start -->
        <div class="flex flex-wrap justify-center items-center gap-3 mb-12">
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
          
          <!-- Custom inputs only when Custom selected -->
          <div v-if="selectedDateRange === 'custom'" class="flex items-center gap-2 p-1 rounded-lg bg-white/[0.02] border border-white/5">
            <input
              v-model="customStartDate"
              type="date"
              class="h-7 px-2 rounded bg-transparent border-0 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <span class="text-white/30">to</span>
            <input
              v-model="customEndDate"
              type="date"
              class="h-7 px-2 rounded bg-transparent border-0 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <span v-if="customStartDate && customEndDate" class="text-xs text-white/40 ml-1">
              {{ Math.ceil((new Date(customEndDate) - new Date(customStartDate)) / (1000 * 60 * 60 * 24)) }}d
            </span>
          </div>
        </div>
        
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
            
            <!-- Date Range Presets -->
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
            
            <!-- Custom Date Range - Only shown when Custom selected -->
            <div v-if="selectedDateRange === 'custom'" class="flex items-center gap-2 p-1 rounded-lg bg-white/[0.02] border border-white/5">
              <input
                v-model="customStartDate"
                type="date"
                class="h-7 px-2 rounded bg-transparent border-0 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <span class="text-white/30">to</span>
              <input
                v-model="customEndDate"
                type="date"
                class="h-7 px-2 rounded bg-transparent border-0 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <span v-if="customStartDate && customEndDate" class="text-xs text-white/40 ml-1">
                {{ Math.ceil((new Date(customEndDate) - new Date(customStartDate)) / (1000 * 60 * 60 * 24)) }}d
              </span>
            </div>
          </div>
          
          <div class="text-xs text-white/30">
            {{ currentMetric?.description }}
          </div>
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
