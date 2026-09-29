<template>
  <div class="ac-broadcast">
    <div class="ac-section-header">
      <h2 class="ac-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12A10 10 0 0 0 12 2v10z"/>
          <path d="M12 2A10 10 0 0 0 2 12h10z"/>
          <path d="M12 12 2.1 14.9A10 10 0 0 0 12 22z"/>
        </svg>
        Broadcast Massal (Real WA)
      </h2>
      <span class="ac-badge hauling" v-if="broadcastState.status !== 'idle'">
        Status: {{ broadcastState.status.toUpperCase() }}
      </span>
    </div>

    <!-- Resume-after-reload banner -->
    <div class="ac-card ac-resume-banner" v-if="showResumeBanner">
      <p class="ac-label" style="margin: 0 0 6px;">⚠️ Broadcast sebelumnya terhenti (halaman ter-reload)</p>
      <p class="ac-subtext" style="margin-bottom: 10px;">
        Progress terakhir: {{ broadcastState.currentIndex }} / {{ totalNumbers }} nomor.
        Lanjutkan dari nomor berikutnya, atau anggap selesai.
      </p>
      <div class="ac-grid-2">
        <button class="ac-btn primary sm" @click="resumeInterruptedBroadcast">▶ Lanjutkan Broadcast</button>
        <button class="ac-btn secondary sm" @click="dismissResumeBanner">Abaikan</button>
      </div>
    </div>

    <!-- Receiver Input Card -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Daftar Nomor Penerima</h3>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button
            type="button"
            class="ac-btn secondary sm"
            style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600;"
            @click="openInboxContactPicker"
          >
            💬 Dari Inbox / Chat
          </button>
          <label class="ac-btn secondary sm" style="cursor: pointer;">
            📁 Impor CSV
            <input type="file" accept=".csv" style="display: none;" @change="handleCSVImport" />
          </label>
        </div>
      </div>
      <textarea
        v-model="rawNumbers"
        class="ac-textarea"
        placeholder="Masukkan nomor HP (contoh: +62 822-2308-9790, 08123456789, atau format: 628123456789|Nama Kontak)"
        :disabled="broadcastState.status === 'sending'"
      ></textarea>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; flex-wrap: wrap; gap: 4px;">
        <span class="ac-subtext">
          Total terdeteksi: {{ parsedNumbers.length }} nomor unik
          <template v-if="duplicateCount > 0">({{ duplicateCount }} duplikat otomatis dihapus)</template>
        </span>
        <span v-if="!isPremium" class="ac-badge queuing" style="font-size: 0.65rem;">
          Free: Maks 2 nomor / sesi
        </span>
      </div>
      <div v-if="!isPremium && parsedNumbers.length > 2" style="margin-top: 8px; padding: 6px 10px; background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; font-size: 0.72rem; color: #854d0e; display: flex; align-items: center; gap: 6px;">
        <span>⚠️</span>
        <span>Akun Free: Maksimal <strong>2 nomor</strong> per sesi broadcast. Sistem hanya akan memproses 2 nomor pertama. Upgrade ke Lisensi PRO di tab Pengaturan untuk pengiriman tanpa batas.</span>
      </div>
    </div>

    <!-- Message Content Card -->
    <div class="ac-card">
      <h3 class="ac-label">Pesan Broadcast</h3>
      <textarea
        v-model="broadcastState.message"
        class="ac-textarea"
        placeholder="Tuliskan pesan utama... (contoh: {Halo|Selamat Pagi|Sapaan} {kak|gan|sis}, promo menarik hari ini!)"
        :disabled="broadcastState.status === 'sending'"
      ></textarea>
      <span class="ac-subtext" style="margin-top: 4px; display: block;">💡 Gunakan <code class="ac-code-font">{nama}</code> untuk menyapa nama penerima, dan Spintax <code class="ac-code-font">{Kata1|Kata2}</code> untuk variasi kata otomatis.</span>

      <!-- File Attachment Upload -->
      <div class="ac-form-group" style="margin-top: 10px;">
        <label class="ac-label">📷 Lampiran Foto / Media (Opsional)</label>
        <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" class="ac-input" @change="handleMediaAttachment" :disabled="broadcastState.status === 'sending'" />
        <span v-if="selectedFileName" class="ac-subtext" style="color: #10b981; margin-top: 4px; display: block;">
          ✓ File terpilih: {{ selectedFileName }}
        </span>
      </div>

      <div class="ac-form-group" style="margin-top: 10px;">
        <label class="ac-checkbox-label">
          <input type="checkbox" v-model="broadcastState.useTwoMessages" />
          Gunakan Pesan Alternatif (Random Rotasi Pesan 1 & 2)
        </label>
      </div>

      <textarea
        v-if="broadcastState.useTwoMessages"
        v-model="broadcastState.message2"
        class="ac-textarea"
        placeholder="Tuliskan pesan variasi kedua..."
        :disabled="broadcastState.status === 'sending'"
      ></textarea>
    </div>

    <!-- Delivery Settings -->
    <div class="ac-card">
      <h3 class="ac-label">Pengaturan Jeda & Pengetikan</h3>
      <div class="ac-grid-2">
        <div class="ac-form-group">
          <label class="ac-label">Jeda Min (Detik)</label>
          <input type="number" v-model.number="broadcastState.minInterval" min="1" max="60" class="ac-input" />
        </div>
        <div class="ac-form-group">
          <label class="ac-label">Jeda Maks (Detik)</label>
          <input type="number" v-model.number="broadcastState.maxInterval" min="1" max="60" class="ac-input" />
        </div>
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Simulasi Pengetikan</label>
        <select v-model="broadcastState.typingMode" class="ac-select">
          <option value="instant">Kirim Langsung (Instan)</option>
          <option value="character">Ketik Seperti Manusia (Karakter)</option>
        </select>
      </div>

      <!-- Batching Controls -->
      <div class="ac-form-group" style="margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
        <label class="ac-checkbox-label">
          <input type="checkbox" v-model="broadcastState.useBatching" />
          ☕ Pengiriman Bertahap (Batching & Rate Control)
        </label>
      </div>

      <div v-if="broadcastState.useBatching" class="ac-grid-2" style="margin-top: 8px;">
        <div class="ac-form-group">
          <label class="ac-label">Ukuran Batch (Pesan)</label>
          <input type="number" v-model.number="broadcastState.batchSize" min="1" max="100" class="ac-input" placeholder="10" />
        </div>
        <div class="ac-form-group">
          <label class="ac-label">Istirahat Batch (Menit)</label>
          <input type="number" v-model.number="broadcastState.batchDelayMinutes" min="1" max="120" class="ac-input" placeholder="2" />
        </div>
      </div>
    </div>

    <!-- Reliability Settings -->
    <div class="ac-card">
      <h3 class="ac-label">Keandalan & Keamanan Akun</h3>
      <div class="ac-grid-2">
        <div class="ac-form-group">
          <label class="ac-label">Coba Ulang Jika Gagal</label>
          <input type="number" v-model.number="broadcastState.maxRetries" min="0" max="5" class="ac-input" />
          <span class="ac-subtext">Kali percobaan tambahan per nomor</span>
        </div>
        <div class="ac-form-group">
          <label class="ac-label">Jeda Panjang Tiap</label>
          <input type="number" v-model.number="broadcastState.batchCooldownEvery" min="0" max="200" class="ac-input" />
          <span class="ac-subtext">Pesan (0 = nonaktif)</span>
        </div>
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Durasi Jeda Panjang (Detik)</label>
        <input type="number" v-model.number="broadcastState.batchCooldownSeconds" min="5" max="600" class="ac-input" />
        <span class="ac-subtext">Jeda ekstra ini membuat pola kirim terlihat lebih manusiawi, mengurangi risiko nomor Anda dibatasi WhatsApp.</span>
      </div>
    </div>

    <!-- Progress & Controls Card -->
    <div class="ac-card">
      <h3 class="ac-label">Kontrol & Progress Real</h3>
      
      <div class="ac-progress-bar-bg">
        <div class="ac-progress-bar-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>

      <div class="ac-grid-3" style="margin-top: 8px;">
        <div class="ac-stat-box">
          <span class="ac-stat-label">Total Nomor</span>
          <span class="ac-stat-value">{{ totalNumbers }}</span>
        </div>
        <div class="ac-stat-box">
          <span class="ac-stat-label">Proses</span>
          <span class="ac-stat-value" style="color: #15803d;">{{ broadcastState.currentIndex }} / {{ totalNumbers }}</span>
        </div>
        <div class="ac-stat-box">
          <span class="ac-stat-label">Gagal</span>
          <span class="ac-stat-value" style="color: #dc2626;">{{ broadcastState.failedNumbers?.length || 0 }}</span>
        </div>
      </div>

      <div
        v-if="broadcastState.status === 'completed' && (broadcastState.failedNumbers?.length || 0) > 0"
        class="ac-form-group" style="margin-top: 8px;"
      >
        <button class="ac-btn secondary sm" @click="retryFailedOnly">
          🔁 Kirim Ulang ke {{ broadcastState.failedNumbers?.length }} Nomor yang Gagal
        </button>
      </div>

      <div class="ac-grid-2" style="margin-top: 8px;">
        <button
          v-if="broadcastState.status === 'idle' || broadcastState.status === 'completed'"
          class="ac-btn primary"
          :disabled="parsedNumbers.length === 0 || !broadcastState.message"
          @click="startBroadcast"
        >
          ▶ Mulai Broadcast (Real)
        </button>
        <button
          v-else-if="broadcastState.status === 'sending'"
          class="ac-btn secondary"
          @click="pauseBroadcast"
        >
          ⏸️ Pause
        </button>
        <button
          v-else-if="broadcastState.status === 'paused'"
          class="ac-btn primary"
          @click="resumeBroadcast"
        >
          ▶ Lanjutkan
        </button>

        <button
          v-if="broadcastState.status !== 'idle'"
          class="ac-btn danger"
          @click="stopBroadcast"
        >
          ⏹️ Stop
        </button>
      </div>
    </div>

    <!-- Real Execution Logs & Error Log Card -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Log Riwayat & Error System</h3>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button class="ac-btn secondary sm" @click="copyAllLogs">
            {{ copySuccess ? '✅ Disalin!' : '📋 Salin Log' }}
          </button>
          <button class="ac-btn secondary sm" @click="downloadLogs">📥 Export</button>
          <button class="ac-btn primary sm" @click="openErrorLogModal">🚨 Log Error</button>
        </div>
      </div>
      <div class="ac-log-box ac-code-font" v-if="broadcastState.logs.length > 0">
        <div v-for="(log, idx) in broadcastState.logs" :key="idx" class="ac-log-line">
          {{ log }}
        </div>
      </div>
      <div v-else class="ac-subtext" style="padding: 4px 0;">
        Belum ada log broadcast aktif. Klik <strong>🚨 Log Error</strong> untuk melihat & menyalin riwayat error sistem.
      </div>
    </div>

    <!-- Modal Viewer Log Error & Debugging -->
    <div v-if="showErrorModal" class="ac-modal-overlay" @click.self="showErrorModal = false">
      <div class="ac-modal-content">
        <div class="ac-section-header" style="margin-bottom: 8px;">
          <h3 class="ac-label" style="font-size: 0.92rem; display: flex; align-items: center; gap: 6px; margin: 0;">
            📋 Log Error & Diagnostik Sistem
          </h3>
          <button class="ac-btn secondary sm" @click="showErrorModal = false">✕ Tutup</button>
        </div>
        <p class="ac-subtext" style="margin-bottom: 8px;">
          Di bawah ini adalah riwayat lengkap log error dan aktivitas. Anda dapat mengklik <strong>Salin Log Error</strong> untuk menyalinnya langsung ke clipboard.
        </p>

        <textarea
          readonly
          v-model="fullLogText"
          class="ac-textarea ac-code-font"
          style="height: 180px; font-size: 0.72rem; background: #0f172a; color: #38bdf8; resize: vertical; line-height: 1.4; width: 100%; box-sizing: border-box;"
        ></textarea>

        <div style="display: flex; gap: 6px; margin-top: 10px; justify-content: space-between; align-items: center;">
          <button class="ac-btn primary sm" @click="copyAllLogs">
            {{ copySuccess ? '✅ Log Berhasil Disalin!' : '📋 Salin Semua Log Error' }}
          </button>
          <button class="ac-btn danger sm" @click="handleClearErrorLogs">
            🗑️ Hapus Log Error
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Picker: Pilih Kontak dari Inbox & Chat -->
    <div v-if="showContactPickerModal" class="ac-modal-overlay" @click.self="showContactPickerModal = false">
      <div class="ac-modal-content" style="max-width: 440px; display: flex; flex-direction: column; max-height: 85vh;">
        <div class="ac-section-header" style="margin-bottom: 8px; flex-shrink: 0;">
          <h3 class="ac-label" style="font-size: 0.92rem; display: flex; align-items: center; gap: 6px; margin: 0; color: #0f172a;">
            💬 Pilih Kontak dari Inbox & Chat
          </h3>
          <button class="ac-btn secondary sm" style="padding: 2px 8px;" @click="showContactPickerModal = false">✕ Tutup</button>
        </div>

        <p class="ac-subtext" style="margin-bottom: 8px; flex-shrink: 0;">
          Pilih kontak dari obrolan WhatsApp Web atau database CRM untuk dimasukkan langsung beserta namanya ke daftar broadcast.
        </p>

        <!-- Search & Scan Bar -->
        <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-shrink: 0;">
          <input
            v-model="contactSearchQuery"
            type="text"
            class="ac-input"
            style="flex: 1;"
            placeholder="Cari nama atau nomor HP..."
          />
          <button
            type="button"
            class="ac-btn secondary sm"
            style="white-space: nowrap; padding: 0 10px;"
            :disabled="isScanningInbox"
            @click="refreshInboxContacts"
          >
            {{ isScanningInbox ? '⏳ Memindai...' : '🔄 Pindai Ulang' }}
          </button>
        </div>

        <!-- Filter Pills & Selection Counter -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-shrink: 0; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; gap: 4px;">
            <button
              type="button"
              class="ac-cat-pill"
              :class="{ active: contactFilterSource === 'all' }"
              @click="contactFilterSource = 'all'"
            >
              Semua ({{ inboxContacts.length }})
            </button>
            <button
              type="button"
              class="ac-cat-pill"
              :class="{ active: contactFilterSource === 'inbox' }"
              @click="contactFilterSource = 'inbox'"
            >
              Inbox ({{ countInboxOnly }})
            </button>
            <button
              type="button"
              class="ac-cat-pill"
              :class="{ active: contactFilterSource === 'crm' }"
              @click="contactFilterSource = 'crm'"
            >
              CRM ({{ countCrmOnly }})
            </button>
          </div>

          <div style="display: flex; gap: 6px; align-items: center;">
            <button
              type="button"
              class="ac-btn secondary sm"
              style="padding: 2px 8px; font-size: 0.68rem;"
              @click="selectAllContacts"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              class="ac-btn secondary sm"
              style="padding: 2px 8px; font-size: 0.68rem;"
              @click="deselectAllContacts"
            >
              Hapus Pilihan
            </button>
          </div>
        </div>

        <!-- Warning for Free Tier when more than 2 contacts selected -->
        <div v-if="!isPremium" style="margin-bottom: 8px; padding: 6px 8px; background: #fef9c3; border: 1px solid #fde047; border-radius: 6px; font-size: 0.7rem; color: #854d0e; flex-shrink: 0;">
          ℹ️ Versi FREE: Maksimal <strong>2 nomor</strong> per sesi broadcast. {{ selectedContactsCount > 2 ? `(Anda memilih ${selectedContactsCount} kontak — hanya 2 nomor pertama yang akan diproses per sesi)` : '' }}
        </div>

        <!-- Scrollable Contact List -->
        <div class="ac-inbox-contact-list" style="flex: 1; overflow-y: auto; max-height: 280px; display: flex; flex-direction: column; gap: 4px; padding-right: 2px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; background: #f8fafc;">
          <div v-if="isScanningInbox" style="text-align: center; padding: 24px 8px; color: #64748b; font-size: 0.78rem;">
            ⏳ Sedang memindai obrolan inbox dan kontak CRM...
          </div>
          <div v-else-if="filteredInboxContacts.length === 0" style="text-align: center; padding: 24px 8px; color: #94a3b8; font-size: 0.78rem;">
            Tidak ada kontak yang cocok dengan pencarian atau belum ada chat di inbox.
          </div>
          <div
            v-else
            v-for="contact in filteredInboxContacts"
            :key="contact.id"
            class="ac-inbox-contact-row"
            :class="{ selected: selectedContactIds.has(contact.id) }"
            @click="toggleSelectContact(contact)"
          >
            <input
              type="checkbox"
              :checked="selectedContactIds.has(contact.id)"
              style="cursor: pointer; margin-right: 6px;"
              @click.stop="toggleSelectContact(contact)"
            />
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span style="font-size: 0.78rem; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ contact.name || 'Kontak WhatsApp' }}
                </span>
                <span
                  class="ac-badge"
                  :class="contact.source === 'inbox' ? 'hauling' : (contact.source === 'crm' ? 'active' : 'queuing')"
                  style="font-size: 0.62rem; padding: 1px 6px;"
                >
                  {{ contact.source.toUpperCase() }}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px;">
                <span class="ac-code-font" style="font-size: 0.72rem; color: #2563eb; font-weight: 500;">
                  {{ contact.phone }}
                </span>
                <span v-if="contact.lastMessage" style="font-size: 0.65rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">
                  {{ contact.lastMessage }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="display: flex; gap: 8px; margin-top: 10px; justify-content: space-between; align-items: center; flex-shrink: 0; flex-wrap: wrap;">
          <span class="ac-subtext" style="font-weight: 600; color: #0f172a;">
            Terpilih: {{ selectedContactsCount }} kontak
          </span>
          <div style="display: flex; gap: 6px;">
            <button
              type="button"
              class="ac-btn secondary sm"
              :disabled="selectedContactsCount === 0"
              @click="applySelectedContacts('replace')"
            >
              Ganti Daftar
            </button>
            <button
              type="button"
              class="ac-btn primary sm"
              :disabled="selectedContactsCount === 0"
              @click="applySelectedContacts('append')"
            >
              ✓ Tambahkan ke Broadcast ({{ selectedContactsCount }})
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { BroadcastState } from '../../types'
import { getBroadcastState, setBroadcastState, getErrorLogs, clearErrorLogs, getIsPremium } from '../../utils/storage'
import { downloadCSV, formatPhoneNumber } from '../../utils/helpers'
import { scanInboxChatsAndContacts } from '../../utils/inboxContacts'
import type { RecipientItem } from '../../utils/waAutomation'
import type { InboxContactItem } from '../../types'
import {
  runRealBroadcast,
  pauseRealBroadcast,
  resumeRealBroadcast,
  stopRealBroadcast,
  isBroadcastActuallyRunning
} from '../../utils/waAutomation'

const rawNumbers = ref('')
const showErrorModal = ref(false)
const errorLogs = ref<string[]>([])
const copySuccess = ref(false)

async function loadErrorLogs() {
  errorLogs.value = await getErrorLogs()
}

const fullLogText = computed(() => {
  const bLogs = broadcastState.value.logs || []
  const errs = errorLogs.value || []
  const lines = [
    '=== LOG BROADCAST & REAL EXECUTION ===',
    ...(bLogs.length > 0 ? bLogs : ['(Belum ada log broadcast saat ini)']),
    '',
    '=== LOG ERROR & SYSTEM DIAGNOSTICS ===',
    ...(errs.length > 0 ? errs : ['(Belum ada error yang terdeteksi)'])
  ]
  return lines.join('\n')
})

function copyAllLogs() {
  navigator.clipboard.writeText(fullLogText.value).then(() => {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2500)
  })
}

