<template>
  <div class="cover-wrap">
    <div class="cover-band" :style="coverStyle">
      <div class="orb o1"></div>
      <div class="orb o2"></div>
      <div class="orb o3"></div>
      <span class="brand-text">HobitGo</span>
    </div>

    <!-- Avatar + nivel chip -->
    <div class="avatar-row">
      <div class="avatar-wrap">
        <svg class="ring-svg" viewBox="0 0 108 108">
          <circle cx="54" cy="54" r="49" class="ring-track"/>
          <circle cx="54" cy="54" r="49" class="ring-fill"
            :stroke-dasharray="`${levelProgress * 3.08} 308`"/>
        </svg>
        <!-- Foto o inicial -->
        <div class="avatar-inner">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="avatar-img"/>
          <div v-else class="avatar-initial">{{ initial }}</div>
        </div>
        <!-- Botón editar foto -->
        <label v-if="isOwner" class="btn-edit-photo" title="Cambiar foto">
          <svg viewBox="0 0 14 14" fill="none" width="11">
            <path d="M10 2l2 2-7.5 7.5H3v-1.5L10 2z"
              stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          </svg>
          <input type="file" accept="image/*" hidden @change="$emit('upload', $event)"/>
        </label>
      </div>

      <!-- Chip nivel -->
      <div class="level-chip">
        <span class="chip-dot"></span>
        Nv. {{ userLevel }} · {{ levelName }}
      </div>
    </div>

    <!-- Nombre, handle y bio -->
    <div class="info-block">
      <h1 class="username">{{ profile.username || 'Tu perfil' }}</h1>
      <p class="handle">@{{ handle }}</p>
      <p class="bio" :class="{ empty: !profile.bio }">
        {{ profile.bio || 'Sin bio todavía...' }}
      </p>
      <!-- Tags de hobbies -->
      <div v-if="hobbies.length" class="hobby-tags">
        <span
          v-for="h in hobbies.slice(0, 5)"
          :key="h.id"
          class="htag"
          :style="{ background: h.gradient?.[0] || '#ff6b9d' }"
        >{{ h.name }}</span>
      </div>
    </div>

    <div class="mini-stats">
      <div class="mstat" v-for="s in miniStats" :key="s.label">
        <span class="mstat-num">{{ s.value }}</span>
        <span class="mstat-lbl">{{ s.label }}</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile:       { type: Object, default: () => ({}) },
  avatarUrl:     { type: String, default: '' },
  hobbies:       { type: Array,  default: () => [] },
  userLevel:     { type: Number, default: 1 },
  levelName:     { type: String, default: 'Semilla' },
  levelProgress: { type: Number, default: 0 },
  stats:         { type: Object, default: () => ({}) },
  isOwner:       { type: Boolean, default: true },
})

defineEmits(['upload'])

const initial  = computed(() => (props.profile.username || 'U')[0].toUpperCase())
const handle   = computed(() => (props.profile.username || 'usuario').toLowerCase().replace(/\s/g, ''))

const miniStats = computed(() => [
  { value: props.stats.hobbies        || 0, label: 'hobbies'  },
  { value: props.stats.hobbySessions  || 0, label: 'sesiones' },
  { value: props.stats.challenges     || 0, label: 'retos'    },
  { value: props.stats.points         || 0, label: 'puntos'   },
])

const coverStyle = computed(() => {
  if (!props.hobbies.length)
    return { background: 'linear-gradient(135deg, #22284E, #3d4570)' }
  const colors = props.hobbies.slice(0, 3).map(h => h.gradient?.[0] || '#ff6b9d')
  return { background: `linear-gradient(135deg, ${colors.join(', ')}, #22284E)` }
})
</script>

<style scoped>
.cover-wrap {
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(34,40,78,.08);
  border: 1px solid rgba(34,40,78,.06);
  margin-bottom: 16px;
}

