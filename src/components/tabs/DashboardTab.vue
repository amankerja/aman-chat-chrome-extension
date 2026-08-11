<template>
  <div class="ac-dashboard">
    <!-- Header Title & Date Filter -->
    <div class="ac-section-header">
      <div>
        <h2 class="ac-dashboard-title">Ringkasan Aktivitas</h2>
        <span class="ac-subtext">Pantau statistik & performa WhatsApp Business Anda secara real-time</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="ac-btn secondary sm" @click="refreshData">🔄 Refresh</button>
        <button class="ac-btn secondary sm" @click="exportReportCSV">📊 Ekspor Laporan</button>
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
        <div class="ac-trend-badge gray">
          <span>Total broadcast</span>
        </div>
      </div>

      <div class="ac-stat-card">
        <div class="ac-stat-card-header">
          <span class="ac-stat-card-title">Berhasil</span>
          <span class="ac-stat-card-icon">✅</span>
        </div>
        <div class="ac-stat-card-value text-green">{{ analytics.totalSuccess }}</div>
        <div class="ac-trend-badge green">
          <span>{{ successRatePct }}%</span> success rate
        </div>
      </div>

      <div class="ac-stat-card">
        <div class="ac-stat-card-header">
          <span class="ac-stat-card-title">Auto Reply</span>
          <span class="ac-stat-card-icon">🤖</span>
        </div>
        <div class="ac-stat-card-value text-blue">{{ analytics.autoRepliesTriggered }}</div>
        <div class="ac-trend-badge green">
          <span>Terpanggil otomatis</span>
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

    <!-- Weekly 7-Day Trend Chart -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Tren 7 Hari Terakhir</h3>
        <span class="ac-badge" :class="successRateBadgeClass">Success rate: {{ successRatePct }}%</span>
      </div>
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="ac-bar-chart" preserveAspectRatio="xMidYMid meet">
        <g v-for="(day, i) in dailyTrend" :key="day.date">
          <rect
            :x="i * barSlotWidth + 6"
            :y="chartHeight - 16 - barHeight(day.success)"
            :width="barWidth"
            :height="barHeight(day.success)"
            fill="#22c55e"
            rx="2"
          />
          <rect
            :x="i * barSlotWidth + 6 + barWidth + 3"
            :y="chartHeight - 16 - barHeight(day.failed)"
            :width="barWidth"
            :height="barHeight(day.failed)"
            fill="#ef4444"
            rx="2"
          />
          <text :x="i * barSlotWidth + barSlotWidth / 2" :y="chartHeight - 4" text-anchor="middle" class="ac-chart-label">{{ day.shortLabel }}</text>
        </g>
      </svg>
      <div class="ac-chart-legend">
        <span><i class="ac-dot" style="background:#22c55e"></i> Berhasil</span>
        <span><i class="ac-dot" style="background:#ef4444"></i> Gagal</span>
        <span><i class="ac-dot" style="background:#2563eb"></i> Auto Reply 7 Hari: {{ weeklyAutoReplies }}</span>
      </div>
    </div>

    <!-- CRM Pipeline Breakdown -->
    <div class="ac-card" v-if="crmCount > 0">
      <h3 class="ac-label">Pipeline CRM</h3>
      <div class="ac-pipeline-list">
        <div v-for="stage in pipelineBreakdown" :key="stage.key" class="ac-pipeline-row">
          <span class="ac-pipeline-label">{{ stage.label }}</span>
          <div class="ac-pipeline-bar-bg">
            <div class="ac-pipeline-bar-fill" :style="{ width: stage.pct + '%', background: stage.color }"></div>
          </div>
          <span class="ac-pipeline-count">{{ stage.count }}</span>
        </div>
      </div>
    </div>

    <!-- Activity Timeline -->
    <div class="ac-card">
      <div class="ac-section-header">
        <h3 class="ac-label">Aktivitas Terkini (Timeline)</h3>
      </div>

      <div class="ac-activity-timeline">
        <div class="ac-activity-item">
          <span class="ac-activity-time">Real-time</span>
          <span class="ac-activity-icon">📢</span>
          <div class="ac-activity-content">
            <span class="ac-activity-title">Broadcast Massal</span>
            <span class="ac-activity-desc">Kampanye {{ analytics.campaignsCount }} dijalankan dengan proteksi jeda & Spintax</span>
          </div>
        </div>
        <div class="ac-activity-divider"></div>
        <div class="ac-activity-item">
          <span class="ac-activity-time">Otomatis</span>
          <span class="ac-activity-icon">🤖</span>
          <div class="ac-activity-content">
            <span class="ac-activity-title">Auto Reply Bot</span>
            <span class="ac-activity-desc">Total {{ analytics.autoRepliesTriggered }} balasan otomatis telah diproses</span>
          </div>
        </div>
        <div class="ac-activity-divider"></div>
        <div class="ac-activity-item">
          <span class="ac-activity-time">Aktif</span>
          <span class="ac-activity-icon">🔒</span>
          <div class="ac-activity-content">
            <span class="ac-activity-title">Privasi & Keamanan</span>
            <span class="ac-activity-desc">Sistem blur & PIN lock siap melindungi tampilan WhatsApp Web</span>
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
import type { Analytics, FollowUpTask, CRMContact, DailyStat } from '../../types'
import {
  getAnalytics,
  setAnalytics,
  getFollowUpTasks,
  setFollowUpTasks,
  getCRMContacts,
  getPrivacySettings,
  setPrivacySettings,
  getDailyStatsMap
} from '../../utils/storage'
import { openPhoneChat } from '../../utils/waAutomation'
import { isValidPhoneNumber, downloadCSV, formatDate } from '../../utils/helpers'