async function handleClearErrorLogs() {
  await clearErrorLogs()
  errorLogs.value = []
}

function openErrorLogModal() {
  loadErrorLogs()
  showErrorModal.value = true
}
const showResumeBanner = ref(false)
const duplicateCount = ref(0)
const selectedFileName = ref('')
const isPremium = ref(false)

// Inbox & Chat Contact Picker State
const showContactPickerModal = ref(false)
const isScanningInbox = ref(false)
const inboxContacts = ref<InboxContactItem[]>([])
const contactSearchQuery = ref('')
const contactFilterSource = ref<'all' | 'inbox' | 'crm'>('all')
const selectedContactIds = ref<Set<string>>(new Set())

const countInboxOnly = computed(() => {
  return inboxContacts.value.filter(c => c.source === 'inbox' || c.source === 'active_chat').length
})

const countCrmOnly = computed(() => {
  return inboxContacts.value.filter(c => c.source === 'crm' || c.source === 'grabber').length
})

const filteredInboxContacts = computed(() => {
  let list = inboxContacts.value
  if (contactFilterSource.value === 'inbox') {
    list = list.filter(c => c.source === 'inbox' || c.source === 'active_chat')
  } else if (contactFilterSource.value === 'crm') {
    list = list.filter(c => c.source === 'crm' || c.source === 'grabber')
  }

  if (contactSearchQuery.value.trim()) {
    const q = contactSearchQuery.value.trim().toLowerCase()
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      c.phone.includes(q)
    )
  }
  return list
})

