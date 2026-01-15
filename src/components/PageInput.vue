<script setup>
import { ref, watch, computed } from 'vue'
import { Search, Plus, Loader2, X } from 'lucide-vue-next'
import { useWikipedia } from '../composables/useWikipedia'
import { usePageviews } from '../composables/usePageviews'
import { extractSignals, calculateHeatScore, calculateHeatTimeline } from '../composables/useHeatScore'
import { usePagesStore } from '../stores/pages'

const emit = defineEmits(['added'])

const store = usePagesStore()
const { search, isSearching, searchResults, getPageInfo, getAllRevisions, getTalkPageRevisionCount } = useWikipedia()
const { getPageviews } = usePageviews()

const query = ref('')
const showResults = ref(false)
const isAdding = ref(false)
const addingTitle = ref('')
const progress = ref('')

let searchTimeout = null
watch(query, (val) => {
  clearTimeout(searchTimeout)
  if (val.length >= 2) {
    searchTimeout = setTimeout(() => {
      search(val)
      showResults.value = true
    }, 300)
  } else {
    showResults.value = false
  }
})

async function addPage(title) {
  if (isAdding.value) return
  
  isAdding.value = true
  addingTitle.value = title
  query.value = ''
  showResults.value = false
  
  try {
    progress.value = 'Fetching metadata...'
    const pageInfo = await getPageInfo(title)
    if (!pageInfo?.exists) throw new Error('Page not found')
    
    // Get weeks needed based on selected date range
    const weeksNeeded = store.getWeeksForFetch()
    // Allow more revisions for longer ranges (up to 10000)
    const maxRevisions = Math.min(weeksNeeded * 20, 10000)
    // Pageviews API only allows ~2 years max
    const pageviewDays = Math.min(weeksNeeded * 7, 730)
    
    progress.value = 'Loading revisions...'
    const revisions = await getAllRevisions(title, maxRevisions, (count) => {
      progress.value = `${count} revisions...`
    })
    
    const talkCount = await getTalkPageRevisionCount(title)
    const pageviews = await getPageviews(title, pageviewDays)
    
    progress.value = 'Computing index...'
    const signals = extractSignals(revisions, {
      protectionLevel: pageInfo.protectionLevel,
      talkRevisionCount: talkCount,
    })
    
    store.addPage({
      id: `${title}_${Date.now()}`,
      title: pageInfo.title,
      pageId: pageInfo.pageId,
      protectionLevel: pageInfo.protectionLevel,
      revisions,
      pageviews,
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
    
    emit('added', title)
  } catch (e) {
    console.error('Failed:', e)
  } finally {
    isAdding.value = false
    addingTitle.value = ''
    progress.value = ''
  }
}

function clearSearch() {
  query.value = ''
  showResults.value = false
}
</script>

<template>
  <div class="relative w-full max-w-xl mx-auto">
    <!-- Search Input -->
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search class="w-4 h-4 text-white/25" />
      </div>
      
      <input
        v-model="query"
        type="text"
        placeholder="Search Wikipedia pages..."
        class="w-full h-11 pl-11 pr-10 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-white/90 placeholder:text-white/25 focus:border-violet-500/40 focus:bg-white/[0.03] transition-all"
        :disabled="isAdding"
        @focus="showResults = query.length >= 2"
      />
      
      <div v-if="query" class="absolute inset-y-0 right-0 pr-3 flex items-center">
        <button @click="clearSearch" class="p-1 rounded hover:bg-white/10 transition-colors">
          <X class="w-3 h-3 text-white/30" />
        </button>
      </div>
    </div>
    
    <!-- Loading indicator -->
    <div v-if="isAdding" class="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
      <div class="flex items-center gap-3">
        <Loader2 class="w-4 h-4 text-violet-400 animate-spin" />
        <div class="text-sm">
          <span class="text-white/70">{{ addingTitle }}</span>
          <span class="text-white/30 ml-2">{{ progress }}</span>
        </div>
      </div>
    </div>
    
    <!-- Results -->
    <div 
      v-if="showResults && !isAdding && searchResults.length > 0"
      class="absolute z-50 w-full mt-2 py-1 rounded-xl bg-[#111116] border border-white/5 shadow-2xl max-h-72 overflow-auto"
    >
      <button
        v-for="result in searchResults"
        :key="result.title"
        class="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left"
        @click="addPage(result.title)"
      >
        <div class="min-w-0 flex-1">
          <div class="text-sm text-white/80 truncate">{{ result.title }}</div>
          <div v-if="result.description" class="text-xs text-white/30 truncate mt-0.5">
            {{ result.description }}
          </div>
        </div>
        <Plus class="w-4 h-4 text-white/20 flex-shrink-0 ml-3" />
      </button>
    </div>
    
    <div 
      v-if="showResults && !isSearching && searchResults.length === 0 && query.length >= 2"
      class="absolute z-50 w-full mt-2 p-4 rounded-xl bg-[#111116] border border-white/5 text-center text-sm text-white/30"
    >
      No results for "{{ query }}"
    </div>
  </div>
</template>
