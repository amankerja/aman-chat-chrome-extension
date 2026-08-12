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

      <div class="ac-divider"></div>

      <div class="ac-setting-row" style="margin-top: 8px;">
        <div style="display: flex; flex-direction: column;">
          <span>Kunci Layar & PIN (Inactivity Lock)</span>
          <span class="ac-subtext" style="font-size: 0.65rem;">Blur otomatis saat tidak aktif</span>
        </div>
        <label class="ac-switch">
          <input type="checkbox" v-model="privacy.pinLockEnabled" @change="handlePinToggle" />
          <span class="slider"></span>
        </label>
      </div>

      <div v-if="privacy.pinLockEnabled" class="ac-pin-settings" style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
        <div class="ac-form-group">
          <label class="ac-label">Waktu Tidak Aktif (Menit)</label>
          <select v-model.number="privacy.inactivityTimeout" class="ac-select" @change="savePrivacy">
            <option value="1">1 Menit</option>
            <option value="5">5 Menit</option>
            <option value="10">10 Menit</option>
            <option value="15">15 Menit</option>
            <option value="60">1 Jam</option>
          </select>
        </div>

        <div class="ac-form-group" style="margin-top: 8px;">
          <label class="ac-label">Set/Ubah PIN (4 Digit)</label>
          <div class="ac-grid-2" style="align-items: center;">
            <input type="password" maxlength="4" v-model="newPinInput" class="ac-input" placeholder="Masukkan 4 angka" @input="newPinInput = newPinInput.replace(/[^0-9]/g, '').slice(0, 4)" />
            <button class="ac-btn primary sm" @click="saveNewPin" :disabled="newPinInput.length !== 4">Simpan PIN</button>
          </div>
          <span class="ac-subtext" style="margin-top: 4px;" v-if="privacy.pinCode">✅ PIN sudah terpasang.</span>
          <span class="ac-subtext" style="margin-top: 4px; color: #ef4444;" v-else>⚠️ PIN belum diatur. Set sekarang.</span>
        </div>
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

      <div v-if="!isPremium" class="ac-license-form">
        <div class="ac-form-group">
          <label class="ac-label">Serial Number Lisensi</label>
          <input
            v-model="licenseKey"
            class="ac-input"
            placeholder="Masukkan Serial Number (contoh: SM-2026-ABC1)..."
          />
        </div>

        <div class="ac-grid-2" style="margin-top: 8px;">
          <div class="ac-form-group">
            <label class="ac-label">Email Pengguna</label>
            <input
              v-model="userEmailInput"
              class="ac-input"
              placeholder="contoh@gmail.com"
            />
          </div>
          <div class="ac-form-group">
            <label class="ac-label">No. WhatsApp / HP</label>
            <input
              v-model="userPhoneInput"
              class="ac-input"
              placeholder="08123456789"
            />
          </div>
        </div>

        <button class="ac-btn primary sm" style="margin-top: 10px; width: 100%;" @click="verifyLicense" :disabled="isVerifying">
          {{ isVerifying ? '⏳ Memeriksa ke Server...' : '🔑 Aktivasi & Verifikasi Lisensi' }}
        </button>

        <div style="margin-top: 10px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; font-size: 0.72rem; color: #475569;">
          Belum memiliki Serial Number Lisensi? 
          <a href="https://wa.me/6282223089790?text=Halo%20Admin,%20saya%20ingin%20membeli%20Lisensi%20AMAN%20CHAT" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-left: 2px;">
            💬 Hubungi WhatsApp Admin (+62 822-2308-9790)
          </a>
        </div>
      </div>

      <!-- Verified License Information Card -->
      <div v-if="isPremium && licenseDetails" class="ac-license-details" style="margin-top: 8px; padding: 12px; background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px;">
        <div class="ac-section-header" style="margin-bottom: 8px;">
          <span class="ac-label" style="font-size: 0.8rem; color: #047857;">🎉 Detail Aktivasi Lisensi Premium</span>
          <div style="display: flex; gap: 4px;">
            <button class="ac-btn secondary sm" style="padding: 2px 8px; font-size: 0.68rem;" @click="refreshLicenseData" :disabled="isVerifying">
              {{ isVerifying ? '⏳ Updating...' : '🔄 Sync Google Sheet' }}
            </button>
            <button class="ac-btn danger sm" style="padding: 2px 6px; font-size: 0.68rem;" @click="unlinkLicense">Unlink / Hapus</button>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.72rem; color: #065f46;">
          <div><strong>Serial Number:</strong> {{ licenseDetails.serialNumber }}</div>
          <div><strong>Status:</strong> <span class="ac-badge customer sm" style="font-size: 0.65rem;">ACTIVE</span></div>
          <div><strong>Device ID:</strong> {{ licenseDetails.deviceId }}</div>
          <div><strong>Email:</strong> {{ licenseDetails.email || userEmailInput || '-' }}</div>
          <div><strong>No. Telepon:</strong> {{ licenseDetails.phone || userPhoneInput || '-' }}</div>
          <div><strong>Tanggal Beli:</strong> {{ formatOnlyDate(licenseDetails.purchaseDate) }}</div>
          <div><strong>Masa Aktif (Durasi):</strong> <span style="font-weight: 700; color: #047857;">{{ formatDuration(licenseDetails.duration) }}</span></div>
          <div><strong>Tanggal Expired:</strong> <span style="font-weight: 700; color: #047857;">{{ formatOnlyDate(licenseDetails.expiryDate) }}</span></div>
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

    <!-- System & Software Updates Card -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Informasi Versi & Pembaruan Sistem</h3>
        <span class="ac-badge customer sm">v{{ currentAppVersion }}</span>
      </div>

      <div class="ac-form-group" style="margin-top: 6px;">
        <label class="ac-label">Repository GitHub Update</label>
        <div class="ac-grid-2">
          <input
            v-model="githubRepoInput"
            class="ac-input"
            placeholder="username/repo-name"
            @change="saveGithubRepo"
          />
          <button class="ac-btn primary sm" @click="checkManualUpdate" :disabled="isCheckingUpdate">
            {{ isCheckingUpdate ? '⏳ Memeriksa...' : '🔍 Cek Update' }}
          </button>
        </div>
        <span class="ac-subtext" style="margin-top: 2px;">Ekstensi mengecek versi terbaru secara otomatis via GitHub Releases API.</span>
      </div>

      <div v-if="githubUpdateInfo" style="margin-top: 8px; padding: 10px; border-radius: 6px;" :style="githubUpdateInfo.hasUpdate ? 'background: #e0e7ff; border: 1px solid #a5b4fc;' : 'background: #f1f5f9; border: 1px solid #e2e8f0;'">
        <div v-if="githubUpdateInfo.hasUpdate" style="font-size: 0.75rem; color: #1e1b4b;">
          <strong>🚀 Versi Baru v{{ githubUpdateInfo.latestVersion }} Tersedia!</strong>
          <div style="margin-top: 4px;">
            <a :href="githubUpdateInfo.downloadUrl || githubUpdateInfo.releaseUrl" target="_blank" class="ac-btn primary sm" style="padding: 2px 8px; font-size: 0.7rem; text-decoration: none; display: inline-block;">
              📥 Unduh Versi Terbaru (Zip)
            </a>
          </div>
        </div>
        <div v-else style="font-size: 0.75rem; color: #475569;">
          ✅ Ekstensi Anda menggunakan versi terbaru (v{{ currentAppVersion }}).
        </div>
      </div>
    </div>

    <!-- Log Error & Diagnostics Card -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Log Error & Diagnostik</h3>
        <button class="ac-btn primary sm" @click="copyErrorLogs">
          {{ copySuccess ? '✅ Disalin!' : '📋 Salin Log Error' }}
        </button>
      </div>
      <p class="ac-subtext" style="margin-bottom: 8px;">
        Riwayat error sistem otomatis tercatat di bawah ini. Anda dapat menyalin log ini jika membutuhkan bantuan teknis.
      </p>
      <textarea
        readonly
        v-model="formattedErrorLogs"
        class="ac-textarea ac-code-font"
        style="height: 120px; font-size: 0.72rem; background: #0f172a; color: #38bdf8; resize: vertical; width: 100%; box-sizing: border-box;"
      ></textarea>
      <div style="display: flex; gap: 6px; margin-top: 6px; justify-content: flex-end;">
        <button class="ac-btn danger sm" @click="clearLogs">🗑️ Hapus Log Error</button>
      </div>
    </div>

    <!-- Version Info Footer -->
    <div class="ac-card" style="text-align: center;">
      <span class="ac-label">AMAN CHAT Extension v3.0.0</span>
      <span class="ac-subtext">Designed & Developed for amankerja.com</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { PrivacySettings, LicenseDetails } from '../../types'
