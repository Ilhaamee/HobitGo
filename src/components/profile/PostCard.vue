<template>
  <div class="post-card" :class="{ featured, 'text-only': !post.image_url }">

    <!-- Media: SOLO si hay imagen real -->
    <div v-if="post.image_url" class="post-media" :style="mediaStyle" @click="imageExpanded = true">
      <img :src="post.image_url" :alt="post.hobby_name" class="media-img"/>
      <div class="media-overlay"></div>

      <!-- Info encima de la imagen -->
      <div class="media-top">
        <span v-if="post.hobby_name" class="hobby-badge" :style="{ background: post.hobby_color || '#ff6b9d' }">
          {{ post.hobby_name }}
        </span>
        <div class="media-actions">
          <button v-if="isOwner" class="btn-edit" @click.stop="$emit('edit', post)">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <path d="M10 2l2 2-7.5 7.5H3v-1.5L10 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>
          </button>
          <button v-if="isOwner" class="btn-delete" @click.stop="$emit('delete', post.id)">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <path d="M1 3h12M4 3V2h6v1M5 6v5M9 6v5M2 3l1 9h8l1-9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Racha en imagen (solo aquí, no en footer) -->
      <div v-if="post.streak" class="streak-badge">
        🔥 {{ post.streak }}d
      </div>
    </div>

    <!-- Cuerpo del post -->
    <div class="post-body">

      <!-- Header para posts de solo texto: hobby badge + acciones -->
      <div v-if="!post.image_url" class="post-header">
        <span v-if="post.hobby_name" class="hobby-badge-inline" :style="{ background: post.hobby_color || '#ff6b9d' }">
          {{ post.hobby_name }}
        </span>
        <div class="header-actions">
          <button v-if="isOwner" class="btn-edit-inline" @click.stop="$emit('edit', post)">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <path d="M10 2l2 2-7.5 7.5H3v-1.5L10 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>
          </button>
          <button v-if="isOwner" class="btn-delete-inline" @click.stop="$emit('delete', post.id)">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <path d="M1 3h12M4 3V2h6v1M5 6v5M9 6v5M2 3l1 9h8l1-9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Texto -->
      <p v-if="post.text" class="post-text" :class="{ clamped: !featured && post.image_url }">
        {{ post.text }}
      </p>

      <!-- Footer: tiempo + racha (solo si no hay imagen) + minutos + like -->
      <div class="post-footer">
        <span class="post-time">{{ timeAgo(post.created_at) }}</span>

        <div class="post-actions">
          <!-- Racha en footer SOLO cuando no hay imagen -->
          <span v-if="post.streak && !post.image_url" class="streak-badge-inline">
            🔥 {{ post.streak }}d
          </span>

          <span v-if="post.minutes" class="mins-badge">
            <svg viewBox="0 0 14 14" fill="none" width="11">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M7 4.5V7l1.5 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            {{ post.minutes }}m
          </span>

          <button class="btn-like" :class="{ liked: post.liked }" @click="handleLike">
            <svg viewBox="0 0 16 16" fill="none" width="14">
              <path
                d="M8 14S1 9.5 1 5.5a4 4 0 017-2.65A4 4 0 0115 5.5C15 9.5 8 14 8 14z"
                :fill="post.liked ? '#ff6b9d' : 'none'"
                stroke="#ff6b9d" stroke-width="1.5"
              />
            </svg>
          </button>
          <span class="likes-count" @click.stop="showLikesModal = true">{{ post.likes || 0 }}</span>
        </div>
      </div>

    </div>

    <!-- Lightbox imagen -->
    <Transition name="fade">
      <div v-if="imageExpanded && post.image_url" class="lightbox" @click="imageExpanded = false">
        <img :src="post.image_url" alt="Imagen ampliada" />
        <button class="lb-close">
          <svg viewBox="0 0 14 14" fill="none" width="12">
            <path d="M1 1l12 12M13 1L1 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Modal de quién dio like -->
    <div v-if="showLikesModal" class="likes-modal" @click.self="showLikesModal = false">
      <div class="likes-content">
        <div class="likes-header">
          <h4>Me gusta</h4>
          <button class="likes-close" @click="showLikesModal = false">
            <svg viewBox="0 0 14 14" fill="none" width="12">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <div v-if="!post.likedBy?.length" class="likes-empty">
          Nadie ha dado like aún
        </div>
        
        <div v-else class="likes-list">
          <div v-for="user in post.likedBy" :key="user.userId" class="like-user">
            <img v-if="user.avatar" :src="user.avatar" class="like-avatar" />
            <div v-else class="like-avatar-placeholder">{{ (user.username || 'U')[0] }}</div>
            <span class="like-username">{{ user.username }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  post:     { type: Object,  required: true },
  featured: { type: Boolean, default: false },
  isOwner:  { type: Boolean, default: false },
})

const emit = defineEmits(['like', 'delete', 'edit'])
const showLikesModal = ref(false)

const imageExpanded = ref(false)

const mediaStyle = computed(() => {
  // Solo se aplica cuando hay imagen, pero por si acaso
  if (props.post.image_url) return {}
  return {}
})

function handleLike() {
  emit('like', props.post.id)
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Ayer' : `${d}d`
}
</script>

<style scoped>
/* ── Card base ──────────────────────────── */
.post-card {
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(34,40,78,.07);
  box-shadow: 0 2px 12px rgba(34,40,78,.06);
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s;
}
.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(34,40,78,.12);
}