const selectedContactsCount = computed(() => selectedContactIds.value.size)

async function openInboxContactPicker() {
  showContactPickerModal.value = true
  if (inboxContacts.value.length === 0) {
    await refreshInboxContacts()
  }
}

async function refreshInboxContacts() {
  isScanningInbox.value = true
  try {
    const scanned = await scanInboxChatsAndContacts()
    inboxContacts.value = scanned
  } catch (e) {
    console.warn('[AMAN CHAT] Gagal memindai kontak inbox:', e)
  } finally {
    isScanningInbox.value = false
  }
}

function toggleSelectContact(contact: InboxContactItem) {
  const set = new Set(selectedContactIds.value)
  if (set.has(contact.id)) {
    set.delete(contact.id)
  } else {
    if (!isPremium.value && set.size >= 2) {
      alert('ℹ️ Versi FREE dibatasi maksimal 2 nomor per sesi broadcast.\n\nAnda dapat memilih hingga 2 nomor, atau upgrade ke Lisensi PRO untuk memilih kontak tanpa batas!')
      return
    }
    set.add(contact.id)
  }
  selectedContactIds.value = set
}

function selectAllContacts() {
  const set = new Set<string>()
  const items = filteredInboxContacts.value

  if (!isPremium.value) {
    const limit = Math.min(2, items.length)
    for (let i = 0; i < limit; i++) {
      set.add(items[i].id)
    }
    if (items.length > 2) {
      alert('ℹ️ Versi FREE dibatasi maksimal 2 nomor per sesi broadcast.\n\nSistem otomatis memilih 2 kontak pertama. Upgrade ke Lisensi PRO untuk memilih semua sekaligus.')
    }
  } else {
    for (const c of items) {
      set.add(c.id)
    }
  }
  selectedContactIds.value = set
}

