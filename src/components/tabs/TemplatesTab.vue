<template>
  <div class="ac-templates">
    <div class="ac-section-header">
      <h2 class="ac-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        Template Pesan
      </h2>
      <button class="ac-btn primary sm" @click="openAddForm">+ Tambah</button>
    </div>

    <!-- Search & Filter -->
    <div class="ac-card">
      <input
        v-model="searchQuery"
        type="text"
        class="ac-input"
        placeholder="Cari template..."
      />
      <div class="ac-categories">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="ac-cat-pill"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- Add / Edit Template Form -->
    <div v-if="showForm" class="ac-card">
      <h3 class="ac-label">{{ editingId ? 'Edit Template' : 'Tambah Template Baru' }}</h3>
      <div class="ac-form-group">
        <label class="ac-label">Judul Template</label>
        <input v-model="form.name" class="ac-input" placeholder="contoh: Sapaan Pelanggan" />
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Kategori</label>
        <select v-model="form.category" class="ac-select">
          <option value="greeting">Greeting</option>
          <option value="response">Response</option>
          <option value="payment">Payment</option>
          <option value="offline">Offline</option>
          <option value="general">Lainnya</option>
        </select>
      </div>
      <div class="ac-form-group">
        <label class="ac-label">Isi Pesan</label>
        <textarea v-model="form.text" class="ac-textarea" placeholder="Tuliskan isi pesan template..."></textarea>
      </div>
      <div class="ac-grid-2">
        <button class="ac-btn primary sm" :disabled="!form.name || !form.text" @click="saveTemplate">
          Simpan
        </button>
        <button class="ac-btn secondary sm" @click="cancelForm">
          Batal
        </button>
      </div>
    </div>

    <!-- Templates List -->
    <div v-if="filteredTemplates.length === 0" class="ac-empty-state">
      Tidak ada template ditemukan.
    </div>

    <div v-else class="ac-template-list">
      <div v-for="tmpl in filteredTemplates" :key="tmpl.id" class="ac-card">
        <div class="ac-template-header">
          <div class="ac-template-title-group">
            <span class="ac-template-name">{{ tmpl.name }}</span>
            <span class="ac-badge hauling">{{ tmpl.category || 'general' }}</span>
          </div>
          <div class="ac-template-actions">
            <button class="ac-btn secondary sm" title="Salin" @click="copyText(tmpl.text)">📋</button>
            <button class="ac-btn secondary sm" title="Edit" @click="editTemplate(tmpl)">✏️</button>
            <button class="ac-btn danger sm" title="Hapus" @click="deleteTmpl(tmpl.id)">🗑️</button>
          </div>
        </div>
        <p class="ac-template-body">{{ tmpl.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Template } from '../../types'
import { getTemplates, setTemplates } from '../../utils/storage'
import { copyToClipboard } from '../../utils/helpers'

const templates = ref<Template[]>([])
const searchQuery = ref('')
const selectedCategory = ref('all')
const showForm = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  name: '',
  category: 'greeting',
  text: ''
})

const categories = [
  { id: 'all', name: 'Semua' },
  { id: 'greeting', name: 'Greeting' },
  { id: 'response', name: 'Response' },
  { id: 'payment', name: 'Payment' },
  { id: 'offline', name: 'Offline' }
]

const filteredTemplates = computed(() => {
  return templates.value.filter(t => {
    const matchesCategory = selectedCategory.value === 'all' || t.category === selectedCategory.value
    const matchesQuery = t.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         t.text.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesCategory && matchesQuery
  })
})

async function loadTemplates() {
  templates.value = await getTemplates()
}

function openAddForm() {
  editingId.value = null
  form.value = { name: '', category: 'greeting', text: '' }
  showForm.value = true
}

function editTemplate(tmpl: Template) {
  editingId.value = tmpl.id
  form.value = { name: tmpl.name, category: tmpl.category || 'general', text: tmpl.text }
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
}

async function saveTemplate() {
  if (!form.value.name || !form.value.text) return

  if (editingId.value) {
    const item = templates.value.find(t => t.id === editingId.value)
    if (item) {
      item.name = form.value.name
      item.category = form.value.category
      item.text = form.value.text
    }
  } else {
    const newTmpl: Template = {
      id: Date.now().toString(),
      name: form.value.name,
      category: form.value.category,
      text: form.value.text
    }
    templates.value.push(newTmpl)
  }

  await setTemplates(templates.value)
  cancelForm()
}

async function deleteTmpl(id: string) {
  templates.value = templates.value.filter(t => t.id !== id)
  await setTemplates(templates.value)
}

function copyText(text: string) {
  copyToClipboard(text)
  alert('Teks template berhasil disalin!')
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.ac-templates {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.ac-cat-pill {
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  color: #64748b;
}
.ac-cat-pill.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}
.ac-template-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ac-template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ac-template-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ac-template-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
}
.ac-template-actions {
  display: flex;
  gap: 4px;
}
.ac-template-body {
  font-size: 0.78rem;
  color: #334155;
  white-space: pre-wrap;
  line-height: 1.4;
  background: #f8fafc;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
}
</style>
