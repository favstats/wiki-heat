/**
 * Heat Score Calculation v2
 * 
 * Computes a "heat" score (0-1) based on mechanical signals from Wikipedia revision data.
 * Higher scores indicate more controversial or actively-disputed content.
 * 
 * IMPROVED: More sensitive thresholds and better weighting
 */

export const DEFAULT_WEIGHTS = {
  editVelocity: 0.20,
  revertRatio: 0.25,  // Increased - reverts are strong controversy signal
  uniqueEditors: 0.20,
  talkActivity: 0.15,
  protection: 0.10,
  anonRatio: 0.10,
}

// More sensitive thresholds for normalization
const THRESHOLDS = {
  editVelocity: 5,    // 5+ edits/day is high (was 10)
  uniqueEditors: 30,  // 30+ editors is high (was 50)
  talkActivity: 50,   // 50+ talk edits is high (was 100)
}

/**
 * Parse a timestamp string into a Date object
 */
function parseTimestamp(timestamp) {
  return new Date(timestamp)
}

/**
 * Filter revisions to a specific date range
 */
export function filterRevisionsByDateRange(revisions, startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  return revisions.filter(r => {
    const date = parseTimestamp(r.timestamp)
    return date >= start && date <= end
  })
}

/**
 * Check if a date is within the last N days from a reference date
 */
function isWithinDays(timestamp, days, referenceDate = new Date()) {
  const date = parseTimestamp(timestamp)
  const cutoff = new Date(referenceDate)
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff && date <= referenceDate
}

/**
 * Calculate protection score from protection level
 */
function getProtectionScore(level) {
  const scores = {
    'none': 0,
    'autoconfirmed': 0.4,  // Increased
    'extendedconfirmed': 0.6,
    'templateeditor': 0.7,
    'sysop': 1.0,  // Full protection = max score
  }
  return scores[level?.toLowerCase()] || 0
}

/**
 * Normalize a value to 0-1 range with exponential scaling for sensitivity
 */
function normalize(value, threshold) {
  if (threshold <= 0) return 0
  // Use sqrt for more sensitivity at lower values
  const ratio = value / threshold
  return Math.min(Math.sqrt(ratio), 1)
}

/**
 * Extract signals from revision data within a specific window
 */
export function extractSignals(revisions, options = {}) {
  const {
    protectionLevel = 'none',
    talkRevisionCount = 0,
    referenceDate = new Date(),
    windowDays = { short: 7, long: 30 },
  } = options
  
  if (!revisions || revisions.length === 0) {
    return {
      editCount7d: 0,
      editCount30d: 0,
      uniqueEditors7d: 0,
      uniqueEditors30d: 0,
      revertCount7d: 0,
      revertCount30d: 0,
      revertRatio7d: 0,
      revertRatio30d: 0,
      anonCount30d: 0,
      anonRatio30d: 0,
      protectionScore: getProtectionScore(protectionLevel),
      talkActivity: talkRevisionCount,
      editVelocity7d: 0,
      totalRevisions: 0,
    }
  }
  
  // Filter revisions by time window relative to reference date
  const revisions7d = revisions.filter(r => isWithinDays(r.timestamp, windowDays.short, referenceDate))
  const revisions30d = revisions.filter(r => isWithinDays(r.timestamp, windowDays.long, referenceDate))
  
  // Edit counts
  const editCount7d = revisions7d.length
  const editCount30d = revisions30d.length
  
  // Unique editors
  const editors7d = new Set(revisions7d.map(r => r.user))
  const editors30d = new Set(revisions30d.map(r => r.user))
  
  // Revert counts - also check for 7-day window
  const revertCount7d = revisions7d.filter(r => r.isRevert).length
  const revertCount30d = revisions30d.filter(r => r.isRevert).length
  const revertRatio7d = editCount7d > 0 ? revertCount7d / editCount7d : 0
  const revertRatio30d = editCount30d > 0 ? revertCount30d / editCount30d : 0
  
  // Anonymous edits
  const anonCount30d = revisions30d.filter(r => r.isAnon).length
  const anonRatio30d = editCount30d > 0 ? anonCount30d / editCount30d : 0
  
  return {
    editCount7d,
    editCount30d,
    uniqueEditors7d: editors7d.size,
    uniqueEditors30d: editors30d.size,
    revertCount7d,
    revertCount30d,
    revertRatio7d,
    revertRatio30d,
    anonCount30d,
    anonRatio30d,
    protectionScore: getProtectionScore(protectionLevel),
    talkActivity: talkRevisionCount,
    editVelocity7d: editCount7d / windowDays.short,
    totalRevisions: revisions.length,
  }
}

