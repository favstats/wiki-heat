import { ref } from 'vue'

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'

export function useWikipedia() {
  const isSearching = ref(false)
  const searchResults = ref([])
  const error = ref(null)
  
  /**
   * Search Wikipedia for pages matching a query
   */
  async function search(query, limit = 10) {
    if (!query || query.length < 2) {
      searchResults.value = []
      return []
    }
    
    isSearching.value = true
    error.value = null
    
    try {
      const params = new URLSearchParams({
        action: 'opensearch',
        search: query,
        limit: limit.toString(),
        namespace: '0',
        format: 'json',
        origin: '*',
      })
      
      const response = await fetch(`${WIKIPEDIA_API}?${params}`)
      const data = await response.json()
      
      // opensearch returns [query, [titles], [descriptions], [urls]]
      const titles = data[1] || []
      const descriptions = data[2] || []
      
      searchResults.value = titles.map((title, i) => ({
        title,
        description: descriptions[i] || '',
      }))
      
      return searchResults.value
    } catch (e) {
      error.value = e.message
      searchResults.value = []
      return []
    } finally {
      isSearching.value = false
    }
  }
  
  /**
   * Get page information including protection status
   */
  async function getPageInfo(title) {
    try {
      const params = new URLSearchParams({
        action: 'query',
        titles: title,
        prop: 'info|revisions',
        inprop: 'protection',
        rvprop: 'timestamp',
        rvlimit: '1',
        rvdir: 'newer',
        format: 'json',
        formatversion: '2',
        origin: '*',
      })
      
      const response = await fetch(`${WIKIPEDIA_API}?${params}`)
      const data = await response.json()
      
      const pages = data.query?.pages || []
      if (pages.length === 0 || pages[0].missing) {
        return null
      }
      
      const page = pages[0]
      const protection = page.protection || []
      let protectionLevel = 'none'
      
      for (const p of protection) {
        if (p.type === 'edit') {
          protectionLevel = p.level
          break
        }
      }
      
      return {
        pageId: page.pageid,
        title: page.title,
        exists: !page.missing,
        protectionLevel,
        createdAt: page.revisions?.[0]?.timestamp,
      }
    } catch (e) {
      error.value = e.message
      return null
    }
  }
  
  /**
   * Get revision history for a page
   */
  async function getRevisions(title, limit = 500, continueToken = null) {
    try {
      const params = new URLSearchParams({
        action: 'query',
        titles: title,
        prop: 'revisions',
        rvprop: 'ids|timestamp|user|userid|size|comment|flags|anon',
        rvlimit: limit.toString(),
        rvdir: 'older',
        format: 'json',
        formatversion: '2',
        origin: '*',
      })
      
      if (continueToken) {
        params.set('rvcontinue', continueToken)
      }
      
      const response = await fetch(`${WIKIPEDIA_API}?${params}`)
      const data = await response.json()
      
      const pages = data.query?.pages || []
      if (pages.length === 0) {
        return { revisions: [], continueToken: null }
      }
      
      const rawRevisions = pages[0].revisions || []
      
      const revisions = rawRevisions.map((rev, index, arr) => {
        // Calculate size delta
        const prevSize = index < arr.length - 1 ? arr[index + 1].size : rev.size
        const sizeDelta = rev.size - prevSize
        
        // Check if it's a revert
        const comment = (rev.comment || '').toLowerCase()
        const isRevert = ['revert', 'rv ', 'rvv', 'undid', 'undo', 'rollback'].some(
          keyword => comment.includes(keyword)
        )
        
        // Check if anonymous - use the anon flag from API, or check userid
        // In formatversion=2, anon is a boolean true if present
        const isAnon = rev.anon === true || rev.anon === '' || !rev.userid || rev.userid === 0
        
        return {
          revId: rev.revid,
          timestamp: rev.timestamp,
          user: rev.user,
          userId: rev.userid,
          size: rev.size,
          sizeDelta,
          comment: rev.comment || '',
          isMinor: !!rev.minor,
          isRevert,
          isAnon,
        }
      })
      
      return {
        revisions,
        continueToken: data.continue?.rvcontinue || null,
      }
    } catch (e) {
      error.value = e.message
      return { revisions: [], continueToken: null }
    }
  }
  
  /**
   * Get all revisions (paginating through all results)
   */
  async function getAllRevisions(title, maxRevisions = 2000, onProgress = null) {
    const allRevisions = []
    let continueToken = null
    let iteration = 0
    
    do {
      const { revisions, continueToken: nextToken } = await getRevisions(
        title,
        500,
        continueToken
      )
      
      allRevisions.push(...revisions)
      continueToken = nextToken
      iteration++
      
      if (onProgress) {
        onProgress(allRevisions.length)
      }
      
      // Safety limit
      if (allRevisions.length >= maxRevisions || iteration > 10) {
        break
      }
      
      // Small delay to be nice to the API
      if (continueToken) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } while (continueToken)
    
    return allRevisions
  }
  
  /**
   * Get talk page info
   */
  async function getTalkPageRevisionCount(title) {
    try {
      const talkTitle = `Talk:${title}`
      const params = new URLSearchParams({
        action: 'query',
        titles: talkTitle,
        prop: 'revisions',
        rvprop: 'ids',
        rvlimit: '500',
        format: 'json',
        formatversion: '2',
        origin: '*',
      })
      
      const response = await fetch(`${WIKIPEDIA_API}?${params}`)
      const data = await response.json()
      
      const pages = data.query?.pages || []
      if (pages.length === 0 || pages[0].missing) {
        return 0
      }
      
      return pages[0].revisions?.length || 0
    } catch (e) {
      return 0
    }
  }
  
  return {
    isSearching,
    searchResults,
    error,
    search,
    getPageInfo,
    getRevisions,
    getAllRevisions,
    getTalkPageRevisionCount,
  }
}
