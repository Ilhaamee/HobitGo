<template>
  <div class="post-card" :class="{ featured, 'text-only': !post.image_url }">
    <div v-if="post.image_url" class="post-media" :style="mediaStyle" @click="imageExpanded = true">
      <img :src="post.image_url" :alt="post.hobby_name" class="media-img"/>
      <div class="media-overlay"></div>

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

      <!-- Racha en imagen -->
      <div v-if="post.streak" class="streak-badge">
        🔥 {{ post.streak }}d
      </div>
    </div>

    <!-- Cuerpo del post -->
    <div class="post-body">

      <!-- Header para posts sin imagen -->
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

      <!-- Footer -->
      <div class="post-footer">
        <span class="post-time">{{ timeAgo(post.created_at) }}</span>

        <div class="post-actions">
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

          <!-- Botón comentarios -->
          <button class="btn-comment" :class="{ active: showComments }" @click.stop="toggleComments">
            <svg viewBox="0 0 16 16" fill="none" width="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 7.67a5.6 5.6 0 01-.6 2.53 5.67 5.67 0 01-5.07 3.13 5.6 5.6 0 01-2.53-.6L2 14l1.27-3.8a5.6 5.6 0 01-.6-2.53 5.67 5.67 0 013.13-5.07A5.6 5.6 0 018.33 2H8.5a5.66 5.66 0 015.33 5.33v.34z"/>
            </svg>
            <span>{{ post.comments || 0 }}</span>
          </button>

          <button class="btn-like" :class="{ liked: post.liked }" @click.stop="handleLike">
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

    <!-- Comentarios inline -->
    <Transition name="comments-slide">
      <div v-if="showComments" class="comments-section" @click.stop>

        <div :id="`pc-${post.id}`" class="comments-list">
          <div v-if="commentsLoading" class="comments-loading">
            <div class="spinner-xs"></div>
          </div>
          <div v-else-if="!commentsData.length" class="comments-empty">
            Sé el primero en comentar
          </div>
          <div v-else v-for="c in commentsData" :key="c.id" class="comment-item">
            <div class="comment-avatar">
              <img v-if="c.profiles?.avatar_url" :src="c.profiles.avatar_url" />
              <span v-else>{{ initials(c.profiles?.username) }}</span>
            </div>
            <div class="comment-bubble">
              <span class="comment-author">{{ c.profiles?.username || 'Usuario' }}</span>
              <p class="comment-text">{{ c.content }}</p>
            </div>
            <button
              v-if="(currentUser?.id || myUserId) && c.user_id === (currentUser?.id || myUserId)"
              class="comment-delete"
              @click="deleteComment(c.id)"
            >
              <svg viewBox="0 0 12 12" fill="none" width="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="currentUser || myUserId" class="comment-input-row">
          <div class="comment-input-avatar">
            <img v-if="myAvatar" :src="myAvatar" />
            <span v-else>{{ initials(myUsername) }}</span>
          </div>
          <input
            v-model="newComment"
            class="comment-input"
            placeholder="Escribe un comentario..."
            maxlength="300"
            @keyup.enter="submitComment"
            @click.stop
          />
          <button
            class="comment-send"
            :disabled="!newComment.trim() || submittingComment"
            @click.stop="submitComment"
          >
            <svg viewBox="0 0 20 20" fill="none" width="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 2L9 11M18 2l-6 16-3-7-7-3 16-6z"/>
            </svg>
          </button>
        </div>
        <div v-else class="comment-login-prompt">
          Inicia sesión para comentar
        </div>

      </div>
    </Transition>

    <!-- Lightbox -->
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

    <!-- Modal likes -->
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
        <div v-if="!post.likedBy?.length" class="likes-empty">Nadie ha dado like aún</div>
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
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { supabase } from '../../lib/supabase.js'

const props = defineProps({
  post:        { type: Object,  required: true },
  featured:    { type: Boolean, default: false },
  isOwner:     { type: Boolean, default: false },
  currentUser: { type: Object,  default: null  },
})

const emit = defineEmits(['like', 'delete', 'edit', 'comment-count'])

// UI state
const showLikesModal  = ref(false)
const imageExpanded   = ref(false)

// Comentarios
const showComments      = ref(false)
const commentsData      = ref([])
const commentsLoading   = ref(false)
const newComment        = ref('')
const submittingComment = ref(false)

// Usuario y avatar propios 
const myProfile = ref(null)
const myUserId  = ref(null)

async function loadMyProfile() {
  // Obtener el usuario de auth directamente si el prop aún no llegó
  let userId = props.currentUser?.id
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }
  if (!userId) return
  myUserId.value = userId

  const { data } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', userId)
    .single()
  if (data) myProfile.value = data
}

const myAvatar   = computed(() => myProfile.value?.avatar_url || null)
const myUsername = computed(() => myProfile.value?.username || props.currentUser?.email || '')