import {
  getPrivacySettings,
  setPrivacySettings,
  getLicenseKey,
  setLicenseKey,
  getLicenseApiUrl,
  setLicenseApiUrl,
  getLicenseDetails,
  setLicenseDetails,
  getIsPremium,
  setIsPremium,
  getErrorLogs,
  clearErrorLogs
} from '../../utils/storage'
import { verifySpreadsheetLicense } from '../../utils/licensing'
import {
  checkForGitHubUpdate,
  getGitHubRepo,
  setGitHubRepo,
  getCurrentVersion
} from '../../utils/githubUpdate'
import type { GitHubUpdateInfo } from '../../utils/githubUpdate'

const privacy = ref<PrivacySettings>({
  blurChats: false,
  blurPreviews: false,
  blurAvatars: false,
  blurMessages: false,
  blurMedia: false,
  pinLockEnabled: false,
  pinCode: '',
  inactivityTimeout: 5
})

const licenseApiUrl = ref('')
const licenseKey = ref('')
const userEmailInput = ref('')
const userPhoneInput = ref('')
const licenseDetails = ref<LicenseDetails | null>(null)
const isPremium = ref(false)
const isVerifying = ref(false)
const newPinInput = ref('')
const errorLogsList = ref<string[]>([])
const copySuccess = ref(false)