function deselectAllContacts() {
  selectedContactIds.value = new Set()
}

function applySelectedContacts(mode: 'append' | 'replace') {
  const selectedList = inboxContacts.value.filter(c => selectedContactIds.value.has(c.id))
  if (selectedList.length === 0) return

  const lines = selectedList.map(c => {
    return c.name && c.name !== c.phone ? `${c.phone}|${c.name}` : c.phone
  })

  if (mode === 'replace' || !rawNumbers.value.trim()) {
    rawNumbers.value = lines.join('\n')
  } else {
    rawNumbers.value = rawNumbers.value.trim() + '\n' + lines.join('\n')
  }

  saveCurrentState()
  showContactPickerModal.value = false
}

const broadcastState = ref<BroadcastState>({
  status: 'idle',
  numbers: [],
  currentIndex: 0,
  message: '',
  message2: '',
  useTwoMessages: false,
  minInterval: 3,
  maxInterval: 7,
  logs: [],
  typingMode: 'instant',
  maxRetries: 1,
  batchCooldownEvery: 20,
  batchCooldownSeconds: 45,
  useBatching: false,
  batchSize: 10,
  batchDelayMinutes: 2,
  enableSpintax: true,
  failedNumbers: []
})

const parsedRecipients = computed<RecipientItem[]>(() => {
  const lines = rawNumbers.value.split('\n').map(l => l.trim()).filter(Boolean)
  const seen = new Set<string>()
  const list: RecipientItem[] = []

  for (const line of lines) {
    let parts: string[] = []
    if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim())
    } else if (line.includes(',')) {
      parts = line.split(',').map(p => p.trim())
    } else {
      parts = [line]
    }

    const phone = formatPhoneNumber(parts[0] || '')
    if (phone.length < 8) continue

    if (!seen.has(phone)) {
      seen.add(phone)
      const customVars: Record<string, string> = {}
      if (parts[3]) customVars['produk'] = parts[3]
      if (parts[4]) customVars['harga'] = parts[4]
      if (parts[5]) customVars['invoice'] = parts[5]
      if (parts[6]) customVars['var1'] = parts[6]
      if (parts[7]) customVars['var2'] = parts[7]

      list.push({
        phone,
        name: parts[1] || '',
        email: parts[2] || '',
        customVars
      })
    }
  }

  duplicateCount.value = lines.length - list.length
  return list
})

