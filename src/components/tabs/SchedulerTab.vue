<template>
  <div class="ac-scheduler">
    <div class="ac-section-header">
      <h2 class="ac-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Jadwal Pesan Terjadwal
      </h2>
      <button class="ac-btn primary sm" @click="showForm = true">+ Buat Jadwal</button>
    </div>

    <!-- Create Schedule Card -->
    <div v-if="showForm" class="ac-card">
      <h3 class="ac-label">Jadwalkan Pesan Baru</h3>
      <div class="ac-form-group">
        <label class="ac-label">Nomor WhatsApp Tujuan</label>
        <input
          v-model="form.phone"
          type="text"
          class="ac-input"
          placeholder="contoh: 628123456789 atau 08123456789"
        />
      </div>

      <div class="ac-form-group">
        <label class="ac-label">Waktu Pengiriman</label>
        <input
          v-model="form.datetime"
          type="datetime-local"
          class="ac-input"
        />
      </div>

      <div class="ac-form-group">
        <label class="ac-label">Isi Pesan Terjadwal</label>
        <textarea
          v-model="form.message"
          class="ac-textarea"
          placeholder="Tuliskan pesan yang ingin dikirimkan secara otomatis pada jadwal yang ditentukan..."
        ></textarea>
      </div>

      <div class="ac-grid-2">
        <button
          class="ac-btn primary sm"
          :disabled="!form.phone || !form.datetime || !form.message"
          @click="saveSchedule"
        >
          Simpan Jadwal
        </button>
        <button class="ac-btn secondary sm" @click="cancelForm">
          Batal
        </button>
      </div>
    </div>

    <!-- Scheduled Messages List Card -->
    <div class="ac-card">
      <h3 class="ac-label">Daftar Pesan Terjadwal</h3>
      <p class="ac-subtext">Pesan akan dikirimkan otomatis ketika jam dan tanggal tujuan tercapai saat WhatsApp Web dibuka.</p>

      <div v-if="scheduledList.length === 0" class="ac-empty-state">
        Belum ada pesan terjadwal.
      </div>

      <div v-else class="ac-schedule-list">
        <div v-for="item in scheduledList" :key="item.id" class="ac-schedule-item">
          <div class="ac-schedule-header">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="ac-contact-name">{{ item.phone }}</span>
              <span class="ac-badge" :class="getStatusClass(item.status)">
                {{ item.status.toUpperCase() }}
              </span>
            </div>
            <button class="ac-btn danger sm" style="padding: 2px 6px;" @click="deleteSchedule(item.id)">✕</button>
          </div>
          <div class="ac-subtext" style="color: #2563eb; font-weight: 600;">
            ⏰ Waktu Kirim: {{ formatDateTime(item.scheduledTime) }}
          </div>
          <p class="ac-schedule-body">{{ item.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ScheduledMessage } from '../../types'
import { getScheduledMessages, setScheduledMessages } from '../../utils/storage'
import { formatPhoneNumber, formatDate } from '../../utils/helpers'

const scheduledList = ref<ScheduledMessage[]>([])
const showForm = ref(false)

const form = ref({
  phone: '',
  datetime: '',
  message: ''
})

async function loadSchedules() {
  scheduledList.value = await getScheduledMessages()
}

function formatDateTime(ts: number): string {
  return formatDate(ts)
}

function getStatusClass(status: ScheduledMessage['status']): string {
  switch (status) {
    case 'pending': return 'queuing'
    case 'sent': return 'customer'
    case 'failed': return 'churned'
    default: return 'lead'
  }
}

function cancelForm() {
  showForm.value = false
  form.value = { phone: '', datetime: '', message: '' }
}

async function saveSchedule() {
  if (!form.value.phone || !form.value.datetime || !form.value.message) return
  const cleanPhone = formatPhoneNumber(form.value.phone)
  const sendTime = new Date(form.value.datetime).getTime()

  if (sendTime <= Date.now()) {
    alert('Waktu pengiriman harus di masa depan!')
    return
  }

  const newItem: ScheduledMessage = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    phone: cleanPhone,
    message: form.value.message.trim(),
    scheduledTime: sendTime,
    status: 'pending',
    createdAt: Date.now()
  }

  scheduledList.value.push(newItem)
  await setScheduledMessages(scheduledList.value)
  cancelForm()
}

async function deleteSchedule(id: string) {
  scheduledList.value = scheduledList.value.filter(s => s.id !== id)
  await setScheduledMessages(scheduledList.value)
}

onMounted(() => {
  loadSchedules()
})
</script>

<style scoped>
.ac-scheduler {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-schedule-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
.ac-schedule-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ac-schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ac-schedule-body {
  font-size: 0.78rem;
  color: #334155;
  background: #ffffff;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
}
</style>
