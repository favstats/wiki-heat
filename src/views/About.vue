<script setup>
import { ArrowLeft, Flame, Github, Globe, Coffee, CreditCard, ExternalLink, TrendingUp, RotateCcw, Users, Shield, MessageSquare } from 'lucide-vue-next'

const emit = defineEmits(['close'])
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0f]">
    <!-- Header -->
    <header class="border-b border-white/[0.03]">
      <div class="max-w-2xl mx-auto px-6 py-4">
        <button @click="emit('close')" class="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors">
          <ArrowLeft class="w-4 h-4" />
          Back
        </button>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-6 py-12">
      <!-- Logo & Title -->
      <div class="text-center mb-12">
        <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-rose-500/80 to-orange-500/80 flex items-center justify-center">
          <Flame class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-medium text-white/90 mb-2">Wikipedia Heat</h1>
        <p class="text-sm text-white/40">Controversy Index for Wikipedia</p>
      </div>

      <!-- What it does -->
      <section class="mb-10">
        <h2 class="text-xs uppercase tracking-wider text-white/30 mb-4">What is this?</h2>
        <div class="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 text-sm text-white/60 leading-relaxed">
          <p>
            Wikipedia Heat measures how contested or actively disputed a Wikipedia page is by analyzing 
            its editing patterns over time.
          </p>
          <p>
            The tool looks at edit frequency, how often changes get reverted, how many different people 
            are editing, and other signals to produce a heat score between 0 and 1. Higher scores mean 
            more activity and potential controversy.
          </p>
          <p>
            Everything runs in your browser. Data comes directly from Wikipedia's public APIs and is 
            stored locally on your device.
          </p>
        </div>
      </section>

      <!-- Signals -->
      <section class="mb-10">
        <h2 class="text-xs uppercase tracking-wider text-white/30 mb-4">Measured Signals</h2>
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <TrendingUp class="w-4 h-4 text-violet-400 mb-2" />
            <div class="text-sm text-white/70">Edit Velocity</div>
            <div class="text-xs text-white/30">Edits per day</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <RotateCcw class="w-4 h-4 text-rose-400 mb-2" />
            <div class="text-sm text-white/70">Revert Ratio</div>
            <div class="text-xs text-white/30">Undone changes</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Users class="w-4 h-4 text-emerald-400 mb-2" />
            <div class="text-sm text-white/70">Unique Editors</div>
            <div class="text-xs text-white/30">Contributors</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <MessageSquare class="w-4 h-4 text-sky-400 mb-2" />
            <div class="text-sm text-white/70">Talk Activity</div>
            <div class="text-xs text-white/30">Discussion edits</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Shield class="w-4 h-4 text-amber-400 mb-2" />
            <div class="text-sm text-white/70">Protection</div>
            <div class="text-xs text-white/30">Admin restrictions</div>
          </div>
          <div class="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Globe class="w-4 h-4 text-pink-400 mb-2" />
            <div class="text-sm text-white/70">Anonymous</div>
            <div class="text-xs text-white/30">Unregistered edits</div>
          </div>
        </div>
      </section>

      <!-- Author -->
      <section class="mb-10">
        <h2 class="text-xs uppercase tracking-wider text-white/30 mb-4">Created by</h2>
        <div class="p-5 rounded-xl bg-white/[0.02] border border-white/5">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center text-lg font-medium text-white/70">
              FV
            </div>
            <div>
              <div class="text-white/80 font-medium">Fabio Votta</div>
              <a 
                href="https://favstats.eu/" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
              >
                favstats.eu
                <ExternalLink class="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Support -->
      <section class="mb-10">
        <h2 class="text-xs uppercase tracking-wider text-white/30 mb-4">Support this project</h2>
        <div class="flex flex-col sm:flex-row gap-3">
          <a 
            href="https://www.buymeacoffee.com/favstats" 
            target="_blank" 
            rel="noopener noreferrer"
            class="flex-1 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all flex items-center justify-center gap-3"
          >
            <Coffee class="w-5 h-5 text-amber-400" />
            <span class="text-sm text-amber-300">Buy Me a Coffee</span>
          </a>
          <a 
            href="https://paypal.me/FVotta" 
            target="_blank" 
            rel="noopener noreferrer"
            class="flex-1 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-all flex items-center justify-center gap-3"
          >
            <CreditCard class="w-5 h-5 text-blue-400" />
            <span class="text-sm text-blue-300">PayPal</span>
          </a>
        </div>
      </section>

      <!-- Links -->
      <section>
        <h2 class="text-xs uppercase tracking-wider text-white/30 mb-4">Links</h2>
        <div class="flex flex-wrap gap-2">
          <a 
            href="https://github.com/favstats" 
            target="_blank" 
            rel="noopener noreferrer"
            class="px-4 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all flex items-center gap-2 text-sm text-white/50 hover:text-white/70"
          >
            <Github class="w-4 h-4" />
            GitHub
          </a>
          <a 
            href="https://bsky.app/profile/favstats.eu" 
            target="_blank" 
            rel="noopener noreferrer"
            class="px-4 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all flex items-center gap-2 text-sm text-white/50 hover:text-white/70"
          >
            <Globe class="w-4 h-4" />
            Bluesky
          </a>
          <a 
            href="https://favstats.eu/" 
            target="_blank" 
            rel="noopener noreferrer"
            class="px-4 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all flex items-center gap-2 text-sm text-white/50 hover:text-white/70"
          >
            <ExternalLink class="w-4 h-4" />
            Website
          </a>
        </div>
      </section>

      <!-- Footer -->
      <div class="mt-12 pt-6 border-t border-white/5 text-center text-xs text-white/20">
        Data from Wikipedia and Wikimedia APIs. All processing happens in your browser.
      </div>
    </main>
  </div>
</template>