const parsedNumbers = computed(() => {
  return parsedRecipients.value.map(r => r.phone)
})

const totalNumbers = computed(() => {
  const parsedCount = parsedRecipients.value.length
  const stateCount = broadcastState.value.numbers?.length || 0
  return parsedCount > 0 ? parsedCount : stateCount
})

const progressPercentage = computed(() => {
  const total = totalNumbers.value
  if (total === 0) return 0
  return Math.min(100, Math.round((broadcastState.value.currentIndex / total) * 100))
})

async function loadSavedState() {
  const saved = await getBroadcastState()
  if (saved) {
    if (!Array.isArray(saved.logs)) saved.logs = []
    if (!Array.isArray(saved.numbers)) saved.numbers = []
    broadcastState.value = {
      ...broadcastState.value,
      ...saved
    }
    if (saved.numbers.length > 0) {
      rawNumbers.value = saved.numbers.join('\n')
    }

    const totalCount = saved.numbers.length
    const isInterrupted = saved.status === 'sending' &&
      totalCount > 0 &&
      saved.currentIndex > 0 &&
      saved.currentIndex < totalCount &&
      !isBroadcastActuallyRunning()

    if (isInterrupted) {
      showResumeBanner.value = true
    } else if (saved.status === 'sending' && !isBroadcastActuallyRunning()) {
      if (saved.currentIndex >= totalCount && totalCount > 0) {
        broadcastState.value.status = 'completed'
      } else {
        broadcastState.value.status = 'idle'
        broadcastState.value.currentIndex = 0
      }
      await saveCurrentState()
    }
  }
}

