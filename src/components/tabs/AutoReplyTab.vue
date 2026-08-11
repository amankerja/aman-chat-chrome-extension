<template>
  <div class="ac-autoreply">
    <div class="ac-section-header">
      <h2 class="ac-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="11" r="1"/>
          <circle cx="8" cy="11" r="1"/>
          <circle cx="16" cy="11" r="1"/>
        </svg>
        Auto Reply Bot Pintar
      </h2>
      <button class="ac-btn primary sm" @click="showForm = true">+ Aturan Baru</button>
    </div>

    <!-- Master Switch Card -->
    <div class="ac-card">
      <div class="ac-toggle-row">
        <div>
          <h3 class="ac-label">Status Auto Reply</h3>
          <p class="ac-subtext">Aktifkan respon otomatis untuk pesan masuk</p>
        </div>
        <label class="ac-switch">
          <input type="checkbox" v-model="autoReplyEnabled" @change="saveMasterSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="ac-form-group" style="margin-top: 10px;">
        <label class="ac-label">Mode Auto Reply</label>
        <select v-model="autoReplyMode" class="ac-select" @change="saveMasterSettings">
          <option value="keywords">Berdasarkan Kata Kunci (Keywords)</option>
          <option value="all">Respon Semua Pesan Masuk</option>
        </select>
      </div>
    </div>

    <!-- Working Hours Schedule Card -->
    <div class="ac-card">
      <div class="ac-toggle-row">
        <div>
          <h3 class="ac-label">⏰ Jadwal Jam Kerja</h3>
          <p class="ac-subtext">Kirim balasan khusus di luar jam operasional bisnis Anda</p>
        </div>
        <label class="ac-switch">
          <input type="checkbox" v-model="advancedSettings.useWorkingHours" @change="saveAdvancedSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div v-if="advancedSettings.useWorkingHours" style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
        <div class="ac-grid-2">
          <div class="ac-form-group">
            <label class="ac-label">Jam Buka</label>
            <input type="time" v-model="advancedSettings.workingHoursStart" class="ac-input" @change="saveAdvancedSettings" />
          </div>
          <div class="ac-form-group">
            <label class="ac-label">Jam Tutup</label>
            <input type="time" v-model="advancedSettings.workingHoursEnd" class="ac-input" @change="saveAdvancedSettings" />
          </div>
        </div>

        <div class="ac-form-group">
          <label class="ac-label">Pesan Di Luar Jam Kerja (Offline)</label>
          <textarea v-model="advancedSettings.outOfHoursReply" class="ac-textarea" placeholder="Tuliskan pesan balasan di luar jam kerja..." @change="saveAdvancedSettings"></textarea>
        </div>
      </div>
    </div>

    <!-- Cooldown & Default Reply Card -->
    <div class="ac-card">
      <h3 class="ac-label">⚙️ Cooldown & Balasan Default</h3>
      <div class="ac-form-group" style="margin-top: 8px;">
        <label class="ac-label">Cooldown Per Kontak (Menit)</label>
        <input type="number" v-model.number="advancedSettings.cooldownMinutes" min="0" max="1440" class="ac-input" placeholder="5" @change="saveAdvancedSettings" />
        <p class="ac-subtext">Cegah membalas berulang kali ke kontak yang sama dalam rentang menit ini (0 = Matikan Cooldown)</p>
      </div>

      <div class="ac-toggle-row" style="margin-top: 10px;">
        <div>
          <h3 class="ac-label">Balasan Default (Fallback)</h3>
          <p class="ac-subtext">Kirim balasan ini jika tidak ada kata kunci yang cocok</p>
        </div>
        <label class="ac-switch">
          <input type="checkbox" v-model="advancedSettings.defaultReplyEnabled" @change="saveAdvancedSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div v-if="advancedSettings.defaultReplyEnabled" class="ac-form-group" style="margin-top: 8px;">
        <textarea v-model="advancedSettings.defaultReplyText" class="ac-textarea" placeholder="Tulis pesan default jika kata kunci tidak cocok..." @change="saveAdvancedSettings"></textarea>
      </div>
    </div>

    <!-- Add Rule Form -->
    <div v-if="showForm" class="ac-card">
      <h3 class="ac-label">Tambah Aturan Kata Kunci</h3>
      <div class="ac-form-group">
        <label class="ac-label">Tipe Pencocokan</label>
        <select v-model="ruleForm.matchType" class="ac-select">
          <option value="contains">Mengandung Kata (contains)</option>
          <option value="exact">Persis Sama (exact)</option>
          <option value="startsWith">Diawali Kata (startsWith)</option>
          <option value="regex">Regular Expression (regex)</option>
        </select>
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Kata Kunci (pisahkan dengan koma)</label>
        <input v-model="ruleForm.keywords" class="ac-input" placeholder="contoh: harga, price, berapa" />
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Pesan Balasan</label>
        <textarea v-model="ruleForm.reply" class="ac-textarea" placeholder="Tuliskan jawaban otomatis... bisa pakai {sapaan} dan {jam}"></textarea>
        <p class="ac-subtext">Variabel: <code>{{ '{sapaan}' }}</code> → Pagi/Siang/Sore/Malam, <code>{{ '{jam}' }}</code> → jam saat ini</p>
      </div>
      <div class="ac-grid-2">
        <button class="ac-btn primary sm" :disabled="!ruleForm.keywords || !ruleForm.reply" @click="saveRule">
          Simpan Aturan
        </button>
        <button class="ac-btn secondary sm" @click="showForm = false">
          Batal
        </button>
      </div>
    </div>

    <!-- Rules List -->
    <div class="ac-card">
      <h3 class="ac-label">Daftar Aturan Auto Reply</h3>
      <p class="ac-subtext">Aturan paling atas diperiksa lebih dulu — gunakan panah untuk mengubah prioritas.</p>
      <div v-if="rules.length === 0" class="ac-empty-state">
        Belum ada aturan auto reply yang ditambahkan.
      </div>
      <div v-else class="ac-rule-list">
        <div v-for="(rule, idx) in rules" :key="rule.id" class="ac-rule-item">
          <div class="ac-rule-header">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="ac-badge queuing ac-code-font">{{ rule.keywords }}</span>
              <span class="ac-badge loading" style="font-size: 0.65rem;">{{ matchTypeLabel(rule.matchType) }}</span>
            </div>
            <div class="ac-rule-controls">
              <button class="ac-btn secondary sm" style="padding: 2px 6px;" :disabled="idx === 0" @click="moveRule(idx, -1)">↑</button>
              <button class="ac-btn secondary sm" style="padding: 2px 6px;" :disabled="idx === rules.length - 1" @click="moveRule(idx, 1)">↓</button>
              <label class="ac-switch">
                <input type="checkbox" v-model="rule.active" @change="updateRulesList" />
                <span class="slider"></span>
              </label>
              <button class="ac-btn danger sm" style="padding: 2px 6px;" @click="deleteRule(rule.id)">✕</button>
            </div>
          </div>
          <p class="ac-rule-reply">{{ rule.reply }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { AutoReplyRule, AutoReplySettings, MatchType } from '../../types'
import {
  getAutoReplyEnabled,
  setAutoReplyEnabled,
  getAutoReplyMode,
  setAutoReplyMode,
  getAutoReplyRules,
  setAutoReplyRules,
  getAutoReplyAdvancedSettings,
  setAutoReplyAdvancedSettings,
  getAutoReplyAdvanced,
  setAutoReplyAdvanced
} from '../../utils/storage'

const autoReplyEnabled = ref(false)
const autoReplyMode = ref<'all' | 'keywords'>('keywords')
const rules = ref<AutoReplyRule[]>([])
const showForm = ref(false)

const advancedSettings = ref<AutoReplySettings>({
  enabled: false,
  mode: 'keywords',
  cooldownMinutes: 5,
  useWorkingHours: false,
  workingHoursStart: '08:00',
  workingHoursEnd: '17:00',
  workingDays: [1, 2, 3, 4, 5],
  outOfHoursReply: '',
  defaultReplyEnabled: false,
  defaultReplyText: ''
})

const ruleForm = ref<{ keywords: string; reply: string; matchType: MatchType }>({
  keywords: '',
  reply: '',
  matchType: 'contains'
})

function matchTypeLabel(type?: string): string {
  if (type === 'exact') return 'sama persis'
  if (type === 'startsWith' || type === 'starts_with') return 'diawali'
  if (type === 'regex') return 'regex'
  return 'mengandung'
}

async function loadSettings() {
  autoReplyEnabled.value = await getAutoReplyEnabled()
  autoReplyMode.value = await getAutoReplyMode()
  rules.value = await getAutoReplyRules()
  advancedSettings.value = await getAutoReplyAdvancedSettings()

  const oldAdv = await getAutoReplyAdvanced()
  if (oldAdv) {
    if (oldAdv.cooldownMinutes && !advancedSettings.value.cooldownMinutes) {
      advancedSettings.value.cooldownMinutes = oldAdv.cooldownMinutes
    }
    if (oldAdv.defaultReply && !advancedSettings.value.defaultReplyText) {
      advancedSettings.value.defaultReplyText = oldAdv.defaultReply
    }
    if (oldAdv.schedule?.outsideHoursReply && !advancedSettings.value.outOfHoursReply) {
      advancedSettings.value.outOfHoursReply = oldAdv.schedule.outsideHoursReply
    }
  }
}

async function saveMasterSettings() {
  await setAutoReplyEnabled(autoReplyEnabled.value)
  await setAutoReplyMode(autoReplyMode.value)
}

async function saveAdvancedSettings() {
  await setAutoReplyAdvancedSettings(advancedSettings.value)
  await setAutoReplyAdvanced({
    schedule: {
      enabled: advancedSettings.value.useWorkingHours,
      startHour: parseInt(advancedSettings.value.workingHoursStart.split(':')[0] || '8', 10),
      endHour: parseInt(advancedSettings.value.workingHoursEnd.split(':')[0] || '17', 10),
      outsideHoursReply: advancedSettings.value.outOfHoursReply
    },
    defaultReplyEnabled: advancedSettings.value.defaultReplyEnabled,
    defaultReply: advancedSettings.value.defaultReplyText,
    cooldownMinutes: advancedSettings.value.cooldownMinutes
  })
}

async function saveRule() {
  if (!ruleForm.value.keywords || !ruleForm.value.reply) return
  const newRule: AutoReplyRule = {
    id: Date.now().toString(),
    keywords: ruleForm.value.keywords,
    reply: ruleForm.value.reply,
    active: true,
    matchType: ruleForm.value.matchType
  }
  rules.value.push(newRule)
  await setAutoReplyRules(rules.value)
  ruleForm.value = { keywords: '', reply: '', matchType: 'contains' }
  showForm.value = false
}

async function updateRulesList() {
  await setAutoReplyRules(rules.value)
}

async function moveRule(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= rules.value.length) return
  const list = [...rules.value]
  ;[list[index], list[target]] = [list[target], list[index]]
  rules.value = list
  await setAutoReplyRules(rules.value)
}

async function deleteRule(id: string) {
  rules.value = rules.value.filter(r => r.id !== id)
  await setAutoReplyRules(rules.value)
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.ac-autoreply {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ac-subtext {
  font-size: 0.72rem;
  color: #64748b;
}
.ac-rule-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ac-rule-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ac-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ac-rule-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ac-rule-reply {
  font-size: 0.78rem;
  color: #334155;
}
</style>