/**
 * Calculate composite heat score from signals
 */
export function calculateHeatScore(signals, customWeights = null) {
  const weights = customWeights || DEFAULT_WEIGHTS
  
  // Normalize each signal with more sensitive thresholds
  const normVelocity = normalize(signals.editVelocity7d, THRESHOLDS.editVelocity)
  
  // Revert ratio - use higher of 7d or 30d, already 0-1
  const revertRatio = Math.max(signals.revertRatio7d || 0, signals.revertRatio30d || 0)
  // Apply exponential to make high revert ratios stand out more
  const normRevert = Math.pow(revertRatio, 0.7)
  
  const normEditors = normalize(signals.uniqueEditors30d, THRESHOLDS.uniqueEditors)
  const normTalk = normalize(signals.talkActivity, THRESHOLDS.talkActivity)
  const normProtection = signals.protectionScore
  
  // Anonymous ratio - slightly boost importance
  const normAnon = Math.pow(signals.anonRatio30d || 0, 0.8)
  
  // Calculate weighted sum
  const heat = (
    weights.editVelocity * normVelocity +
    weights.revertRatio * normRevert +
    weights.uniqueEditors * normEditors +
    weights.talkActivity * normTalk +
    weights.protection * normProtection +
    weights.anonRatio * normAnon
  )
  
  // Apply slight boost to spread out the scores
  const boostedHeat = Math.pow(heat, 0.85)
  
  return Math.min(Math.max(boostedHeat, 0), 1)
}

/**
 * Calculate heat score with explicit custom weights (for settings page)
 */
export function calculateHeatScoreWithWeights(signals, weights) {
  return calculateHeatScore(signals, weights)
}

/**
 * Get individual normalized signal values for display
 */
export function getNormalizedSignals(signals) {
  const normVelocity = normalize(signals.editVelocity7d, THRESHOLDS.editVelocity)
  const revertRatio = Math.max(signals.revertRatio7d || 0, signals.revertRatio30d || 0)
  const normRevert = Math.pow(revertRatio, 0.7)
  const normEditors = normalize(signals.uniqueEditors30d, THRESHOLDS.uniqueEditors)
  const normTalk = normalize(signals.talkActivity, THRESHOLDS.talkActivity)
  const normProtection = signals.protectionScore
  const normAnon = Math.pow(signals.anonRatio30d || 0, 0.8)
  
  return {
    editVelocity: { raw: signals.editVelocity7d, normalized: normVelocity },
    revertRatio: { raw: revertRatio, normalized: normRevert },
    uniqueEditors: { raw: signals.uniqueEditors30d, normalized: normEditors },
    talkActivity: { raw: signals.talkActivity, normalized: normTalk },
    protection: { raw: signals.protectionScore, normalized: normProtection },
    anonRatio: { raw: signals.anonRatio30d || 0, normalized: normAnon },
  }
}

/**
 * Calculate heat scores over time (weekly snapshots)
 */
export function calculateHeatTimeline(revisions, options = {}) {
  const {
    protectionLevel = 'none',
    talkRevisionCount = 0,
    weeks = 12,
    endDate = new Date(),
  } = options
  
  const timeline = []
  
  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(endDate)
    weekEnd.setDate(weekEnd.getDate() - (i * 7))
    
    // Filter revisions up to this point in time
    const revisionsToDate = revisions.filter(r => {
      const date = parseTimestamp(r.timestamp)
      return date <= weekEnd
    })
    
    const signals = extractSignals(revisionsToDate, {
      protectionLevel,
      talkRevisionCount,
      referenceDate: weekEnd,
    })
    
    const heat = calculateHeatScore(signals)
    
    timeline.unshift({
      date: weekEnd.toISOString().split('T')[0],
      heat,
      signals,
    })
  }
  
  return timeline
}