function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
  if (areaName === 'local') {
    if (changes.wku_broadcast_state) {
      const newState = changes.wku_broadcast_state.newValue as BroadcastState | undefined
      if (newState) {
        if (!Array.isArray(newState.logs)) newState.logs = []
        if (!Array.isArray(newState.numbers)) newState.numbers = []
        broadcastState.value = newState
      }
    }
    if (changes.wku_is_premium) {
      isPremium.value = Boolean(changes.wku_is_premium.newValue)
    }
  }
}

async function saveCurrentState() {
  if (broadcastState.value.status === 'idle') {
    broadcastState.value.numbers = parsedNumbers.value
  }
  if (!Array.isArray(broadcastState.value.logs)) {
    broadcastState.value.logs = []
  }
  await setBroadcastState(broadcastState.value)
}

function handleMediaAttachment(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  broadcastState.value.attachment = file
  selectedFileName.value = file.name
}

function handleCSVImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length === 0) return

      const importedLines: string[] = []
      const startIndex = lines[0].toLowerCase().includes('phone') || lines[0].toLowerCase().includes('nomor') || lines[0].toLowerCase().includes('nama') ? 1 : 0

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim())
        let phone = ''
        let name = ''
        let email = ''
        const extraVars: string[] = []

        if (parts[0]?.replace(/[^0-9]/g, '').length >= 8) {
          phone = parts[0]
          name = parts[1] || ''
          email = parts[2] || ''
          for (let k = 3; k < parts.length; k++) extraVars.push(parts[k])
        } else if (parts[1]?.replace(/[^0-9]/g, '').length >= 8) {
          name = parts[0] || ''
          phone = parts[1]
          email = parts[2] || ''
          for (let k = 3; k < parts.length; k++) extraVars.push(parts[k])
        }

        if (phone) {
          const rowParts = [phone, name, email, ...extraVars]
          importedLines.push(rowParts.join('|').replace(/\|+$/, ''))
        }
      }

      rawNumbers.value = importedLines.join('\n')
      saveCurrentState()
    }
  }
  reader.readAsText(file)
}