/* ── Estilo Twitter para posts sin imagen ── */
.post-card.text-only {
  border-radius: 16px;
}
.post-card.text-only .post-body {
  padding: 16px;
  gap: 12px;
}

/* ── Media (solo con imagen) ────────────── */
.post-media {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

/* Altura según variante */
.post-card:not(.featured) .post-media { height: 140px; }
.post-card.featured        .post-media { height: 260px; }

.media-img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform .4s ease;
}
.post-card:hover .media-img { transform: scale(1.04); }

.media-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 40%, rgba(20,22,50,.55));
}

/* Top de la imagen */
.media-top {
  position: absolute; top: 10px;
  left: 10px; right: 10px;
  display: flex; justify-content: space-between; align-items: flex-start;
}

.hobby-badge {
  font-size: 10px; font-weight: 800;
  color: #fff; padding: 4px 10px;
  border-radius: 99px; letter-spacing: .04em;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}

.media-actions {
  display: flex; gap: 5px;
  opacity: 0; transition: opacity .2s;
}
.post-card:hover .media-actions { opacity: 1; }

.btn-edit {
  width: 26px; height: 26px; border-radius: 8px;
  background: rgba(0,0,0,.35); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff;
  transition: background .2s;
}
.btn-edit:hover { background: rgba(255,107,157,.7); }

.btn-delete {
  width: 26px; height: 26px; border-radius: 8px;
  background: rgba(0,0,0,.35); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff; opacity: 0;
  transition: opacity .2s, background .2s;
}
.post-card:hover .btn-delete { opacity: 1; }
.btn-delete:hover { background: rgba(239,68,68,.7); }

/* Racha badge en imagen */
.streak-badge {
  position: absolute; bottom: 10px; right: 10px;
  background: rgba(0,0,0,.45); backdrop-filter: blur(6px);
  color: #fff; font-size: 11px; font-weight: 700;
  padding: 3px 9px; border-radius: 99px;
}

/* ── Header para posts sin imagen ───────── */
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.hobby-badge-inline {
  font-size: 10px; font-weight: 800;
  color: #fff; padding: 4px 10px;
  border-radius: 99px; letter-spacing: .04em;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
}

.header-actions {
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity .2s;
}
.post-card:hover .header-actions { opacity: 1; }

.btn-edit-inline,
.btn-delete-inline {
  width: 26px; height: 26px; border-radius: 8px;
  background: rgba(34,40,78,.08); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: rgba(34,40,78,.5);
  transition: background .2s, color .2s;
}
.btn-edit-inline:hover {
  background: rgba(255,107,157,.15);
  color: #ff6b9d;
}
.btn-delete-inline:hover {
  background: rgba(239,68,68,.15);
  color: #ef4444;
}

/* ── Body ───────────────────────────────── */
.post-body {
  padding: 12px 14px;
  display: flex; flex-direction: column;
  gap: 8px;
}

.post-text {
  font-size: 14px;
  color: rgba(34,40,78,.85);
  line-height: 1.55;
  margin: 0;
}
/* Solo clamp cuando hay imagen */
.post-text.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-card.text-only .post-text {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(34,40,78,.9);
}

/* Footer */
.post-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.post-time { font-size: 11px; color: rgba(34,40,78,.35); }

.post-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Racha badge inline (solo para posts sin imagen) */
.streak-badge-inline {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px; font-weight: 700;
  color: #ff6b9d;
  background: rgba(255,107,157,.1);
  padding: 3px 8px; border-radius: 99px;
}

.mins-badge {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: rgba(34,40,78,.4);
  background: rgba(34,40,78,.05);
  padding: 3px 8px; border-radius: 99px;
}

.btn-like {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 700;
  color: rgba(34,40,78,.4);
  transition: color .2s, transform .15s;
  padding: 4px;
}
.btn-like:hover { transform: scale(1.12); }
.btn-like.liked { color: #ff6b9d; }
.btn-like svg   { transition: transform .2s; }
.btn-like:active svg { transform: scale(1.3); }

/* ── Lightbox ───────────────────────────── */
.lightbox {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.92);
  display: flex; align-items: center; justify-content: center;
  z-index: 500; cursor: pointer; padding: 20px;
}
.lightbox img {
  max-width: 100%; max-height: 90vh;
  object-fit: contain; border-radius: 12px;
}
.lb-close {
  position: absolute; top: 16px; right: 16px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,.12); border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}

.fade-enter-active, .fade-leave-active { transition: opacity .22s; }
.fade-enter-from,   .fade-leave-to    { opacity: 0; }
.likes-count {
  font-size: 12px;
  font-weight: 700;
  color: rgba(34,40,78,.4);
  cursor: pointer;
  padding: 4px;
  transition: color .2s;
}
.likes-count:hover {
  color: #ff6b9d;
}

/* Modal */
.likes-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 400;
}
@media (min-width: 600px) {
  .likes-modal {
    align-items: center;
    padding: 20px;
  }
}

.likes-content {
  background: #fff;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 400px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
}
@media (min-width: 600px) {
  .likes-content {
    border-radius: 20px;
  }
}

.likes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.likes-header h4 {
  font-size: 17px;
  font-weight: 800;
  color: #22284E;
  margin: 0;
}
.likes-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(34,40,78,.06);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(34,40,78,.5);
}

.likes-empty {
  text-align: center;
  color: rgba(34,40,78,.4);
  padding: 20px;
  font-size: 14px;
}

.likes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.like-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.like-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.like-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
}

.like-username {
  font-size: 15px;
  font-weight: 600;
  color: #22284E;
}
</style>