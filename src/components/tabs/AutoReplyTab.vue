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
        Auto Reply Bot
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

    <!-- Add Rule Form -->
    <div v-if="showForm" class="ac-card">
      <h3 class="ac-label">Tambah Aturan Kata Kunci</h3>
      <div class="ac-form-group">
        <label class="ac-label">Kata Kunci (pisahkan dengan koma)</label>
        <input v-model="ruleForm.keywords" class="ac-input" placeholder="contoh: harga, price, berapa" />
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Pesan Balasan</label>
        <textarea v-model="ruleForm.reply" class="ac-textarea" placeholder="Tuliskan jawaban otomatis..."></textarea>
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
      <div v-if="rules.length === 0" class="ac-empty-state">
        Belum ada aturan auto reply yang ditambahkan.
      </div>
      <div v-else class="ac-rule-list">
        <div v-for="rule in rules" :key="rule.id" class="ac-rule-item">
          <div class="ac-rule-header">
            <span class="ac-badge queuing ac-code-font">{{ rule.keywords }}</span>
            <div class="ac-rule-controls">
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
import type { AutoReplyRule } from '../../types'
import {
  getAutoReplyEnabled,
  setAutoReplyEnabled,
  getAutoReplyMode,
  setAutoReplyMode,
  getAutoReplyRules,
  setAutoReplyRules
} from '../../utils/storage'

const autoReplyEnabled = ref(false)
const autoReplyMode = ref<'all' | 'keywords'>('keywords')
const rules = ref<AutoReplyRule[]>([])
const showForm = ref(false)

const ruleForm = ref({
  keywords: '',
  reply: ''
})

async function loadSettings() {
  autoReplyEnabled.value = await getAutoReplyEnabled()
  autoReplyMode.value = await getAutoReplyMode()
  rules.value = await getAutoReplyRules()
}

async function saveMasterSettings() {
  await setAutoReplyEnabled(autoReplyEnabled.value)
  await setAutoReplyMode(autoReplyMode.value)
}

async function saveRule() {
  if (!ruleForm.value.keywords || !ruleForm.value.reply) return
  const newRule: AutoReplyRule = {
    id: Date.now().toString(),
    keywords: ruleForm.value.keywords,
    reply: ruleForm.value.reply,
    active: true
  }
  rules.value.push(newRule)
  await setAutoReplyRules(rules.value)
  ruleForm.value = { keywords: '', reply: '' }
  showForm.value = false
}

async function updateRulesList() {
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
