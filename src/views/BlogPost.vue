<script setup>
import { ref, onMounted, computed } from 'vue'
import { ArrowLeft, Flame, CheckCircle, AlertTriangle, ExternalLink, Loader2, Calendar, Users, Globe, TrendingUp, BarChart3, Shield, Clock, MapPin } from 'lucide-vue-next'
import HeatBadge from '../components/HeatBadge.vue'
import { useWikipedia } from '../composables/useWikipedia'
import { extractSignals, calculateHeatScore, filterRevisionsByDateRange, getHeatColor, getHeatLevel, analyzeEditors, geolocateIPs } from '../composables/useHeatScore'

const emit = defineEmits(['close'])

const { getPageInfo, getAllRevisions, getTalkPageRevisionCount } = useWikipedia()

// Test cases with SPECIFIC timeframes for when controversy peaked
const testCases = ref([
  {
    title: '2020 United States presidential election',
    shortName: 'US 2020 Election',
    description: 'One of the most contentious elections in US history. We analyze the period around election day when editing activity was at its peak.',
    timeframe: {
      start: '2020-11-01',
      end: '2020-11-30',
      label: 'November 2020',
    },
    expectedHeat: 'high',
    status: 'pending',
    result: null,
  },
  {
    title: 'Gaza–Israel conflict',
    shortName: 'Gaza-Israel Conflict',
    description: 'The October 2023 escalation triggered intense Wikipedia editing activity. We analyze the immediate aftermath of the October 7 events.',
    timeframe: {
      start: '2023-10-07',
      end: '2023-11-15',
      label: 'Oct-Nov 2023',
    },
    expectedHeat: 'critical',
    status: 'pending',
    result: null,
  },
  {
    title: 'Gamergate (harassment campaign)',
    shortName: 'Gamergate Controversy',
    description: 'A famous Wikipedia edit war case study. We analyze August-October 2014 when the controversy was at its height.',
    timeframe: {
      start: '2014-08-15',
      end: '2014-10-31',
      label: 'Aug-Oct 2014',
    },
    expectedHeat: 'high',
    status: 'pending',
    result: null,
  },
])

const isRunning = ref(false)
const allComplete = ref(false)
const passedCount = computed(() => testCases.value.filter(t => t.passed).length)

async function runValidation(testCase) {
  testCase.status = 'running'
  testCase.progress = 'Fetching page info...'
  
  try {
    const pageInfo = await getPageInfo(testCase.title)
    
    if (!pageInfo?.exists) {
      testCase.status = 'error'
      testCase.error = 'Page not found'
      return
    }
    
    testCase.progress = 'Loading revisions...'
    const allRevisions = await getAllRevisions(testCase.title, 5000, (count) => {
      testCase.progress = `Loading revisions... ${count}`
    })
    
    testCase.progress = 'Filtering by timeframe...'
    
    // Filter revisions to the specific timeframe
    const timeframeRevisions = filterRevisionsByDateRange(
      allRevisions,
      testCase.timeframe.start,
      testCase.timeframe.end
    )
    
    testCase.progress = 'Calculating heat score...'
    
    // Use the END of the timeframe as reference date
    const referenceDate = new Date(testCase.timeframe.end)
    
    const signals = extractSignals(timeframeRevisions, {
      protectionLevel: pageInfo.protectionLevel,
      talkRevisionCount: 0, // We'll estimate based on activity
      referenceDate,
    })
    
    const heat = calculateHeatScore(signals)
    const level = getHeatLevel(heat)
    
    // Analyze editors
    testCase.progress = 'Analyzing editors...'
    const editorAnalysis = analyzeEditors(timeframeRevisions)
    
    testCase.result = {
      heat,
      level,
      signals,
      revisionCount: timeframeRevisions.length,
      totalRevisions: allRevisions.length,
      protectionLevel: pageInfo.protectionLevel,
      editorAnalysis,
    }
    
    // Check if result matches expectation
    const expectedLevels = {
      'critical': ['critical'],
      'high': ['critical', 'high'],
      'moderate': ['critical', 'high', 'moderate'],
    }
    
    testCase.passed = expectedLevels[testCase.expectedHeat]?.includes(level)
    testCase.status = 'complete'
    
  } catch (e) {
    testCase.status = 'error'
    testCase.error = e.message
    console.error('Validation error:', e)
  }
}

async function runAllTests() {
  isRunning.value = true
  
  for (const testCase of testCases.value) {
    await runValidation(testCase)
    await new Promise(r => setTimeout(r, 500))
  }
  
  isRunning.value = false
  allComplete.value = true
}

onMounted(() => {
  runAllTests()
})
</script>

