<template>
  <div class="app-shell">
    <aside class="sidebar">
      <nuxt-link to="/" class="logo-block">
        <div class="logo-icon">
          <span class="logo-hex">&#x25C8;</span>
        </div>
        <div class="logo-text">
          <span class="logo-title">ServerPulse</span>
          <span class="logo-subtitle">Infrastructure Monitor</span>
        </div>
      </nuxt-link>

      <nav class="nav-items">
        <nuxt-link to="/" class="nav-item" active-class="nav-active">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </span>
          <span>总览</span>
        </nuxt-link>
        <nuxt-link to="/settings" class="nav-item" active-class="nav-active">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </span>
          <span>服务器管理</span>
        </nuxt-link>

        <template v-if="route.params.id">
          <div class="nav-divider" />
          <div class="nav-label">服务器详情</div>
          <nuxt-link :to="`/servers/${route.params.id}`" class="nav-item nav-sub" active-class="nav-active">
            <span class="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z"/></svg>
            </span>
            <span>系统指标</span>
          </nuxt-link>
          <nuxt-link :to="`/servers/${route.params.id}/docker`" class="nav-item nav-sub" active-class="nav-active">
            <span class="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.5"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>
            </span>
            <span>Docker</span>
          </nuxt-link>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div class="sys-status">
          <div class="status-dot live" />
          <span>系统运行中</span>
        </div>
        <div class="sys-time">{{ nowText }}</div>
      </div>
    </aside>

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const nowText = ref('')
const update = () => {
  nowText.value = new Date().toLocaleString('zh-CN', { hour12: false })
}
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  update()
  timer = setInterval(update, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

/* ---- Sidebar ---- */
.sidebar {
  width: 240px;
  min-width: 240px;
  background: linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-base) 100%);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 100;
}

.logo-block {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  padding: 4px 4px 20px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 24px;
}

.logo-icon {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.logo-hex {
  color: #fff;
  font-size: 20px;
}

.logo-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-accent);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.logo-subtitle {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-top: 1px;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.nav-active {
  background: var(--bg-elevated);
  color: var(--accent-primary);
  box-shadow: inset 2px 0 0 var(--accent-primary);
}

.nav-icon {
  display: flex;
  align-items: center;
  opacity: 0.7;
}

.nav-active .nav-icon {
  opacity: 1;
}

.nav-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 8px 4px;
}

.nav-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 4px 12px 6px;
}

.nav-sub {
  padding-left: 28px;
  font-size: 13px;
}

.sidebar-footer {
  border-top: 1px solid var(--border-subtle);
  padding-top: 16px;
}

.sys-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.status-dot.live {
  background: var(--status-ok);
  box-shadow: 0 0 8px var(--status-ok);
  animation: pulse-glow 2s ease-in-out infinite;
}

.sys-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
}

/* ---- Main ---- */
.main-content {
  flex: 1;
  min-width: 0;
  padding: 28px 32px 40px;
  overflow-x: hidden;
}
</style>
