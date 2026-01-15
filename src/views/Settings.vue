<script setup>
import { ref, computed } from 'vue'
import { ArrowLeft, Flame, RotateCcw, Save, Sliders, TrendingUp, Users, Shield, Globe, MessageSquare } from 'lucide-vue-next'
import { usePagesStore } from '../stores/pages'

const emit = defineEmits(['close'])
const store = usePagesStore()

const DEFAULT_WEIGHTS = {
  editVelocity: 0.20,
  revertRatio: 0.25,
  uniqueEditors: 0.20,
  talkActivity: 0.15,
  protection: 0.10,
  anonRatio: 0.10,
}

const weights = ref({ ...store.settings.weights || DEFAULT_WEIGHTS })

const totalWeight = computed(() => Object.values(weights.value).reduce((a, b) => a + b, 0))
const isValid = computed(() => Math.abs(totalWeight.value - 1) < 0.01)

const signalInfo = [
  { key: 'editVelocity', name: 'Edit Velocity', icon: TrendingUp, description: 'Edits per day over a 7 day window' },
  { key: 'revertRatio', name: 'Revert Ratio', icon: RotateCcw, description: 'Percentage of edits that undo previous changes' },
  { key: 'uniqueEditors', name: 'Unique Editors', icon: Users, description: 'Number of distinct contributors' },
  { key: 'talkActivity', name: 'Talk Activity', icon: MessageSquare, description: 'Discussion page engagement' },
  { key: 'protection', name: 'Protection', icon: Shield, description: 'Admin imposed restrictions' },
  { key: 'anonRatio', name: 'Anonymous', icon: Globe, description: 'Edits from unregistered IPs' },
]

const presets = [
  { name: 'Balanced', weights: { ...DEFAULT_WEIGHTS } },
  { name: 'Conflict', weights: { editVelocity: 0.15, revertRatio: 0.40, uniqueEditors: 0.15, talkActivity: 0.15, protection: 0.10, anonRatio: 0.05 } },
  { name: 'Activity', weights: { editVelocity: 0.35, revertRatio: 0.15, uniqueEditors: 0.25, talkActivity: 0.10, protection: 0.05, anonRatio: 0.10 } },
  { name: 'Suspicious', weights: { editVelocity: 0.15, revertRatio: 0.20, uniqueEditors: 0.10, talkActivity: 0.10, protection: 0.15, anonRatio: 0.30 } },
]

function updateWeight(key, value) {
  weights.value[key] = parseFloat(value) || 0
}

function applyPreset(preset) {
  weights.value = { ...preset.weights }
}

function normalizeWeights() {
  const total = totalWeight.value
  if (total > 0) {
    for (const key in weights.value) {
      weights.value[key] = weights.value[key] / total
    }
  }
}

function resetToDefaults() {
  weights.value = { ...DEFAULT_WEIGHTS }
}

function saveSettings() {
  store.updateSettings({ weights: { ...weights.value } })
  emit('close')
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0f]">
    <!-- Header -->
    <header class="border-b border-white/[0.03]">
      <div class="max-w-2xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <button @click="emit('close')" class="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors">
            <ArrowLeft class="w-4 h-4" />
            Back
          </button>
          <button 
            @click="saveSettings" 
            :disabled="!isValid"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            :class="isValid ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30' : 'bg-white/5 text-white/20 cursor-not-allowed'"
          >
            Save
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-6 py-8">
      <!-- Title -->
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-2">
          <Sliders class="w-5 h-5 text-violet-400" />
          <h1 class="text-xl font-medium text-white/90">Index Weights</h1>
        </div>
        <p class="text-sm text-white/40">
          Adjust how each signal contributes to the heat score
        </p>
      </div>

      <!-- Validation -->
      <div 
        class="mb-6 p-3 rounded-lg text-sm flex items-center justify-between"
        :class="isValid ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'"
      >
        <span :class="isValid ? 'text-emerald-400' : 'text-amber-400'">
          Total: {{ (totalWeight * 100).toFixed(0) }}%
          <span v-if="!isValid"> (must be 100%)</span>
        </span>
        <button v-if="!isValid" @click="normalizeWeights" class="text-xs text-white/50 hover:text-white/70">
          Normalize
        </button>
      </div>

      <!-- Presets -->
      <div class="mb-8">
        <div class="text-xs uppercase tracking-wider text-white/30 mb-3">Presets</div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in presets"
            :key="preset.name"
            @click="applyPreset(preset)"
            class="px-3 py-1.5 rounded-lg text-xs text-white/50 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:text-white/70 transition-all"
          >
            {{ preset.name }}
          </button>
        </div>
      </div>

      <!-- Weights -->
      <div class="space-y-4">
        <div 
          v-for="signal in signalInfo" 
          :key="signal.key"
          class="p-4 rounded-xl bg-white/[0.01] border border-white/5"
        >
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex items-center gap-3">
              <component :is="signal.icon" class="w-4 h-4 text-white/30" />
              <div>
                <div class="text-sm text-white/80">{{ signal.name }}</div>
                <div class="text-xs text-white/30">{{ signal.description }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="number"
                :value="(weights[signal.key] * 100).toFixed(0)"
                @input="updateWeight(signal.key, $event.target.value / 100)"
                min="0"
                max="100"
                step="5"
                class="w-16 h-8 px-2 rounded-lg bg-white/[0.02] border border-white/5 text-right text-sm font-mono text-white/70"
              />
              <span class="text-xs text-white/30">%</span>
            </div>
          </div>
          
          <input
            type="range"
            :value="weights[signal.key] * 100"
            @input="updateWeight(signal.key, $event.target.value / 100)"
            min="0"
            max="50"
            step="1"
            class="w-full"
          />
        </div>
      </div>

      <!-- Reset -->
      <div class="mt-8 text-center">
        <button @click="resetToDefaults" class="text-xs text-white/30 hover:text-white/50 transition-colors">
          Reset to defaults
        </button>
      </div>

      <!-- Formula -->
      <div class="mt-8 p-4 rounded-xl bg-white/[0.01] border border-white/5">
        <div class="flex items-center gap-2 mb-3">
          <Flame class="w-4 h-4 text-rose-400" />
          <span class="text-sm text-white/60">Formula</span>
        </div>
        <div class="font-mono text-xs text-white/40 leading-relaxed">
          heat = 
          <span class="text-violet-400">{{ (weights.editVelocity).toFixed(2) }}</span>v + 
          <span class="text-rose-400">{{ (weights.revertRatio).toFixed(2) }}</span>r + 
          <span class="text-emerald-400">{{ (weights.uniqueEditors).toFixed(2) }}</span>e + 
          <span class="text-sky-400">{{ (weights.talkActivity).toFixed(2) }}</span>t + 
          <span class="text-amber-400">{{ (weights.protection).toFixed(2) }}</span>p + 
          <span class="text-pink-400">{{ (weights.anonRatio).toFixed(2) }}</span>a
        </div>
      </div>
    </main>
  </div>
</template>