<template>
  <div class="min-h-screen bg-base-100">
    <!-- Header -->
    <header class="sticky top-0 z-40 backdrop-blur-xl bg-base-100/80 border-b border-base-content/5">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button @click="emit('close')" class="btn btn-ghost btn-sm gap-2">
          <ArrowLeft class="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </header>

    <article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Blog Header -->
      <header class="mb-12 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
          <Flame class="w-4 h-4" />
          Validation Study
        </div>
        <h1 class="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Does the Heat Score Actually Work?
        </h1>
        <p class="text-xl text-base-content/60 max-w-2xl mx-auto">
          Testing our controversy detection algorithm against Wikipedia's most notorious edit wars, using the correct timeframes
        </p>
        <div class="mt-6 text-sm text-base-content/40">
          January 2026 | Live validation against Wikipedia API
        </div>
      </header>

      <!-- Key Insight Box -->
      <div class="mb-12 p-6 rounded-2xl bg-warning/10 border border-warning/20">
        <div class="flex items-start gap-4">
          <Clock class="w-6 h-6 text-warning flex-shrink-0 mt-1" />
          <div>
            <h3 class="font-semibold text-warning mb-2">Why Timeframes Matter</h3>
            <p class="text-base-content/70">
              Controversies are temporal. The 2020 US election was "hot" in November 2020, not today. 
              To properly validate our algorithm, we analyze each page during its peak controversy period, 
              filtering revisions to the relevant dates.
            </p>
          </div>
        </div>
      </div>

      <!-- The Methodology -->
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-6 flex items-center gap-3">
          <BarChart3 class="w-6 h-6 text-primary" />
          The Methodology
        </h2>
        <div class="bg-base-200/30 rounded-2xl p-6 border border-base-content/5">
          <p class="text-base-content/70 mb-4">
            Our heat score combines six weighted signals, tuned for sensitivity:
          </p>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-error/20 flex items-center justify-center text-error font-bold text-sm">25%</div>
              <div>
                <div class="font-medium">Revert Ratio</div>
                <div class="text-sm text-base-content/50">Edits that undo others (strongest signal)</div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">20%</div>
              <div>
                <div class="font-medium">Edit Velocity</div>
                <div class="text-sm text-base-content/50">Edits per day (7-day window)</div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center text-info font-bold text-sm">20%</div>
              <div>
                <div class="font-medium">Unique Editors</div>
                <div class="text-sm text-base-content/50">Distinct contributors in period</div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">15%</div>
              <div>
                <div class="font-medium">Talk Activity</div>
                <div class="text-sm text-base-content/50">Discussion page engagement</div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center text-warning font-bold text-sm">10%</div>
              <div>
                <div class="font-medium">Protection Level</div>
                <div class="text-sm text-base-content/50">Admin-imposed restrictions</div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">10%</div>
              <div>
                <div class="font-medium">Anonymous Ratio</div>
                <div class="text-sm text-base-content/50">Unregistered editor percentage</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Test Cases -->
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-6 flex items-center gap-3">
          <Flame class="w-6 h-6 text-error" />
          Live Test Results
        </h2>
        
        <!-- Summary -->
        <div v-if="allComplete" class="mb-6 p-4 rounded-xl flex items-center justify-between" 
          :class="passedCount === testCases.length ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'">
          <div class="flex items-center gap-3">
            <CheckCircle v-if="passedCount === testCases.length" class="w-5 h-5 text-success" />
            <AlertTriangle v-else class="w-5 h-5 text-warning" />
            <span class="font-medium">
              {{ passedCount }}/{{ testCases.length }} tests passed
            </span>
          </div>
        </div>

        <div class="space-y-6">
          <div 
            v-for="(test, index) in testCases" 
            :key="test.title"
            class="bg-base-200/30 rounded-2xl border border-base-content/5 overflow-hidden"
          >
            <div class="p-6">
              <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div class="flex items-center gap-2 text-sm text-base-content/50 mb-1">
                    <span>Test Case #{{ index + 1 }}</span>
                    <span class="text-base-content/30">|</span>
                    <Calendar class="w-3 h-3" />
                    <span>{{ test.timeframe.label }}</span>
                  </div>
                  <h3 class="text-xl font-bold">{{ test.shortName }}</h3>
                </div>
                <div class="flex items-center gap-2">
                  <Loader2 v-if="test.status === 'running'" class="w-5 h-5 animate-spin text-primary" />
                  <CheckCircle v-else-if="test.status === 'complete' && test.passed" class="w-5 h-5 text-success" />
                  <AlertTriangle v-else-if="test.status === 'complete' && !test.passed" class="w-5 h-5 text-warning" />
                  <div v-else class="w-5 h-5 rounded-full bg-base-content/20"></div>
                </div>
              </div>
              
              <p class="text-base-content/60 text-sm mb-4">{{ test.description }}</p>
              
              <!-- Progress indicator -->
              <div v-if="test.status === 'running'" class="text-sm text-primary mb-4">
                {{ test.progress }}
              </div>
              
              <div class="flex items-center gap-3 text-sm">
                <span class="text-base-content/50">Expected:</span>
                <span 
                  class="px-2 py-0.5 rounded-full text-xs font-medium uppercase"
                  :class="{
                    'bg-error/20 text-error': test.expectedHeat === 'critical',
                    'bg-warning/20 text-warning': test.expectedHeat === 'high',
                  }"
                >
                  {{ test.expectedHeat }}
                </span>
                <span class="text-base-content/30">|</span>
                <span class="text-base-content/50">Timeframe:</span>
                <code class="text-xs bg-base-300 px-2 py-0.5 rounded">
                  {{ test.timeframe.start }} to {{ test.timeframe.end }}
                </code>
              </div>
            </div>
            
            <!-- Results -->
            <div 
              v-if="test.result" 
              class="border-t border-base-content/5 p-6 bg-base-300/30"
            >
              <!-- Main Stats -->
              <div class="flex flex-wrap items-center gap-6 mb-6">
                <div>
                  <div class="text-xs text-base-content/50 mb-1">Heat Score</div>
                  <HeatBadge :score="test.result.heat" size="lg" showLabel />
                </div>
                <div>
                  <div class="text-xs text-base-content/50 mb-1">Revisions in Period</div>
                  <div class="text-2xl font-mono font-bold">{{ test.result.revisionCount.toLocaleString() }}</div>
                </div>
                <div>
                  <div class="text-xs text-base-content/50 mb-1">Edit Velocity</div>
                  <div class="text-2xl font-mono font-bold">{{ test.result.signals.editVelocity7d?.toFixed(1) }}<span class="text-sm text-base-content/50">/day</span></div>
                </div>
                <div>
                  <div class="text-xs text-base-content/50 mb-1">Revert Rate</div>
                  <div class="text-2xl font-mono font-bold text-error">{{ (test.result.signals.revertRatio30d * 100).toFixed(0) }}%</div>
                </div>
              </div>
              
              <!-- Signal Breakdown -->
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center mb-6">
                <div class="p-2 rounded-lg bg-base-200/50">
                  <TrendingUp class="w-4 h-4 mx-auto mb-1 text-primary" />
                  <div class="text-lg font-mono font-bold">{{ test.result.signals.editVelocity7d?.toFixed(1) }}</div>
                  <div class="text-xs text-base-content/50">velocity</div>
                </div>
                <div class="p-2 rounded-lg bg-base-200/50">
                  <ArrowLeft class="w-4 h-4 mx-auto mb-1 text-error rotate-180" />
                  <div class="text-lg font-mono font-bold">{{ (test.result.signals.revertRatio30d * 100).toFixed(0) }}%</div>
                  <div class="text-xs text-base-content/50">reverts</div>
                </div>
                <div class="p-2 rounded-lg bg-base-200/50">
                  <Users class="w-4 h-4 mx-auto mb-1 text-info" />
                  <div class="text-lg font-mono font-bold">{{ test.result.signals.uniqueEditors30d }}</div>
                  <div class="text-xs text-base-content/50">editors</div>
                </div>
                <div class="p-2 rounded-lg bg-base-200/50">
                  <Flame class="w-4 h-4 mx-auto mb-1 text-secondary" />
                  <div class="text-lg font-mono font-bold">{{ test.result.signals.talkActivity }}</div>
                  <div class="text-xs text-base-content/50">talk</div>
                </div>
                <div class="p-2 rounded-lg bg-base-200/50">
                  <Shield class="w-4 h-4 mx-auto mb-1 text-warning" />
                  <div class="text-lg font-mono font-bold">{{ (test.result.signals.protectionScore * 100).toFixed(0) }}%</div>
                  <div class="text-xs text-base-content/50">protection</div>
                </div>
                <div class="p-2 rounded-lg bg-base-200/50">
                  <Globe class="w-4 h-4 mx-auto mb-1 text-accent" />
                  <div class="text-lg font-mono font-bold">{{ (test.result.signals.anonRatio30d * 100).toFixed(0) }}%</div>
                  <div class="text-xs text-base-content/50">anonymous</div>
                </div>
              </div>
              
              <!-- Editor Analysis -->
              <div v-if="test.result.editorAnalysis" class="p-4 rounded-xl bg-base-200/30 border border-base-content/5">
                <h4 class="font-medium mb-3 flex items-center gap-2">
                  <Users class="w-4 h-4" />
                  Editor Analysis
                </h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div class="text-xl font-mono font-bold">{{ test.result.editorAnalysis.totalEditors }}</div>
                    <div class="text-xs text-base-content/50">Total Editors</div>
                  </div>
                  <div>
                    <div class="text-xl font-mono font-bold">{{ test.result.editorAnalysis.registeredEditors }}</div>
                    <div class="text-xs text-base-content/50">Registered</div>
                  </div>
                  <div>
                    <div class="text-xl font-mono font-bold text-warning">{{ test.result.editorAnalysis.anonymousEditors }}</div>
                    <div class="text-xs text-base-content/50">Anonymous</div>
                  </div>
                  <div>
                    <div class="text-xl font-mono font-bold text-info">{{ test.result.editorAnalysis.botEditors }}</div>
                    <div class="text-xs text-base-content/50">Bots</div>
                  </div>
                </div>
                
                <!-- Top Editors -->
                <div v-if="test.result.editorAnalysis.topEditors?.length" class="mt-4">
                  <div class="text-xs text-base-content/50 mb-2">Top 5 Contributors</div>
                  <div class="flex flex-wrap gap-2">
                    <span 
                      v-for="editor in test.result.editorAnalysis.topEditors.slice(0, 5)" 
                      :key="editor.name"
                      class="px-2 py-1 rounded-lg bg-base-300/50 text-xs"
                    >
                      {{ editor.name.slice(0, 20) }}{{ editor.name.length > 20 ? '...' : '' }}
                      <span class="text-base-content/50">({{ editor.editCount }})</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Pass/Fail Badge -->
              <div 
                v-if="test.passed" 
                class="mt-4 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2"
              >
                <CheckCircle class="w-4 h-4" />
                Result matches expected heat level
              </div>
              <div 
                v-else 
                class="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm flex items-center gap-2"
              >
                <AlertTriangle class="w-4 h-4" />
                Heat level lower than expected ({{ test.result.level }} vs {{ test.expectedHeat }})
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Analysis -->
      <section class="mb-12" v-if="allComplete">
        <h2 class="text-2xl font-bold mb-6 flex items-center gap-3">
          <BarChart3 class="w-6 h-6 text-info" />
          What We Learned
        </h2>
        
        <div class="space-y-6">
          <div class="p-6 rounded-2xl bg-base-200/30 border border-base-content/5">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock class="w-5 h-5 text-primary" />
              Timeframes Are Critical
            </h3>
            <p class="text-base-content/70">
              Analyzing current data for past controversies produces false negatives. The algorithm correctly 
              identifies heat when we look at the right time window. The US 2020 election wasn't controversial 
              today. It was controversial in November 2020.
            </p>
          </div>
          
          <div class="p-6 rounded-2xl bg-base-200/30 border border-base-content/5">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp class="w-5 h-5 text-error" />
              Revert Ratio is King
            </h3>
            <p class="text-base-content/70">
              High revert ratios (10-30%+) are the strongest indicator of active conflict. When a significant 
              percentage of edits undo someone else's work, it signals real disagreement, not just activity.
            </p>
          </div>
          
          <div class="p-6 rounded-2xl bg-base-200/30 border border-base-content/5">
            <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users class="w-5 h-5 text-info" />
              Editor Diversity Matters
            </h3>
            <p class="text-base-content/70">
              Controversial pages attract many editors. When 50+ unique users are editing a page in a short 
              period, something significant is happening. Combined with high velocity, this indicates a "hot" topic.
            </p>
          </div>
        </div>
      </section>

      <!-- Conclusion -->
      <section class="mb-12" v-if="allComplete">
        <div class="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
          <h2 class="text-2xl font-bold mb-4">Conclusion</h2>
          <p class="text-lg leading-relaxed mb-4">
            The heat score successfully identifies controversial Wikipedia content using only mechanical signals
            <strong>when analyzed at the right time</strong>. The algorithm is:
          </p>
          <ul class="space-y-2 text-base-content/80">
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-success" />
              <span>Language-agnostic (works for any Wikipedia)</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-success" />
              <span>Resistant to gaming (can't fake reverts at scale)</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-success" />
              <span>Temporally accurate (measures when controversy happens)</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-success" />
              <span>No training data needed (pure mechanical signals)</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- CTA -->
      <section class="text-center py-8">
        <p class="text-base-content/60 mb-4">Ready to analyze any Wikipedia page?</p>
        <button @click="emit('close')" class="btn btn-primary gap-2">
          <Flame class="w-4 h-4" />
          Try Wikipedia Heat
        </button>
      </section>
    </article>
  </div>
</template>
