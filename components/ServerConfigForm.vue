<template>
  <div class="config-form-overlay" v-if="visible" @click.self="$emit('close')">
    <div class="config-form glass-card glow-border">
      <h2 class="form-title">{{ isEdit ? '编辑服务器' : '添加服务器' }}</h2>

      <div class="form-body">
        <div class="form-field">
          <label class="form-label">名称</label>
          <input v-model="form.name" class="form-input" placeholder="生产应用服务器" />
        </div>

        <div class="form-row">
          <div class="form-field flex-1">
            <label class="form-label">主机地址</label>
            <input v-model="form.host" class="form-input" placeholder="192.168.1.100" />
          </div>
          <div class="form-field" style="width: 100px">
            <label class="form-label">端口</label>
            <input v-model.number="form.port" class="form-input" type="number" placeholder="22" />
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">用户名</label>
          <input v-model="form.username" class="form-input" placeholder="root" />
        </div>

        <div class="form-field">
          <label class="form-label">认证方式</label>
          <div class="chip-toggle">
            <button :class="['chip', { active: form.authType === 'password' }]" @click="form.authType = 'password'">密码</button>
            <button :class="['chip', { active: form.authType === 'key' }]" @click="form.authType = 'key'">SSH 密钥</button>
          </div>
        </div>

        <div v-if="form.authType === 'password'" class="form-field">
          <label class="form-label">密码</label>
          <div class="password-wrap">
            <input
              v-model="form.password"
              class="form-input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="输入 SSH 密码"
            />
            <button type="button" class="toggle-pwd" @click="showPassword = !showPassword" :title="showPassword ? '隐藏密码' : '显示密码'">
              <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <div v-if="form.authType === 'key'" class="form-field">
          <label class="form-label">SSH 密钥路径</label>
          <input v-model="form.sshKeyPath" class="form-input" placeholder="/home/user/.ssh/id_rsa 或直接粘贴私钥内容" />
        </div>

        <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>
      </div>

      <div class="form-actions">
        <button class="btn btn-ghost" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="save" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ServerConfig } from '~/types/config'

const props = defineProps<{
  visible: boolean
  editingConfig?: ServerConfig | null
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const isEdit = computed(() => !!props.editingConfig)

const defaultForm = () => ({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  authType: 'password' as 'password' | 'key',
  password: '',
  sshKeyPath: '',
})

const form = reactive(defaultForm())
const saving = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

watch(() => props.visible, (v) => {
  if (v && props.editingConfig) {
    Object.assign(form, {
      name: props.editingConfig.name,
      host: props.editingConfig.host,
      port: props.editingConfig.port,
      username: props.editingConfig.username,
      authType: props.editingConfig.authType,
      password: props.editingConfig.password || '',
      sshKeyPath: props.editingConfig.sshKeyPath || '',
    })
  } else if (v) {
    Object.assign(form, defaultForm())
  }
  errorMsg.value = ''
  showPassword.value = false
})

async function save() {
  errorMsg.value = ''
  if (!form.name.trim() || !form.host.trim() || !form.username.trim()) {
    errorMsg.value = '请填写名称、主机地址和用户名'
    return
  }

  saving.value = true
  try {
    const body: any = {
      name: form.name.trim(),
      host: form.host.trim(),
      port: form.port || 22,
      username: form.username.trim(),
      authType: form.authType,
    }
    if (form.authType === 'password') {
      if (!form.password) { errorMsg.value = '请输入密码'; saving.value = false; return }
      body.password = form.password
    } else {
      if (!form.sshKeyPath.trim()) { errorMsg.value = '请输入 SSH 密钥路径或内容'; saving.value = false; return }
      body.sshKeyPath = form.sshKeyPath.trim()
    }

    if (isEdit.value) {
      await $fetch(`/api/configs/${props.editingConfig!.id}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/configs', { method: 'POST', body })
    }

    emit('saved')
  } catch (e: any) {
    errorMsg.value = e.data?.message || e.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.config-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.config-form {
  width: 100%;
  max-width: 480px;
  padding: 28px 32px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 24px;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-input {
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.08);
}

.form-row {
  display: flex;
  gap: 12px;
}
/* Password toggle */
.password-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrap .form-input {
  width: 100%;
  padding-right: 40px;
}

.toggle-pwd {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: color 0.2s;
}

.toggle-pwd:hover {
  color: var(--text-primary);
}

.chip-toggle {
  display: flex;
  gap: 8px;
}

.chip {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.chip.active {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 230, 160, 0.08));
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.form-error {
  color: var(--status-critical);
  font-size: 13px;
  padding: 10px 14px;
  background: rgba(255, 61, 79, 0.1);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 61, 79, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
}

.btn {
  padding: 10px 24px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}
.btn-ghost:hover {
  border-color: var(--border-accent);
  color: var(--text-primary);
}
.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: #080c14;
}
.btn-primary:hover {
  box-shadow: var(--glow-accent);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
