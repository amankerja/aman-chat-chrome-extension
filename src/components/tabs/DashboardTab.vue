<template>
  <div class="ac-dashboard">
    <!-- Header Title & Date Filter -->
    <div class="ac-section-header">
      <div>
        <h2 class="ac-dashboard-title">Ringkasan Hari Ini</h2>
        <span class="ac-subtext">Pantau statistik aktivitas WhatsApp Business Anda secara real-time</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <select class="ac-select-sm">
          <option>Hari Ini ▾</option>
          <option>7 Hari Terakhir</option>
          <option>30 Hari Terakhir</option>
        </select>
        <button class="ac-btn secondary sm" @click="exportReportCSV">📊 Ekspor</button>
      </div>
    </div>

    <!-- 4 Statistics Cards -->
    <div class="ac-grid-4">
      <div class="ac-stat-card">
        <div class="ac-stat-card-header">
          <span class="ac-stat-card-title">Pesan Terkirim</span>
          <span class="ac-stat-card-icon">📤</span>
        </div>
        <div class="ac-stat-card-value">{{ analytics.totalSent }}</div>
        <div class="ac-trend-badge green">
          <span>↑ 14%</span> vs kemarin
        </div>
      </div>

      <div class="ac-stat-card">
        <div class="ac-stat-card-header">
          <span class="ac-stat-card-title">Berhasil</span>
          <span class="ac-stat-card-icon">✅</span>
        </div>
        <div class="ac-stat-card-value text-green">{{ analytics.totalSuccess }}</div>
        <div class="ac-trend-badge green">
          <span>{{ successRate }}%</span> success rate
        </div>
      </div>

      <div class="ac-stat-card">
        <div class="ac-stat-card-header">
          <span class="ac-stat-card-title">Auto Reply</span>
          <span class="ac-stat-card-icon">🤖</span>
        </div>
        <div class="ac-stat-card-value text-blue">{{ analytics.autoRepliesTriggered }}</div>
        <div class="ac-trend-badge green">
          <span>↑ 8%</span> ditrigger
        </div>
      </div>

      <div class="ac-stat-card">
        <div class="ac-stat-card-header">
          <span class="ac-stat-card-title">Kontak CRM</span>
          <span class="ac-stat-card-icon">👥</span>
        </div>
        <div class="ac-stat-card-value">{{ crmCount }}</div>
        <div class="ac-trend-badge gray">
          <span>Pelanggan</span> tersimpan
        </div>
      </div>
    </div>

    <!-- Activity Timeline -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Aktivitas Terkini (Timeline)</h3>
        <button class="ac-btn secondary sm" @click="refreshData">Refresh</button>
      </div>

      <div class="ac-activity-timeline">
        <div class="ac-activity-item">
          <span class="ac-activity-time">Baru Saja</span>
          <span class="ac-activity-icon">📢</span>
          <div class="ac-activity-content">
            <span class="ac-activity-title">Broadcast Massal</span>
            <span class="ac-activity-desc">Kampanye {{ analytics.campaignsCount }} berjalan aktif dengan rotasi Spintax</span>
          </div>
        </div>
        <div class="ac-activity-divider"></div>
        <div class="ac-activity-item">
          <span class="ac-activity-time">5 mnt lalu</span>
          <span class="ac-activity-icon">🤖</span>
          <div class="ac-activity-content">
            <span class="ac-activity-title">Auto Reply Ditrigger</span>
            <span class="ac-activity-desc">Kata kunci cocok diproses dalam jeda cooldown</span>
          </div>
        </div>
        <div class="ac-activity-divider"></div>
        <div class="ac-activity-item">
          <span class="ac-activity-time">15 mnt lalu</span>
          <span class="ac-activity-icon">🔒</span>
          <div class="ac-activity-content">
            <span class="ac-activity-title">Privasi & Security Blur</span>
            <span class="ac-activity-desc">Proteksi blur chat aktif untuk keamanan percakapan</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Card -->
    <div class="ac-card">
      <h3 class="ac-label">Aksi Cepat</h3>
      <div class="ac-grid-2">
        <button class="ac-btn primary sm" @click="openDirectChat">
          📱 Chat Langsung
        </button>
        <button class="ac-btn secondary sm" @click="togglePrivacy">
          🔒 {{ privacyActive ? 'Nonaktifkan Blur' : 'Aktifkan Blur' }}
        </button>
      </div>
    </div>

    <!-- Direct Chat Form Modal/Card -->
    <div v-if="showDirectChat" class="ac-card">
      <h3 class="ac-label">Kirim Pesan Langsung</h3>
      <div class="ac-form-group">
        <input
          v-model="quickPhone"
          type="text"
          class="ac-input"
          placeholder="Nomor HP (contoh: 628123456789)"
        />
        <button class="ac-btn primary sm" :disabled="!quickPhone" @click="startQuickChat">
          Buka Chat WA
        </button>
      </div>
    </div>

    <!-- Follow Up Tasks -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Tugas Follow-up</h3>
        <button class="ac-btn secondary sm" @click="showAddTask = !showAddTask">+ Tambah</button>
      </div>

      <div v-if="showAddTask" class="ac-form-group">
        <input v-model="newTaskText" class="ac-input" placeholder="Isi tugas follow up..." />
        <input v-model="newTaskContact" class="ac-input" placeholder="Nama / No. HP Kontak..." />
        <button class="ac-btn primary sm" :disabled="!newTaskText" @click="addTask">Simpan Tugas</button>
      </div>

      <div v-if="tasks.length === 0" class="ac-empty-state">
        Belum ada tugas follow up.
      </div>
      <div v-else class="ac-task-list">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="ac-task-item"
          :class="{ completed: task.status === 'completed' }"
        >
          <input
            type="checkbox"
            :checked="task.status === 'completed'"
            @change="toggleTaskStatus(task.id)"
          />
          <div class="ac-task-info">
            <span class="ac-task-text">{{ task.text }}</span>
            <span class="ac-task-contact" v-if="task.contact">Kontak: {{ task.contact }}</span>
          </div>
          <button class="ac-btn danger sm" style="padding: 2px 6px;" @click="deleteTask(task.id)">✕</button>
        </div>
      </div>
    </div>

    <!-- Reset Statistics Card -->
    <div class="ac-card" style="border-color: #fee2e2;">
      <div class="ac-section-header">
        <div>
          <h3 class="ac-label" style="color: #b91c1c;">Reset Statistik</h3>
          <p class="ac-subtext">Bersihkan counter laporan statistik broadcast & auto-reply</p>
        </div>
        <button class="ac-btn danger sm" @click="resetAnalyticsData">Reset Statistik</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Analytics, FollowUpTask } from '../../types'
