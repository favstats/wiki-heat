<script setup>
import { ref } from 'vue'
import Dashboard from './views/Dashboard.vue'
import Settings from './views/Settings.vue'
import About from './views/About.vue'

const currentView = ref('dashboard') // 'dashboard', 'settings', 'about'

function openSettings() {
  currentView.value = 'settings'
}

function openAbout() {
  currentView.value = 'about'
}

function goBack() {
  currentView.value = 'dashboard'
}
</script>

<template>
  <div class="min-h-screen bg-base-100">
    <!-- Background gradient -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
    </div>
    
    <!-- Main content -->
    <div class="relative z-10">
      <Transition name="fade" mode="out-in">
        <Settings v-if="currentView === 'settings'" key="settings" @close="goBack" />
        <About v-else-if="currentView === 'about'" key="about" @close="goBack" />
        <Dashboard v-else key="dashboard" @open-settings="openSettings" @open-about="openAbout" />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