const currentAppVersion = ref(getCurrentVersion())
const githubRepoInput = ref('')
const githubUpdateInfo = ref<GitHubUpdateInfo | null>(null)
const isCheckingUpdate = ref(false)

async function saveGithubRepo() {
  await setGitHubRepo(githubRepoInput.value)
}

async function checkManualUpdate() {
  isCheckingUpdate.value = true
  await saveGithubRepo()
  try {
    githubUpdateInfo.value = await checkForGitHubUpdate(githubRepoInput.value)
  } finally {
    isCheckingUpdate.value = false
  }
}

function formatOnlyDate(val?: string): string {
  if (!val) return '-'
  const str = String(val).trim()
  if (!str) return '-'

  // If already simple format like 9/12/2026 or 09/12/2026
  const match = str.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
  if (match && match[1]) {
    return match[1]
  }

  // Parse Date object if GMT / ISO format string
  const d = new Date(str)
  if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  return str.split(' ')[0] || str
}

function formatDuration(val?: string | number): string {
  if (val === undefined || val === null || val === '') return 'Aktif'
  const str = String(val).trim()
  if (!str) return 'Aktif'

  if (/^\d+$/.test(str)) {
    return `${str} Bulan`
  }
  return str
}

async function loadErrorLogs() {
  errorLogsList.value = await getErrorLogs()
}

const formattedErrorLogs = computed(() => {
  if (errorLogsList.value.length === 0) {
    return '(Belum ada log error yang terdeteksi)'
  }
  return errorLogsList.value.join('\n')
})