import { getAnalytics, setAnalytics, getFollowUpTasks, setFollowUpTasks, getCRMContacts, getPrivacySettings, setPrivacySettings } from '../../utils/storage'
import { openPhoneChat } from '../../utils/waAutomation'
import { isValidPhoneNumber, downloadCSV, formatDate } from '../../utils/helpers'

const analytics = ref<Analytics>({
  totalSent: 0,
  totalSuccess: 0,
  totalFailed: 0,
  autoRepliesTriggered: 0,
  campaignsCount: 0
})

const crmCount = ref(0)
const privacyActive = ref(false)
const showDirectChat = ref(false)
const quickPhone = ref('')
const tasks = ref<FollowUpTask[]>([])
const showAddTask = ref(false)
const newTaskText = ref('')
const newTaskContact = ref('')

const successRate = computed(() => {
  if (analytics.value.totalSent === 0) return 0
  return Math.round((analytics.value.totalSuccess / analytics.value.totalSent) * 100)
})

async function refreshData() {
  analytics.value = await getAnalytics()
  const crm = await getCRMContacts()
  crmCount.value = crm.length
  tasks.value = await getFollowUpTasks()
  const privacy = await getPrivacySettings()
  privacyActive.value = privacy.blurChats || privacy.blurMessages || privacy.blurAvatars
}

function openDirectChat() {
  showDirectChat.value = !showDirectChat.value
}

function startQuickChat() {
  if (!quickPhone.value) return
  if (!isValidPhoneNumber(quickPhone.value)) {
    alert('Nomor HP tidak valid. Gunakan format internasional, contoh: 628123456789')
    return
  }
  openPhoneChat(quickPhone.value)
  quickPhone.value = ''
  showDirectChat.value = false
}

async function togglePrivacy() {
  const current = await getPrivacySettings()
  const nextVal = !privacyActive.value
  const newSettings = {
    blurChats: nextVal,
    blurPreviews: nextVal,
    blurAvatars: nextVal,
    blurMessages: nextVal,
    blurMedia: nextVal
  }
  await setPrivacySettings(newSettings)
  privacyActive.value = nextVal
}

async function addTask() {
  if (!newTaskText.value.trim()) return
  const newTask: FollowUpTask = {
    id: Date.now().toString(),
    text: newTaskText.value.trim(),
    contact: newTaskContact.value.trim(),
    status: 'pending',
    timestamp: Date.now()
  }
  tasks.value.push(newTask)
  await setFollowUpTasks(tasks.value)
  newTaskText.value = ''
  newTaskContact.value = ''
  showAddTask.value = false
}

async function toggleTaskStatus(id: string) {
  const t = tasks.value.find(item => item.id === id)
  if (t) {
    t.status = t.status === 'completed' ? 'pending' : 'completed'
    await setFollowUpTasks(tasks.value)
  }
}

async function deleteTask(id: string) {
  tasks.value = tasks.value.filter(item => item.id !== id)
  await setFollowUpTasks(tasks.value)
}

function exportReportCSV() {
  const dateStr = formatDate(new Date())
  const csvContent = [
    'METRIK LAPORAN AMAN CHAT,NILAI',
    `Waktu Generate Laporan,${dateStr}`,
    `Total Pesan Broadcast Terkirim,${analytics.value.totalSent}`,
    `Broadcast Berhasil,${analytics.value.totalSuccess}`,
    `Broadcast Gagal,${analytics.value.totalFailed}`,
    `Tingkat Keberhasilan (%),${successRate.value}%`,
    `Total Kampanye Broadcast,${analytics.value.campaignsCount}`,
    `Auto Reply Ditrigger,${analytics.value.autoRepliesTriggered}`,
    `Total Kontak CRM,${crmCount.value}`
  ].join('\n')

  downloadCSV(csvContent, `laporan-analitik-aman-chat-${Date.now()}.csv`)
}

async function resetAnalyticsData() {
  if (confirm('Apakah Anda yakin ingin mereset seluruh data statistik analitik?')) {
    const emptyStats: Analytics = {
      totalSent: 0,
      totalSuccess: 0,
      totalFailed: 0,
      autoRepliesTriggered: 0,
      campaignsCount: 0
    }
    await setAnalytics(emptyStats)
    analytics.value = emptyStats
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.ac-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
.ac-task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ac-task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.ac-task-item.completed .ac-task-text {
  text-decoration: line-through;
  color: #94a3b8;
}
.ac-task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ac-task-text {
  font-size: 0.8rem;
  font-weight: 500;
}
.ac-task-contact {
  font-size: 0.7rem;
  color: #64748b;
}
</style>