/**
 * Get heat level label
 */
export function getHeatLevel(score) {
  if (score >= 0.6) return 'critical'
  if (score >= 0.4) return 'high'
  if (score >= 0.2) return 'moderate'
  return 'low'
}

/**
 * Get heat color (for styling)
 */
export function getHeatColor(score) {
  if (score >= 0.6) return '#ef4444' // red
  if (score >= 0.4) return '#f59e0b' // amber
  if (score >= 0.2) return '#eab308' // yellow
  return '#22c55e' // green
}

/**
 * Analyze editors and their origins
 */
export function analyzeEditors(revisions) {
  const editorStats = {}
  const ipEditors = []
  
  for (const rev of revisions) {
    const user = rev.user || 'Unknown'
    
    if (!editorStats[user]) {
      editorStats[user] = {
        name: user,
        editCount: 0,
        revertCount: 0,
        firstEdit: rev.timestamp,
        lastEdit: rev.timestamp,
        isAnon: rev.isAnon,
        isBot: user.toLowerCase().includes('bot'),
      }
    }
    
    editorStats[user].editCount++
    if (rev.isRevert) editorStats[user].revertCount++
    editorStats[user].lastEdit = rev.timestamp
    
    // Collect IP addresses for geolocation
    if (rev.isAnon && isValidIP(user)) {
      ipEditors.push({
        ip: user,
        timestamp: rev.timestamp,
        isRevert: rev.isRevert,
      })
    }
  }
  
  const editors = Object.values(editorStats)
  const topEditors = editors.sort((a, b) => b.editCount - a.editCount).slice(0, 20)
  
  const summary = {
    totalEditors: editors.length,
    anonymousEditors: editors.filter(e => e.isAnon).length,
    botEditors: editors.filter(e => e.isBot).length,
    registeredEditors: editors.filter(e => !e.isAnon && !e.isBot).length,
    topEditors,
    ipEditors,
  }
  
  return summary
}

/**
 * Check if a string looks like an IP address
 */
function isValidIP(str) {
  // IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 (simplified)
  const ipv6 = /^[0-9a-fA-F:]+$/
  return ipv4.test(str) || (ipv6.test(str) && str.includes(':'))
}

/**
 * Geolocate IP addresses using ip-api.com (free, no key needed)
 */
export async function geolocateIPs(ips, onProgress = null) {
  const uniqueIPs = [...new Set(ips)]
  const results = []
  
  // ip-api allows batch requests of up to 100
  const batchSize = 100
  
  for (let i = 0; i < uniqueIPs.length; i += batchSize) {
    const batch = uniqueIPs.slice(i, i + batchSize)
    
    try {
      const response = await fetch('http://ip-api.com/batch?fields=status,country,countryCode,city,query', {
        method: 'POST',
        body: JSON.stringify(batch),
      })
      
      if (response.ok) {
        const data = await response.json()
        results.push(...data.filter(d => d.status === 'success'))
      }
    } catch (e) {
      console.warn('IP geolocation failed:', e)
    }
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, uniqueIPs.length), uniqueIPs.length)
    }
    
    // Rate limit: ip-api allows 45 requests per minute
    if (i + batchSize < uniqueIPs.length) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }
  
  return results
}

export function useHeatScore() {
  return {
    DEFAULT_WEIGHTS,
    extractSignals,
    calculateHeatScore,
    calculateHeatScoreWithWeights,
    calculateHeatTimeline,
    filterRevisionsByDateRange,
    getHeatLevel,
    getHeatColor,
    analyzeEditors,
    geolocateIPs,
    getNormalizedSignals,
  }
}