function copyErrorLogs() {
  navigator.clipboard.writeText(formattedErrorLogs.value).then(() => {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  })
}

async function clearLogs() {
  await clearErrorLogs()
  errorLogsList.value = []
}

async function loadSettings() {
  privacy.value = await getPrivacySettings()
  licenseApiUrl.value = await getLicenseApiUrl()
  githubRepoInput.value = await getGitHubRepo()
  const key = await getLicenseKey()
  licenseKey.value = key || ''
  licenseDetails.value = await getLicenseDetails()
  if (licenseDetails.value) {
    userEmailInput.value = licenseDetails.value.email || ''
    userPhoneInput.value = licenseDetails.value.phone || ''
  }
  isPremium.value = await getIsPremium()
  await loadErrorLogs()
  checkManualUpdate()
}

async function savePrivacy() {
  await setPrivacySettings(privacy.value)
}

async function saveApiUrl() {
  await setLicenseApiUrl(licenseApiUrl.value.trim())
}

function handlePinToggle() {
  if (privacy.value.pinLockEnabled && !privacy.value.pinCode) {
    alert('Harap buat PIN terlebih dahulu.')
    const pinInput = document.querySelector('input[type="password"]') as HTMLInputElement
    if (pinInput) pinInput.focus()
  }
  savePrivacy()
}

async function saveNewPin() {
  if (newPinInput.value.length === 4) {
    privacy.value.pinCode = newPinInput.value
    await savePrivacy()
    alert('PIN berhasil disimpan!')
    newPinInput.value = ''
  }
}

async function verifyLicense() {
  if (!licenseKey.value.trim()) {
    alert('Harap masukkan Serial Number lisensi terlebih dahulu.')
    return
  }

  isVerifying.value = true
  await saveApiUrl()

  try {
    const result = await verifySpreadsheetLicense(
      licenseKey.value,
      userEmailInput.value,
      userPhoneInput.value,
      licenseApiUrl.value
    )
    if (result.valid && result.details) {
      await setLicenseKey(licenseKey.value.trim().toUpperCase())
      await setLicenseDetails(result.details)
      await setIsPremium(true)
      licenseDetails.value = result.details
      isPremium.value = true
      alert(`✅ ${result.message || 'Lisensi berhasil diverifikasi! Fitur Premium aktif.'}`)
    } else {
      alert(`❌ ${result.message || 'Kode lisensi tidak valid.'}`)
    }
  } catch (e: any) {
    alert('Terjadi kesalahan saat memverifikasi lisensi: ' + e.message)
  } finally {
    isVerifying.value = false
  }
}

async function refreshLicenseData() {
  if (!licenseKey.value) return
  isVerifying.value = true
  try {
    const result = await verifySpreadsheetLicense(
      licenseKey.value,
      userEmailInput.value,
      userPhoneInput.value,
      licenseApiUrl.value
    )
    if (result.valid && result.details) {
      await setLicenseDetails(result.details)
      licenseDetails.value = result.details
      alert('✅ Data lisensi, durasi & tanggal expired berhasil di-sync dari Google Sheet!')
    } else {
      alert(`❌ ${result.message || 'Gagal menyinkronkan data lisensi.'}`)
    }
  } catch (e: any) {
    alert('Gagal menyinkronkan data lisensi: ' + e.message)
  } finally {
    isVerifying.value = false
  }
}

async function unlinkLicense() {
  if (confirm('Apakah Anda yakin ingin melepas lisensi dari perangkat ini?')) {
    await setLicenseKey('')
    await setLicenseDetails(null)
    await setIsPremium(false)
    licenseKey.value = ''
    licenseDetails.value = null
    isPremium.value = false
    alert('Lisensi berhasil dilepas.')
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
.ac-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 10px 0;
}
.ac-subtext {
  font-size: 0.72rem;
  color: #64748b;
  display: block;
}
</style>
