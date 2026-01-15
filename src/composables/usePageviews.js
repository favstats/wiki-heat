import { ref } from 'vue'

const PAGEVIEWS_API = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article'

/**
 * Format a date as YYYYMMDD for the Pageviews API
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Encode a Wikipedia page title for use in URLs
 */
function encodeTitle(title) {
  return encodeURIComponent(title.replace(/ /g, '_'))
}

export function usePageviews() {
  const isLoading = ref(false)
  const error = ref(null)
  
  /**
   * Get daily pageviews for a Wikipedia article
   */
  async function getPageviews(title, days = 365) {
    isLoading.value = true
    error.value = null
    
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const encodedTitle = encodeTitle(title)
      const start = formatDate(startDate)
      const end = formatDate(endDate)
      
      const url = `${PAGEVIEWS_API}/en.wikipedia/all-access/all-agents/${encodedTitle}/daily/${start}/${end}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          // Page might not have pageview data yet
          return []
        }
        throw new Error(`Pageviews API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      return (data.items || []).map(item => ({
        date: item.timestamp.substring(0, 8), // YYYYMMDD
        views: item.views,
      }))
    } catch (e) {
      error.value = e.message
      return []
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Get pageview statistics summary
   */
  async function getPageviewStats(title, days = 30) {
    const pageviews = await getPageviews(title, days)
    
    if (pageviews.length === 0) {
      return {
        total: 0,
        average: 0,
        max: 0,
        min: 0,
        trend: 0,
      }
    }
    
    const views = pageviews.map(p => p.views)
    const total = views.reduce((a, b) => a + b, 0)
    const average = total / views.length
    const max = Math.max(...views)
    const min = Math.min(...views)
    
    // Calculate trend (compare first half to second half)
    const mid = Math.floor(views.length / 2)
    const firstHalf = views.slice(0, mid)
    const secondHalf = views.slice(mid)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const trend = firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0
    
    return {
      total,
      average: Math.round(average),
      max,
      min,
      trend,
      data: pageviews,
    }
  }
  
  return {
    isLoading,
    error,
    getPageviews,
    getPageviewStats,
  }
}