function initials(name) {
  return (name || '?')[0].toUpperCase()
}

async function toggleComments() {
  showComments.value = !showComments.value
  if (showComments.value && !commentsData.value.length) {
    await fetchComments()
  }
}

async function fetchComments() {
  commentsLoading.value = true
  const { data } = await supabase
    .from('post_comments')
    .select('*, profiles(id, username, avatar_url)')
    .eq('post_id', props.post.id)
    .order('created_at', { ascending: true })
  commentsData.value    = data || []
  commentsLoading.value = false
}

async function submitComment() {
  if (!props.currentUser?.id && !myUserId.value) return
  const text = newComment.value.trim()
  if (!text) return
  submittingComment.value = true

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: props.post.id, user_id: props.currentUser?.id || myUserId.value, content: text })
    .select('*, profiles(id, username, avatar_url)')
    .single()

  if (!error && data) {
    commentsData.value.push(data)
    newComment.value = ''
    emit('comment-count', { postId: props.post.id, delta: 1 })
    await nextTick()
    const el = document.getElementById(`pc-${props.post.id}`)
    if (el) el.scrollTop = el.scrollHeight
  }
  submittingComment.value = false
}

async function deleteComment(commentId) {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
  if (!error) {
    commentsData.value = commentsData.value.filter(c => c.id !== commentId)
    emit('comment-count', { postId: props.post.id, delta: -1 })
  }
}

onMounted(() => { loadMyProfile() })
watch(() => props.currentUser?.id, (id) => { if (id) loadMyProfile() })

// Likes / tiempo 
const mediaStyle = computed(() => ({}))

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
/* Card base */
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
.post-card.text-only { border-radius: 16px; }
.post-card.text-only .post-body { padding: 16px; gap: 12px; }