function onBroadcastProgress(progress: { index: number; total: number; log: string; done?: boolean; failedNumbers?: string[] }) {
  broadcastState.value.currentIndex = progress.index
  if (!Array.isArray(broadcastState.value.logs)) {
    broadcastState.value.logs = []
  }
  broadcastState.value.logs.push(progress.log)
  if (progress.failedNumbers) {
    broadcastState.value.failedNumbers = progress.failedNumbers
  }

  if (progress.done) {
    broadcastState.value.status = 'completed'
  }

  setBroadcastState(broadcastState.value)
}

async function startBroadcast() {
  if (parsedRecipients.value.length === 0 || !broadcastState.value.message) return

  const isPro = await getIsPremium()
  isPremium.value = isPro
  let targetRecipients = parsedRecipients.value

  if (!isPro && targetRecipients.length > 2) {
    alert(`ℹ️ Versi FREE dibatasi maksimal 2 nomor per sesi broadcast.\n\nSistem akan mengirim ke 2 nomor pertama saja dari total ${targetRecipients.length} nomor.\n\nAktifkan Lisensi PRO di tab Pengaturan untuk pengiriman tanpa batas!`)
    targetRecipients = targetRecipients.slice(0, 2)
  }

  broadcastState.value.status = 'sending'
  broadcastState.value.currentIndex = 0
  broadcastState.value.logs = []
  broadcastState.value.failedNumbers = []
  broadcastState.value.numbers = targetRecipients.map(r => r.phone)
  await setBroadcastState(broadcastState.value)

  runRealBroadcast({
    numbers: targetRecipients,
    message1: broadcastState.value.message,
    message2: broadcastState.value.message2,
    useTwoMessages: broadcastState.value.useTwoMessages,
    minInterval: broadcastState.value.minInterval || 3,
    maxInterval: broadcastState.value.maxInterval || 7,
    typingMode: broadcastState.value.typingMode || 'instant',
    attachment: broadcastState.value.attachment,
    maxRetries: broadcastState.value.maxRetries ?? 1,
    batchCooldownEvery: broadcastState.value.batchCooldownEvery ?? 20,
    batchCooldownSeconds: broadcastState.value.batchCooldownSeconds ?? 45,
    useBatching: broadcastState.value.useBatching || false,
    batchSize: broadcastState.value.batchSize || 10,
    batchDelayMinutes: broadcastState.value.batchDelayMinutes || 2,
    enableSpintax: broadcastState.value.enableSpintax ?? true,
    onProgress: onBroadcastProgress
  })
}

async function resumeInterruptedBroadcast() {
  showResumeBanner.value = false
  broadcastState.value.status = 'sending'
  const startIndex = broadcastState.value.currentIndex

  const isPro = await getIsPremium()
  isPremium.value = isPro
  let runNumbers = broadcastState.value.numbers
  if (!isPro && runNumbers.length > 2) {
    runNumbers = runNumbers.slice(0, 2)
    broadcastState.value.numbers = runNumbers
  }
  await setBroadcastState(broadcastState.value)

  runRealBroadcast({
    numbers: runNumbers,
    message1: broadcastState.value.message,
    message2: broadcastState.value.message2,
    useTwoMessages: broadcastState.value.useTwoMessages,
    minInterval: broadcastState.value.minInterval || 3,
    maxInterval: broadcastState.value.maxInterval || 7,
    typingMode: broadcastState.value.typingMode || 'instant',
    maxRetries: broadcastState.value.maxRetries ?? 1,
    batchCooldownEvery: broadcastState.value.batchCooldownEvery ?? 20,
    batchCooldownSeconds: broadcastState.value.batchCooldownSeconds ?? 45,
    useBatching: broadcastState.value.useBatching || false,
    batchSize: broadcastState.value.batchSize || 10,
    batchDelayMinutes: broadcastState.value.batchDelayMinutes || 2,
    enableSpintax: broadcastState.value.enableSpintax ?? true,
    startIndex,
    onProgress: onBroadcastProgress
  })
}

