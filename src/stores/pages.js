import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'wiki-heat-data'

// Load from localStorage
function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e)
  }
  return null
}

// Save to localStorage (without large revision arrays to save space)
function saveToStorage(data) {
  try {
    // Create a lightweight copy without the large revisions array
    const lightData = {
      ...data,
      pages: data.pages.map(page => ({
        ...page,
        // Don't store raw revisions - they're only needed for initial computation
        // Keep a small sample for the panel display
        revisions: (page.revisions || []).slice(0, 200),
      }))
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightData))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
    // Try saving with even less data
    try {
      const minimalData = {
        ...data,
        pages: data.pages.map(page => ({
          ...page,
          revisions: [], // Don't store revisions at all
        }))
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalData))
      console.log('Saved with minimal data (no revisions)')
    } catch (e2) {
      console.error('Still failed to save:', e2)
    }
  }
}

export const usePagesStore = defineStore('pages', () => {
  // Load initial state from localStorage
  const savedData = loadFromStorage()
  
  // State
  const pages = ref(savedData?.pages || [])
  const selectedPageId = ref(null)
  const settings = ref(savedData?.settings || {
    lookbackDays: 365,
    theme: 'dark',
    weights: null, // null means use defaults
  })
  
  // Date range settings - shared across components
  // Initialize with sensible defaults if not saved
  const today = new Date()
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(today.getDate() - 90)
  
  const dateRangeSettings = ref(savedData?.dateRangeSettings || {
    preset: '90d',
    customStart: ninetyDaysAgo.toISOString().split('T')[0],
    customEnd: today.toISOString().split('T')[0],
  })
  const isLoading = ref(false)
  const loadingPageId = ref(null)
  
  // Getters
  const selectedPage = computed(() => {
    if (!selectedPageId.value) return null
    return pages.value.find(p => p.id === selectedPageId.value) || null
  })
  
  const pagesSortedByHeat = computed(() => {
    return [...pages.value].sort((a, b) => {
      const heatA = a.currentHeat || 0
      const heatB = b.currentHeat || 0
      return heatB - heatA
    })
  })
  
  const totalPages = computed(() => pages.value.length)
  
  const averageHeat = computed(() => {
    if (pages.value.length === 0) return 0
    const sum = pages.value.reduce((acc, p) => acc + (p.currentHeat || 0), 0)
    return sum / pages.value.length
  })
  
  // Actions
  function addPage(pageData) {
    const existing = pages.value.find(p => p.id === pageData.id)
    if (existing) {
      // Update existing page
      Object.assign(existing, pageData)
    } else {
      // Add new page
      pages.value.push({
        ...pageData,
        addedAt: new Date().toISOString(),
      })
    }
  }
  
  function removePage(pageId) {
    const index = pages.value.findIndex(p => p.id === pageId)
    if (index !== -1) {
      pages.value.splice(index, 1)
      if (selectedPageId.value === pageId) {
        selectedPageId.value = null
      }
    }
  }
  
  function updatePage(pageId, updates) {
    const page = pages.value.find(p => p.id === pageId)
    if (page) {
      Object.assign(page, updates, {
        lastFetched: new Date().toISOString(),
      })
    }
  }
  
  function selectPage(pageId) {
    selectedPageId.value = pageId
  }
  
  function deselectPage() {
    selectedPageId.value = null
  }
  
  function setLoading(loading, pageId = null) {
    isLoading.value = loading
    loadingPageId.value = pageId
  }
  
  function updateSettings(newSettings) {
    Object.assign(settings.value, newSettings)
  }
  
  function clearAllData() {
    pages.value = []
    selectedPageId.value = null
    localStorage.removeItem(STORAGE_KEY)
  }
  
  // Persist to localStorage on changes
  watch(
    () => ({ pages: pages.value, settings: settings.value, dateRangeSettings: dateRangeSettings.value }),
    (newData) => {
      saveToStorage({
        pages: newData.pages,
        settings: newData.settings,
        dateRangeSettings: newData.dateRangeSettings,
      })
    },
    { deep: true }
  )
  
  // Helper to get weeks needed for current date range
  function getWeeksForFetch() {
    const { preset, customStart, customEnd } = dateRangeSettings.value
    const presetDays = { '30d': 30, '90d': 90, '1y': 365, '5y': 1825, 'custom': null }
    
    let days = presetDays[preset] || 90
    if (preset === 'custom' && customStart && customEnd) {
      const start = new Date(customStart)
      const end = new Date(customEnd)
      days = Math.ceil((end - start) / (24 * 60 * 60 * 1000))
    }
    
    const weeks = Math.ceil(days / 7) + 4 // Add buffer
    // Allow up to 20 years (1040 weeks) for historical analysis
    const result = Math.max(12, Math.min(weeks, 1040))
    
    console.log('[Fetch Config]', { preset, customStart, customEnd, days, weeks: result })
    return result
  }
  
  return {
    // State
    pages,
    selectedPageId,
    settings,
    dateRangeSettings,
    isLoading,
    loadingPageId,
    
    // Getters
    selectedPage,
    pagesSortedByHeat,
    totalPages,
    averageHeat,
    
    // Actions
    addPage,
    removePage,
    updatePage,
    selectPage,
    deselectPage,
    setLoading,
    updateSettings,
    clearAllData,
    getWeeksForFetch,
  }
})
