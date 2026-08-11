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
        <label class="ac-btn secondary sm" style="cursor: pointer;">
          📁 Impor CSV
          <input type="file" accept=".csv" style="display: none;" @change="handleCSVImport" />
        </label>
      </div>
      <textarea
        v-model="rawNumbers"
        class="ac-textarea"
        placeholder="Masukkan nomor HP (satu nomor per baris, contoh: 628123456789)"
        :disabled="broadcastState.status === 'sending'"
      ></textarea>
      <span class="ac-subtext">
        Total terdeteksi: {{ parsedNumbers.length }} nomor unik
        <template v-if="duplicateCount > 0">({{ duplicateCount }} duplikat otomatis dihapus)</template>
      </span>
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
      <span class="ac-subtext" style="margin-top: 4px; display: block;">💡 Gunakan Spintax <code class="ac-code-font">{Kata1|Kata2|Kata3}</code> untuk merotasi variasi kata secara otomatis.</span>

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
          ☕ Pengiriman Bertahap (Batching Anti-Blokir)
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

    <!-- Real Execution Logs -->
    <div class="ac-card" v-if="broadcastState.logs.length > 0">
      <div class="ac-section-header">
        <h3 class="ac-label">Log Riwayat Real Broadcast</h3>
        <button class="ac-btn secondary sm" @click="downloadLogs">Export Log</button>
      </div>
      <div class="ac-log-box ac-code-font">
        <div v-for="(log, idx) in broadcastState.logs" :key="idx" class="ac-log-line">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { BroadcastState } from '../../types'
import { getBroadcastState, setBroadcastState } from '../../utils/storage'
import { downloadCSV } from '../../utils/helpers'
import {
  runRealBroadcast,
  pauseRealBroadcast,
  resumeRealBroadcast,
  stopRealBroadcast,
  isBroadcastActuallyRunning
} from '../../utils/waAutomation'

const rawNumbers = ref('')
const showResumeBanner = ref(false)
const duplicateCount = ref(0)

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

const parsedNumbers = computed(() => {
  const raw = rawNumbers.value
    .split('\n')
    .map(n => n.replace(/[^0-9]/g, ''))
    .filter(n => n.length >= 8)

  const seen = new Set<string>()
  const unique: string[] = []
  for (const n of raw) {
    if (!seen.has(n)) {
      seen.add(n)
      unique.push(n)
    }
  }
  duplicateCount.value = raw.length - unique.length
  return unique
})

const totalNumbers = computed(() => {
  const parsedCount = parsedNumbers.value.length
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
  if (areaName === 'local' && changes.wku_broadcast_state) {
    const newState = changes.wku_broadcast_state.newValue as BroadcastState | undefined
    if (newState) {
      if (!Array.isArray(newState.logs)) newState.logs = []
      if (!Array.isArray(newState.numbers)) newState.numbers = []
      broadcastState.value = newState
    }
  }
}

async function saveCurrentState() {
  broadcastState.value.numbers = parsedNumbers.value
  if (!Array.isArray(broadcastState.value.logs)) {
    broadcastState.value.logs = []
  }
  await setBroadcastState(broadcastState.value)
}

function handleCSVImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (text) {
      const extracted = text
        .split('\n')
        .map(line => line.split(',')[1] || line.split(',')[0] || '')
        .map(n => n.replace(/[^0-9]/g, ''))
        .filter(n => n.length >= 8)

      rawNumbers.value = extracted.join('\n')
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

  saveCurrentState()
}

async function startBroadcast() {
  if (parsedNumbers.value.length === 0 || !broadcastState.value.message) return

  broadcastState.value.status = 'sending'
  broadcastState.value.currentIndex = 0
  broadcastState.value.logs = []
  broadcastState.value.failedNumbers = []
  await saveCurrentState()

  runRealBroadcast({
    numbers: parsedNumbers.value,
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

async function resumeInterruptedBroadcast() {
  showResumeBanner.value = false
  broadcastState.value.status = 'sending'
  const startIndex = broadcastState.value.currentIndex
  await saveCurrentState()

  runRealBroadcast({
    numbers: broadcastState.value.numbers,
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

  rawNumbers.value = failed.join('\n')
  broadcastState.value.status = 'sending'
  broadcastState.value.currentIndex = 0
  broadcastState.value.logs.push(`[${new Date().toLocaleTimeString('id-ID')}] --- Mengirim ulang ke ${failed.length} nomor yang gagal ---`)
  broadcastState.value.failedNumbers = []
  await saveCurrentState()

  runRealBroadcast({
    numbers: failed,
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

onMounted(() => {
  loadSavedState()
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
</style>


