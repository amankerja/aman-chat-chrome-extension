<template>
  <div class="ac-settings">
    <div class="ac-section-header">
      <h2 class="ac-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Pengaturan Extension
      </h2>
    </div>

    <!-- Privacy Blur Settings Card -->
    <div class="ac-card">
      <h3 class="ac-label">Mode Privasi & Blur</h3>
      
      <div class="ac-setting-row">
        <span>Blur Daftar Chat (Chat List)</span>
        <label class="ac-switch">
          <input type="checkbox" v-model="privacy.blurChats" @change="savePrivacy" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="ac-setting-row">
        <span>Blur Preview Pesan</span>
        <label class="ac-switch">
          <input type="checkbox" v-model="privacy.blurPreviews" @change="savePrivacy" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="ac-setting-row">
        <span>Blur Foto Profil / Avatar</span>
        <label class="ac-switch">
          <input type="checkbox" v-model="privacy.blurAvatars" @change="savePrivacy" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="ac-setting-row">
        <span>Blur Isi Pesan Percakapan</span>
        <label class="ac-switch">
          <input type="checkbox" v-model="privacy.blurMessages" @change="savePrivacy" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="ac-setting-row">
        <span>Blur Media (Gambar & Video)</span>
        <label class="ac-switch">
          <input type="checkbox" v-model="privacy.blurMedia" @change="savePrivacy" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- License & Account Status Card -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Lisensi & Status Akun</h3>
        <span class="ac-badge" :class="isPremium ? 'customer' : 'queuing'">
          {{ isPremium ? 'PREMIUM ACTIVE' : 'FREE VERSION' }}
        </span>
      </div>

      <div class="ac-form-group">
        <label class="ac-label">Kode Lisensi</label>
        <div class="ac-grid-2">
          <input v-model="licenseKey" class="ac-input" placeholder="Masukkan Lisensi AMAN CHAT..." />
          <button class="ac-btn primary sm" @click="verifyLicense">Verifikasi</button>
        </div>
      </div>
    </div>

    <!-- Data Backup & Reset Card -->
    <div class="ac-card">
      <h3 class="ac-label">Backup & Data Management</h3>
      <div class="ac-grid-2">
        <button class="ac-btn secondary sm" @click="backupData">
          📥 Backup JSON
        </button>
        <label class="ac-btn secondary sm" style="cursor: pointer;">
          📤 Restore JSON
          <input type="file" accept=".json" style="display: none;" @change="restoreData" />
        </label>
      </div>
      <button class="ac-btn danger sm" style="margin-top: 6px;" @click="resetAllData">
        ⚠️ Reset Seluruh Data Ekstensi
      </button>
    </div>

    <!-- Version Info Footer -->
    <div class="ac-card" style="text-align: center;">
      <span class="ac-label">AMAN CHAT Extension v3.0.0</span>
      <span class="ac-subtext">Designed & Developed for amankerja.com</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { PrivacySettings } from '../../types'
import {
  getPrivacySettings,
  setPrivacySettings,
  getLicenseKey,
  setLicenseKey,
  getIsPremium,
  setIsPremium
} from '../../utils/storage'
import { downloadCSV } from '../../utils/helpers'
import { verifyLicenseKey } from '../../utils/licensing'

const privacy = ref<PrivacySettings>({
  blurChats: false,
  blurPreviews: false,
  blurAvatars: false,
  blurMessages: false,
  blurMedia: false
})

const licenseKey = ref('')
const isPremium = ref(false)

async function loadSettings() {
  privacy.value = await getPrivacySettings()
  const key = await getLicenseKey()
  licenseKey.value = key || ''
  isPremium.value = await getIsPremium()
}

async function savePrivacy() {
  await setPrivacySettings(privacy.value)
}

async function verifyLicense() {
  // Was: any string 6+ characters long was accepted as a valid Premium
  // license. Now checked against the AMAN-XXXX-XXXX-CCCC format + checksum
  // (see src/utils/licensing.ts for why this still needs a real backend
  // eventually).
  const result = await verifyLicenseKey(licenseKey.value)
  if (result.valid) {
    await setLicenseKey(licenseKey.value.trim().toUpperCase())
    await setIsPremium(true)
    isPremium.value = true
    alert('Lisensi berhasil diverifikasi! Fitur Premium aktif.')
  } else {
    alert('Kode lisensi tidak valid. Format yang benar: AMAN-XXXX-XXXX-XXXX')
  }
}

async function backupData() {
  chrome.storage.local.get(null, (result) => {
    const jsonStr = JSON.stringify(result, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aman-chat-backup-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  })
}

function restoreData(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target?.result as string)
      chrome.storage.local.set(data, () => {
        alert('Data berhasil dipulihkan! Halaman akan direfresh.')
        window.location.reload()
      })
    } catch {
      alert('Format file JSON backup tidak valid.')
    }
  }
  reader.readAsText(file)
}

function resetAllData() {
  if (confirm('Apakah Anda yakin ingin menghapus seluruh data AMAN CHAT? Tindakan ini tidak dapat dibatalkan.')) {
    chrome.storage.local.clear(() => {
      alert('Seluruh data berhasil di-reset.')
      window.location.reload()
    })
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.ac-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  padding: 4px 0;
}
.ac-subtext {
  font-size: 0.72rem;
  color: #64748b;
  display: block;
}
</style>