const analytics = ref<Analytics>({
  totalSent: 0,
  totalSuccess: 0,
  totalFailed: 0,
  autoRepliesTriggered: 0,
  campaignsCount: 0
})

const crmContacts = ref<CRMContact[]>([])
const crmCount = computed(() => crmContacts.value.length)
const privacyActive = ref(false)
const showDirectChat = ref(false)
const quickPhone = ref('')
const tasks = ref<FollowUpTask[]>([])
const showAddTask = ref(false)
const newTaskText = ref('')
const newTaskContact = ref('')
const dailyStatsMap = ref<Record<string, DailyStat>>({})

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const dailyTrend = computed(() => {
  const days: (DailyStat & { shortLabel: string })[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const existing = dailyStatsMap.value[key]
    days.push({
      date: key,
      sent: existing?.sent || 0,
      success: existing?.success || 0,
      failed: existing?.failed || 0,
      autoReplies: existing?.autoReplies || 0,
      shortLabel: DAY_LABELS[d.getDay()]
    })
  }
  return days
})

const weeklyAutoReplies = computed(() =>
  dailyTrend.value.reduce((sum, d) => sum + d.autoReplies, 0)
)

const successRatePct = computed(() => {
  const total = analytics.value.totalSuccess + analytics.value.totalFailed
  if (total === 0) return analytics.value.totalSent > 0 ? Math.round((analytics.value.totalSuccess / analytics.value.totalSent) * 100) : 100
  return Math.round((analytics.value.totalSuccess / total) * 100)
})

const successRateBadgeClass = computed(() =>
  successRatePct.value >= 80 ? 'hauling' : successRatePct.value >= 50 ? 'queuing' : 'idle-status'
)

// Chart geometry
const chartWidth = 294
const chartHeight = 100
const barSlotWidth = chartWidth / 7
const barWidth = 12

const maxDailyValue = computed(() =>
  Math.max(1, ...dailyTrend.value.map(d => Math.max(d.success, d.failed)))
)

function barHeight(value: number): number {
  const usableHeight = chartHeight - 20
  return Math.round((value / maxDailyValue.value) * usableHeight)
}

const STAGE_META: Record<CRMContact['stage'], { label: string; color: string }> = {
  lead: { label: 'Lead', color: '#94a3b8' },
  prospect: { label: 'Prospect', color: '#f59e0b' },
  customer: { label: 'Customer', color: '#22c55e' },
  churned: { label: 'Churned', color: '#ef4444' }
}

const pipelineBreakdown = computed(() => {
  const counts: Record<string, number> = { lead: 0, prospect: 0, customer: 0, churned: 0 }
  for (const c of crmContacts.value) {
    counts[c.stage] = (counts[c.stage] || 0) + 1
  }
  const max = Math.max(1, ...Object.values(counts))
  return (Object.keys(STAGE_META) as CRMContact['stage'][]).map(key => ({
    key,
    label: STAGE_META[key].label,
    color: STAGE_META[key].color,
    count: counts[key] || 0,
    pct: Math.round(((counts[key] || 0) / max) * 100)
  }))
})

async function refreshData() {
  analytics.value = await getAnalytics()
  crmContacts.value = await getCRMContacts()
  tasks.value = await getFollowUpTasks()
  const privacy = await getPrivacySettings()
  privacyActive.value = privacy.blurChats || privacy.blurMessages || privacy.blurAvatars
  dailyStatsMap.value = await getDailyStatsMap()
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
  let csv = `METRIK LAPORAN AMAN CHAT,NILAI\n`
  csv += `Waktu Generate Laporan,${dateStr}\n`
  csv += `Total Pesan Broadcast Terkirim,${analytics.value.totalSent}\n`
  csv += `Broadcast Berhasil,${analytics.value.totalSuccess}\n`
  csv += `Broadcast Gagal,${analytics.value.totalFailed}\n`
  csv += `Success Rate (%),${successRatePct.value}%\n`
  csv += `Total Kampanye Broadcast,${analytics.value.campaignsCount}\n`
  csv += `Auto Reply Ditrigger,${analytics.value.autoRepliesTriggered}\n`
  csv += `Total Kontak CRM,${crmCount.value}\n\n`

  csv += 'Pipeline CRM\n'
  csv += 'Stage,Jumlah\n'
  for (const stage of pipelineBreakdown.value) {
    csv += `${stage.label},${stage.count}\n`
  }
  csv += '\n'

  csv += 'Tren 7 Hari Terakhir\n'
  csv += 'Tanggal,Terkirim,Berhasil,Gagal,Auto Reply\n'
  for (const d of dailyTrend.value) {
    csv += `${d.date},${d.sent},${d.success},${d.failed},${d.autoReplies}\n`
  }

  downloadCSV(csv, `laporan-analitik-aman-chat-${Date.now()}.csv`)
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
.ac-bar-chart {
  width: 100%;
  height: 100px;
}
.ac-chart-label {
  font-size: 7px;
  fill: #64748b;
}
.ac-chart-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 0.68rem;
  color: #64748b;
  align-items: center;
}
.ac-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}
.ac-pipeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}
.ac-pipeline-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ac-pipeline-label {
  width: 64px;
  font-size: 0.72rem;
  color: #334155;
  flex-shrink: 0;
}
.ac-pipeline-bar-bg {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}
.ac-pipeline-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.ac-pipeline-count {
  width: 24px;
  text-align: right;
  font-size: 0.72rem;
  font-weight: 600;
  color: #334155;
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

