<template>
  <div class="ac-sidebar" :class="{ 'is-open': isOpen }">
    <header class="ac-sidebar-header">
      <div class="ac-sidebar-brand">
        <div class="ac-logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="ac-brand-text">
          <span class="ac-brand-name">AMAN CHAT</span>
          <span class="ac-brand-tagline">part of amankerja.com</span>
        </div>
      </div>
      <button class="ac-btn secondary sm" @click="closeSidebar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </header>

    <nav class="ac-sidebar-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="ac-nav-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </nav>

    <main class="ac-sidebar-content">
      <DashboardTab v-if="activeTab === 'dashboard'" />
      <TemplatesTab v-else-if="activeTab === 'templates'" />
      <AutoReplyTab v-else-if="activeTab === 'autoreply'" />
      <BroadcastTab v-else-if="activeTab === 'broadcast'" />
      <CRMTab v-else-if="activeTab === 'crm'" />
      <SettingsTab v-else-if="activeTab === 'settings'" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DashboardTab from './tabs/DashboardTab.vue'
import TemplatesTab from './tabs/TemplatesTab.vue'
import AutoReplyTab from './tabs/AutoReplyTab.vue'
import BroadcastTab from './tabs/BroadcastTab.vue'
import CRMTab from './tabs/CRMTab.vue'
import SettingsTab from './tabs/SettingsTab.vue'

const isOpen = ref(true)
const activeTab = ref('dashboard')

const tabs = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'templates', name: 'Template' },
  { id: 'autoreply', name: 'Auto Reply' },
  { id: 'broadcast', name: 'Broadcast' },
  { id: 'crm', name: 'CRM' },
  { id: 'settings', name: 'Pengaturan' }
]

function closeSidebar() {
  isOpen.value = false
}

onMounted(() => {
  console.log('[AMAN CHAT] Sidebar component mounted')
})
</script>

<style scoped>
.ac-sidebar {
  height: calc(100vh - 44px);
  top: 44px;
}
</style>