.cover-band {
  height: 130px;
  position: relative;
  overflow: hidden;
  transition: background 1s ease;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(30px);
  opacity: .35;
  animation: float 9s ease-in-out infinite;
}
.o1 { width:140px; height:140px; background:#ff6b9d; top:-40px; right:-20px; }
.o2 { width:100px; height:100px; background:#fff59e; bottom:-30px; left:-10px; animation-delay:2.5s; }
.o3 { width:70px;  height:70px;  background:#ffb3c6; top:20px; left:42%;      animation-delay:5s; }
@keyframes float {
  0%,100% { transform: translate(0,0); }
  50%      { transform: translate(10px,-10px); }
}
.brand-text {
  position: absolute; bottom:10px; right:14px;
  font-size: 10px; font-weight: 800;
  letter-spacing: .18em; text-transform: uppercase;
  color: rgba(255,255,255,.2);
}

.avatar-row {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  padding: 0 20px;
  margin-top: -44px;
  position: relative;
  z-index: 2;
}

.avatar-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
}

.ring-svg {
  position: absolute;
  inset: -7px;
  width: calc(100% + 14px);
  height: calc(100% + 14px);
  transform: rotate(-90deg);
}
.ring-track { fill:none; stroke:rgba(34,40,78,.08); stroke-width:3; }
.ring-fill  {
  fill:none; stroke:#ff6b9d; stroke-width:3; stroke-linecap:round;
  transition: stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1);
}

.avatar-inner {
  width: 88px; height: 88px;
  border-radius: 22px;
  overflow: hidden;
  border: 4px solid #fff;
  box-shadow: 0 4px 18px rgba(34,40,78,.16);
}
.avatar-img     { width:100%; height:100%; object-fit:cover; }
.avatar-initial {
  width:100%; height:100%;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  display: flex; align-items: center; justify-content: center;
  font-size: 34px; font-weight: 900; color: #fff;
}

.btn-edit-photo {
  position: absolute; bottom:-4px; right:-6px;
  width: 26px; height: 26px; border-radius: 8px;
  background: #22284E; border: 2px solid #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff59e;
  transition: transform .2s, opacity .2s;
}
.btn-edit-photo:hover { transform: scale(1.12); }

.level-chip {
  display: flex; align-items: center; gap: 5px;
  background: #22284E; color: #fff59e;
  font-size: 11px; font-weight: 700;
  letter-spacing: .07em; text-transform: uppercase;
  padding: 5px 12px; border-radius: 99px;
  margin-bottom: 6px;
}
.chip-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #ff6b9d;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }

.info-block {
  padding: 14px 20px 0;
}
.username {
  font-size: 22px; font-weight: 900;
  color: #22284E; margin: 0 0 2px;
  letter-spacing: -.5px;
}
.handle {
  font-size: 13px; color: rgba(34,40,78,.4);
  margin: 0 0 8px;
}
.bio {
  font-size: 13px; color: rgba(34,40,78,.65);
  line-height: 1.55; margin: 0 0 10px;
}
.bio.empty { color: rgba(34,40,78,.28); font-style: italic; }

.hobby-tags { display:flex; flex-wrap:wrap; gap:6px; padding-bottom:4px; }
.htag {
  padding: 4px 11px; border-radius: 99px;
  font-size: 11px; font-weight: 700; color: #fff;
}

.mini-stats {
  display: flex;
  border-top: 1px solid rgba(34,40,78,.07);
  margin-top: 16px;
}
.mstat {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  padding: 14px 8px;
  border-right: 1px solid rgba(34,40,78,.06);
}
.mstat:last-child { border-right: none; }
.mstat-num {
  font-size: 20px; font-weight: 900;
  color: #22284E; line-height: 1;
}
.mstat-lbl {
  font-size: 10px; font-weight: 600;
  color: rgba(34,40,78,.38);
  text-transform: uppercase; letter-spacing: .05em;
  margin-top: 3px;
}

@media (max-width: 480px) {
  .cover-band   { height: 100px; }
  .username     { font-size: 18px; }
  .avatar-inner { width:76px; height:76px; border-radius:18px; }
  .avatar-wrap  { width:76px; height:76px; }
  .mstat-num    { font-size: 17px; }
  .info-block   { padding: 12px 16px 0; }
  .avatar-row   { padding: 0 16px; }
  .ring-svg {
    inset: -6px;
    width: calc(100% + 12px);
    height: calc(100% + 12px);
  }
}
</style>