function dismissResumeBanner() {
  showResumeBanner.value = false
  broadcastState.value.status = 'completed'
  saveCurrentState()
}

async function retryFailedOnly() {
  const failed = broadcastState.value.failedNumbers || []
  if (failed.length === 0) return

  const isPro = await getIsPremium()
  isPremium.value = isPro
  let targetFailed = failed
  if (!isPro && targetFailed.length > 2) {
    alert(`ℹ️ Versi FREE dibatasi maksimal 2 nomor per sesi broadcast.\n\nSistem akan mengirim ke 2 nomor pertama saja dari total ${targetFailed.length} nomor yang gagal.\n\nAktifkan Lisensi PRO di tab Pengaturan untuk pengiriman tanpa batas!`)
    targetFailed = targetFailed.slice(0, 2)
  }

  rawNumbers.value = targetFailed.join('\n')
  broadcastState.value.status = 'sending'
  broadcastState.value.currentIndex = 0
  broadcastState.value.logs.push(`[${new Date().toLocaleTimeString('id-ID')}] --- Mengirim ulang ke ${targetFailed.length} nomor yang gagal ---`)
  broadcastState.value.failedNumbers = []
  broadcastState.value.numbers = targetFailed
  await setBroadcastState(broadcastState.value)

  runRealBroadcast({
    numbers: targetFailed,
    message1: broadcastState.value.message,
    message2: broadcastState.value.message2,
    useTwoMessages: broadcastState.value.useTwoMessages,
    minInterval: broadcastState.value.minInterval || 3,
    maxInterval: broadcastState.value.maxInterval || 7,
    typingMode: broadcastState.value.typingMode || 'instant',
    maxRetries: broadcastState.value.maxRetries ?? 1,
    batchCooldownEvery: broadcastState.value.batchCooldownEvery ?? 20,
    batchCooldownSeconds: broadcastState.value.batchCooldownSeconds ?? 45,
    useBatching: broadcastState.value.useBatching || false,
    batchSize: broadcastState.value.batchSize || 10,
    batchDelayMinutes: broadcastState.value.batchDelayMinutes || 2,
    enableSpintax: broadcastState.value.enableSpintax ?? true,
    onProgress: onBroadcastProgress
  })
}

function pauseBroadcast() {
  broadcastState.value.status = 'paused'
  pauseRealBroadcast()
  saveCurrentState()
}

function resumeBroadcast() {
  broadcastState.value.status = 'sending'
  resumeRealBroadcast()
  saveCurrentState()
}

function stopBroadcast() {
  broadcastState.value.status = 'idle'
  broadcastState.value.currentIndex = 0
  stopRealBroadcast()
  saveCurrentState()
}

function downloadLogs() {
  const content = broadcastState.value.logs.join('\n')
  downloadCSV(content, `real-broadcast-log-${Date.now()}.txt`)
}

onMounted(async () => {
  await loadSavedState()
  isPremium.value = await getIsPremium()
  chrome.storage.onChanged.addListener(handleStorageChange)
})

onUnmounted(() => {
  chrome.storage.onChanged.removeListener(handleStorageChange)
})
</script>

<style scoped>
.ac-broadcast {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-subtext {
  font-size: 0.72rem;
  color: #64748b;
}
.ac-resume-banner {
  background: #fffbeb;
  border: 1px solid #fcd34d;
}
.ac-checkbox-label {
  font-size: 0.78rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.ac-progress-bar-bg {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}
.ac-progress-bar-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s ease;
}
.ac-log-box {
  max-height: 140px;
  overflow-y: auto;
  background: #0f172a;
  color: #38bdf8;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ac-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(3px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}
.ac-modal-content {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
}
.ac-cat-pill {
  padding: 3px 8px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  color: #64748b;
  transition: all 0.15s ease;
}
.ac-cat-pill.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}
.ac-inbox-contact-row {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ac-inbox-contact-row:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.ac-inbox-contact-row.selected {
  background: #eff6ff;
  border-color: #93c5fd;
}
</style>