/* Media */
.post-media { position: relative; overflow: hidden; cursor: pointer; }
.post-card:not(.featured) .post-media { height: 140px; }
.post-card.featured        .post-media { height: 260px; }
.media-img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease; }
.post-card:hover .media-img { transform: scale(1.04); }
.media-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(20,22,50,.55)); }
.media-top { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
.hobby-badge { font-size: 10px; font-weight: 800; color: #fff; padding: 4px 10px; border-radius: 99px; letter-spacing: .04em; text-transform: uppercase; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
.media-actions { display: flex; gap: 5px; opacity: 0; transition: opacity .2s; }
.post-card:hover .media-actions { opacity: 1; }
.btn-edit { width: 26px; height: 26px; border-radius: 8px; background: rgba(0,0,0,.35); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; transition: background .2s; }
.btn-edit:hover { background: rgba(255,107,157,.7); }
.btn-delete { width: 26px; height: 26px; border-radius: 8px; background: rgba(0,0,0,.35); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; opacity: 0; transition: opacity .2s, background .2s; }
.post-card:hover .btn-delete { opacity: 1; }
.btn-delete:hover { background: rgba(239,68,68,.7); }
.streak-badge { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,.45); backdrop-filter: blur(6px); color: #fff; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 99px; }

/* Header texto */
.post-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
.hobby-badge-inline { font-size: 10px; font-weight: 800; color: #fff; padding: 4px 10px; border-radius: 99px; letter-spacing: .04em; text-transform: uppercase; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.header-actions { display: flex; gap: 5px; opacity: 0; transition: opacity .2s; }
.post-card:hover .header-actions { opacity: 1; }
.btn-edit-inline, .btn-delete-inline { width: 26px; height: 26px; border-radius: 8px; background: rgba(34,40,78,.08); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(34,40,78,.5); transition: background .2s, color .2s; }
.btn-edit-inline:hover { background: rgba(255,107,157,.15); color: #ff6b9d; }
.btn-delete-inline:hover { background: rgba(239,68,68,.15); color: #ef4444; }

/* Body */
.post-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.post-text { font-size: 14px; color: rgba(34,40,78,.85); line-height: 1.55; margin: 0; }
.post-text.clamped { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.post-card.text-only .post-text { font-size: 15px; line-height: 1.6; color: rgba(34,40,78,.9); }

/* Footer */
.post-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.post-time { font-size: 11px; color: rgba(34,40,78,.35); }
.post-actions { display: flex; align-items: center; gap: 8px; }
.streak-badge-inline { display: flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; color: #ff6b9d; background: rgba(255,107,157,.1); padding: 3px 8px; border-radius: 99px; }
.mins-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(34,40,78,.4); background: rgba(34,40,78,.05); padding: 3px 8px; border-radius: 99px; }

/* Botón comentario */
.btn-comment {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 700;
  color: rgba(34,40,78,.4);
  padding: 4px 6px; border-radius: 8px;
  transition: all .2s;
}
.btn-comment:hover { background: rgba(59,130,246,.08); color: #3b82f6; }
.btn-comment.active { color: #3b82f6; background: rgba(59,130,246,.1); }

.btn-like { display: flex; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 700; color: rgba(34,40,78,.4); transition: color .2s, transform .15s; padding: 4px; }
.btn-like:hover { transform: scale(1.12); }
.btn-like.liked { color: #ff6b9d; }
.btn-like svg { transition: transform .2s; }
.btn-like:active svg { transform: scale(1.3); }
.likes-count { font-size: 12px; font-weight: 700; color: rgba(34,40,78,.4); cursor: pointer; padding: 4px; transition: color .2s; }
.likes-count:hover { color: #ff6b9d; }

/* Comentarios inline */
.comments-section {
  border-top: 1px solid rgba(34,40,78,.06);
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 10px;
}
.comments-slide-enter-active, .comments-slide-leave-active { transition: all .25s ease; overflow: hidden; }
.comments-slide-enter-from, .comments-slide-leave-to { opacity: 0; transform: translateY(-4px); }

.comments-list { display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; padding-right: 2px; }
.comments-list::-webkit-scrollbar { width: 3px; }
.comments-list::-webkit-scrollbar-thumb { background: rgba(34,40,78,.1); border-radius: 99px; }
.comments-loading { display: flex; justify-content: center; padding: 12px; }
.comments-empty { text-align: center; font-size: 12px; color: rgba(34,40,78,.4); padding: 8px; }

.comment-item { display: flex; align-items: flex-start; gap: 7px; }
.comment-avatar { width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #ff6b9d, #ffb3c6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9px; font-weight: 800; }
.comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
.comment-bubble { flex: 1; background: rgba(34,40,78,.04); border-radius: 10px; padding: 6px 10px; }
.comment-author { font-size: 10px; font-weight: 700; color: #22284E; display: block; margin-bottom: 1px; }
.comment-text { font-size: 12px; color: rgba(34,40,78,.8); margin: 0; line-height: 1.5; }
.comment-delete { background: none; border: none; cursor: pointer; color: rgba(34,40,78,.2); padding: 3px; border-radius: 5px; opacity: 0; transition: all .2s; flex-shrink: 0; align-self: center; }
.comment-item:hover .comment-delete { opacity: 1; }
.comment-delete:hover { color: #ef4444; background: rgba(239,68,68,.08); }

.comment-input-row { display: flex; align-items: center; gap: 7px; }
.comment-input-avatar { width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #ff6b9d, #ffb3c6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9px; font-weight: 800; }
.comment-input-avatar img { width: 100%; height: 100%; object-fit: cover; }
.comment-input { flex: 1; border: 1.5px solid rgba(34,40,78,.1); border-radius: 16px; padding: 6px 12px; font-size: 12px; color: #22284E; font-family: inherit; background: rgba(34,40,78,.02); outline: none; transition: border-color .2s; }
.comment-input:focus { border-color: #ff6b9d; background: #fff; }
.comment-input::placeholder { color: rgba(34,40,78,.35); }
.comment-send { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #ff6b9d, #ffb3c6); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; transition: all .2s; flex-shrink: 0; }
.comment-send:disabled { opacity: .4; cursor: not-allowed; }
.comment-send:not(:disabled):hover { transform: scale(1.08); }
.comment-login-prompt { text-align: center; font-size: 12px; color: rgba(34,40,78,.4); }

.spinner-xs { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(34,40,78,.1); border-top-color: #ff6b9d; animation: spin .8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Lightbox */
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.92); display: flex; align-items: center; justify-content: center; z-index: 500; cursor: pointer; padding: 20px; }
.lightbox img { max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 12px; }
.lb-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.12); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.fade-enter-active, .fade-leave-active { transition: opacity .22s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Modal likes */
.likes-modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; justify-content: center; z-index: 400; }
@media (min-width: 600px) { .likes-modal { align-items: center; padding: 20px; } }
.likes-content { background: #fff; border-radius: 24px 24px 0 0; width: 100%; max-width: 400px; max-height: 70vh; overflow-y: auto; padding: 20px; }
@media (min-width: 600px) { .likes-content { border-radius: 20px; } }
.likes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.likes-header h4 { font-size: 17px; font-weight: 800; color: #22284E; margin: 0; }
.likes-close { width: 32px; height: 32px; border-radius: 50%; background: rgba(34,40,78,.06); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(34,40,78,.5); }
.likes-empty { text-align: center; color: rgba(34,40,78,.4); padding: 20px; font-size: 14px; }
.likes-list { display: flex; flex-direction: column; gap: 12px; }
.like-user { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.like-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.like-avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #ff6b9d, #ffb3c6); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; }
.like-username { font-size: 15px; font-weight: 600; color: #22284E; }
</style>