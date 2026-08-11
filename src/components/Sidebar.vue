<template>
  <div class="ac-sidebar" :class="{ 'is-open': sidebarState.isOpen }">
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
      <div style="display: flex; gap: 4px; align-items: center;">
        <button class="ac-btn secondary sm" style="padding: 3px 8px; font-size: 0.7rem;" @click="showOnboarding = true" title="Panduan & Onboarding Tour">
          🚀 Tour
        </button>
        <button class="ac-btn secondary sm" @click="closeSidebar()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
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

    <!-- Shortcut Keys Bar -->
    <div class="ac-shortcut-bar">
      <span>💡 Shortcut: </span>
      <kbd>Alt+D</kbd> Dash <kbd>Alt+B</kbd> Broad <kbd>Alt+R</kbd> Auto <kbd>Alt+P</kbd> Blur
    </div>

    <main class="ac-sidebar-content">
      <DashboardTab v-if="activeTab === 'dashboard'" />
      <TemplatesTab v-else-if="activeTab === 'templates'" />
      <AutoReplyTab v-else-if="activeTab === 'autoreply'" />
      <BroadcastTab v-else-if="activeTab === 'broadcast'" />
      <CRMTab v-else-if="activeTab === 'crm'" />
      <SettingsTab v-else-if="activeTab === 'settings'" />
    </main>

    <!-- Interactive Onboarding Modal -->
    <div v-if="showOnboarding" class="ac-modal-overlay">
      <div class="ac-modal-card">
        <div class="ac-modal-header">
          <span class="ac-badge loading" style="font-size: 0.68rem;">Langkah {{ onboardingStep }} dari 5</span>
          <button class="ac-btn danger sm" style="padding: 2px 6px;" @click="finishOnboarding">✕</button>
        </div>

        <div class="ac-modal-body">
          <div v-if="onboardingStep === 1">
            <h3 class="ac-label" style="font-size: 1rem; color: #0f172a;">👋 Selamat Datang di AMAN CHAT!</h3>
            <p class="ac-subtext" style="margin-top: 6px; line-height: 1.4;">
              Ekstensi manajemen WhatsApp Web profesional untuk mempermudah broadcast massal, auto reply pintar, manajemen kontak CRM, dan menjaga kerahasiaan chat Anda.
            </p>
          </div>

          <div v-else-if="onboardingStep === 2">
            <h3 class="ac-label" style="font-size: 1rem; color: #0f172a;">🔒 Fitur Privasi & Security Blur</h3>
            <p class="ac-subtext" style="margin-top: 6px; line-height: 1.4;">
              Lindungi percakapan dari pandangan orang sekitar saat bekerja di tempat umum. Aktifkan blur untuk pesan, nama kontak, foto profil, dan media secara instan via tombol <kbd>Alt + P</kbd>.
            </p>
          </div>

          <div v-else-if="onboardingStep === 3">
            <h3 class="ac-label" style="font-size: 1rem; color: #0f172a;">📢 Broadcast Massal & Spintax</h3>
            <p class="ac-subtext" style="margin-top: 6px; line-height: 1.4;">
              Kirim pesan ke banyak nomor sekaligus langsung di WhatsApp Web tanpa reload. Gunakan fitur <strong>Spintax <code class="ac-code-font">{Halo|Selamat Pagi}</code></strong> & <strong>Pengiriman Bertahap (Batching)</strong> untuk mencegah blokir nomor.
            </p>
          </div>

          <div v-else-if="onboardingStep === 4">
            <h3 class="ac-label" style="font-size: 1rem; color: #0f172a;">🤖 Auto Reply Bot Pintar</h3>
            <p class="ac-subtext" style="margin-top: 6px; line-height: 1.4;">
              Atur pesan balasan otomatis berdasarkan kata kunci (contains, exact, starts_with, regex), jadwal jam kerja bisnis, jeda cooldown per kontak, dan pesan balasan offline.
            </p>
          </div>

          <div v-else-if="onboardingStep === 5">
            <h3 class="ac-label" style="font-size: 1rem; color: #0f172a;">⌨️ Shortcut Keyboard Super Cepat</h3>
            <p class="ac-subtext" style="margin-top: 6px; line-height: 1.4;">
              Navigasi antar tab dengan kombinasi keyboard:
            </p>
            <ul class="ac-subtext" style="margin-top: 6px; padding-left: 18px; line-height: 1.6;">
              <li><kbd>Alt + A</kbd> : Buka / Tutup Sidebar</li>
              <li><kbd>Alt + D</kbd> : Buka Dashboard</li>
              <li><kbd>Alt + B</kbd> : Buka Broadcast</li>
              <li><kbd>Alt + R</kbd> : Buka Auto Reply</li>
              <li><kbd>Alt + C</kbd> : Buka CRM</li>
              <li><kbd>Alt + P</kbd> : Toggle Privacy Blur</li>
            </ul>
          </div>
        </div>

        <div class="ac-modal-footer">
          <button v-if="onboardingStep > 1" class="ac-btn secondary sm" @click="onboardingStep--">Kembali</button>
          <button v-if="onboardingStep < 5" class="ac-btn primary sm" @click="onboardingStep++">Lanjut ➔</button>
          <button v-else class="ac-btn primary sm" @click="finishOnboarding">Mulai Gunakan 🎉</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { sidebarState, closeSidebar, toggleSidebarState } from '../utils/sidebarState'
