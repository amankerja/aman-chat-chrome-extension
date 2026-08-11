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
      <span class="ac-subtext">Total terdeteksi: {{ parsedNumbers.length }} nomor</span>
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

    <!-- Progress & Controls Card -->
    <div class="ac-card">
      <h3 class="ac-label">Kontrol & Progress Real</h3>
      
      <div class="ac-progress-bar-bg">
        <div class="ac-progress-bar-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>

      <div class="ac-grid-4" style="margin-top: 6px;">
        <div class="ac-stat-box">
          <span class="ac-stat-label">Total</span>
          <span class="ac-stat-value">{{ parsedNumbers.length }}</span>
        </div>
        <div class="ac-stat-box">
          <span class="ac-stat-label">Proses</span>
          <span class="ac-stat-value" style="color: #15803d;">{{ broadcastState.currentIndex }}</span>
        </div>
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
  stopRealBroadcast
} from '../../utils/waAutomation'

const rawNumbers = ref('')

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
  typingMode: 'instant'
})

const parsedNumbers = computed(() => {
  return rawNumbers.value
    .split('\n')
    .map(n => n.replace(/[^0-9]/g, ''))
    .filter(n => n.length >= 8)
})

const progressPercentage = computed(() => {
  if (parsedNumbers.value.length === 0) return 0
  return Math.round((broadcastState.value.currentIndex / parsedNumbers.value.length) * 100)
})

async function loadSavedState() {
  const saved = await getBroadcastState()
  if (saved) {
    broadcastState.value = saved
    if (saved.numbers.length > 0) {
      rawNumbers.value = saved.numbers.join('\n')
    }
  }
}

// Fix: previously the broadcast state was only loaded once on mount. If the
// user switched to another tab mid-broadcast, this component would be
// unmounted; when they came back, a brand-new component (with a brand-new
// state ref) was created and never heard about progress made while it was
// gone. Listening for chrome.storage.onChanged keeps the UI live no matter
// how many times the tab is switched away and back.
function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
  if (areaName === 'local' && changes.wku_broadcast_state) {
    const newState = changes.wku_broadcast_state.newValue as BroadcastState | undefined
    if (newState) {
      broadcastState.value = newState
    }
  }
}

async function saveCurrentState() {
  broadcastState.value.numbers = parsedNumbers.value
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

async function startBroadcast() {
  if (parsedNumbers.value.length === 0 || !broadcastState.value.message) return

  broadcastState.value.status = 'sending'
  broadcastState.value.currentIndex = 0
  broadcastState.value.logs = []
  await saveCurrentState()

  runRealBroadcast(
    parsedNumbers.value,
    broadcastState.value.message,
    broadcastState.value.message2,
    broadcastState.value.useTwoMessages,
    broadcastState.value.minInterval || 3,
    broadcastState.value.maxInterval || 7,
    broadcastState.value.typingMode || 'instant',
    (progress) => {
      broadcastState.value.currentIndex = progress.index
      broadcastState.value.logs.push(progress.log)

      if (progress.done) {
        broadcastState.value.status = 'completed'
      }

      saveCurrentState()
    },
    {
      useBatching: broadcastState.value.useBatching || false,
      batchSize: broadcastState.value.batchSize || 10,
      batchDelayMinutes: broadcastState.value.batchDelayMinutes || 2,
      enableSpintax: broadcastState.value.enableSpintax ?? true
    }
  )
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