import { getPrivacySettings, setPrivacySettings } from '../utils/storage'
import DashboardTab from './tabs/DashboardTab.vue'
import TemplatesTab from './tabs/TemplatesTab.vue'
import AutoReplyTab from './tabs/AutoReplyTab.vue'
import BroadcastTab from './tabs/BroadcastTab.vue'
import CRMTab from './tabs/CRMTab.vue'
import SettingsTab from './tabs/SettingsTab.vue'

const activeTab = ref('dashboard')
const showOnboarding = ref(false)
const onboardingStep = ref(1)

const tabs = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'templates', name: 'Template' },
  { id: 'autoreply', name: 'Auto Reply' },
  { id: 'broadcast', name: 'Broadcast' },
  { id: 'crm', name: 'CRM' },
  { id: 'settings', name: 'Pengaturan' }
]

function checkOnboarding() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['wku_onboarding_done'], (res) => {
      if (!res.wku_onboarding_done) {
        showOnboarding.value = true
      }
    })
  }
}

function finishOnboarding() {
  showOnboarding.value = false
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ wku_onboarding_done: true })
  }
}

async function togglePrivacyShortcut() {
  const privacy = await getPrivacySettings()
  const nextVal = !privacy.blurChats
  await setPrivacySettings({
    blurChats: nextVal,
    blurPreviews: nextVal,
    blurAvatars: nextVal,
    blurMessages: nextVal,
    blurMedia: nextVal
  })
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.altKey) {
    const key = e.key.toLowerCase()
    switch (key) {
      case 'a':
        e.preventDefault()
        toggleSidebarState()
        break
      case 'd':
        e.preventDefault()
        activeTab.value = 'dashboard'
        if (!sidebarState.isOpen) toggleSidebarState()
        break
      case 'b':
        e.preventDefault()
        activeTab.value = 'broadcast'
        if (!sidebarState.isOpen) toggleSidebarState()
        break
      case 'r':
        e.preventDefault()
        activeTab.value = 'autoreply'
        if (!sidebarState.isOpen) toggleSidebarState()
        break
      case 't':
        e.preventDefault()
        activeTab.value = 'templates'
        if (!sidebarState.isOpen) toggleSidebarState()
        break
      case 'c':
        e.preventDefault()
        activeTab.value = 'crm'
        if (!sidebarState.isOpen) toggleSidebarState()
        break
      case 's':
        e.preventDefault()
        activeTab.value = 'settings'
        if (!sidebarState.isOpen) toggleSidebarState()
        break
      case 'p':
        e.preventDefault()
        togglePrivacyShortcut()
        break
    }
  }
}

onMounted(() => {
  console.log('[AMAN CHAT] Sidebar component mounted')
  checkOnboarding()
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.ac-sidebar {
  height: calc(100vh - 44px);
  top: 44px;
}
</style>
