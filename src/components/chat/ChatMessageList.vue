<script setup>
import { ref, computed, nextTick } from 'vue'
import { useFormatters } from '../../funciones/useChat.js'

const props = defineProps({
  messages:        { type: Array, required: true },
  currentUserId:   { type: String, required: true },
  isOwn:           { type: Function, required: true },
  typingText:      { type: String, default: '' },
  showAuthor:      { type: Boolean, default: true },
  avatarSource:    { type: String, default: 'profile' },
  activeAvatar:    { type: String, default: null },
  enableImageClick:{ type: Boolean, default: false },
})

const emit = defineEmits([
  'reaction', 'reply', 'edit', 'delete', 'image-click'
])

const { initials, formatTime } = useFormatters()

const contextMenu = ref({ show: false, x: 0, y: 0, msg: null })
const showEmojiPicker = ref(false)
const emojiTargetMsg = ref(null)
const emojiPickerRef = ref(null)
const messagesContainerRef = ref(null)

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🎉', '🔥', '👏']

// Longpress para móvil 
let longPressTimer = null
const LONG_PRESS_MS = 250

function onTouchStart(e, msg) {
  longPressTimer = setTimeout(() => {
    // Simular posición en el centro del elemento tocado
    const touch = e.touches[0]
    const fakeEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      clientX: touch.clientX,
      clientY: touch.clientY,
    }
    showContextMenu(fakeEvent, msg)
    // Vibración táctil si está disponible
    if (navigator.vibrate) navigator.vibrate(40)
  }, LONG_PRESS_MS)
}

function onTouchEnd() {
  clearTimeout(longPressTimer)
}

function onTouchMove() {
  clearTimeout(longPressTimer)
}

function showContextMenu(e, msg) {
  e.preventDefault()
  e.stopPropagation()
  const isMobile = window.innerWidth <= 768
  contextMenu.value = {
    show: true,
    x: isMobile ? (window.innerWidth / 2 - 80) : Math.min(e.clientX, window.innerWidth - 170),
    y: isMobile ? (window.innerHeight - 220) : Math.min(e.clientY, window.innerHeight - 120),
    msg,
    mobile: isMobile,
  }
}

function closeContextMenu() {
  contextMenu.value.show = false
}

function openEmojiPicker(msg, event) {
  emojiTargetMsg.value = msg
  showEmojiPicker.value = true
  nextTick(() => {
    const picker = emojiPickerRef.value
    if (picker && event) {
      const rect = event.target.getBoundingClientRect()
      let left = rect.left
      let top = rect.top - 50
      if (left + 280 > window.innerWidth) left = window.innerWidth - 290
      if (top < 10) top = rect.bottom + 10
      picker.style.left = left + 'px'
      picker.style.top = top + 'px'
    }
  })
}

function closeEmojiPicker() {
  showEmojiPicker.value = false
  emojiTargetMsg.value = null
}

function onReaction(msg, emoji) {
  emit('reaction', msg, emoji)
  closeEmojiPicker()
}

function getAvatarUrl(item) {
  if (props.avatarSource === 'active' && props.activeAvatar) {
    return props.activeAvatar
  }
  return item.profiles?.avatar_url || null
}

function getUsername(item) {
  return item.profiles?.username || item.username || 'Usuario'
}

async function scrollToBottom() {
  await nextTick()
  if (messagesContainerRef.value) {
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
  }
}

defineExpose({ scrollToBottom, messagesContainerRef })
</script>

<template>
  <div
    ref="messagesContainerRef"
    class="messages"
    @click="closeContextMenu(); closeEmojiPicker()"
  >
    <template v-for="item in messages" :key="item.id || item.label">
      <!-- Date separator -->
      <div v-if="item.type === 'date'" class="date-sep">
        <span>{{ item.label }}</span>
      </div>

      <!-- Message -->
      <template v-else>
        <!-- Reply preview -->
        <div
          v-if="item.reply_to && item.reply_preview"
          class="reply-preview"
          :class="isOwn(item) ? 'own' : 'other'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <path d="M9 14L4 9l5-5"/>
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
          </svg>
          <span>{{ item.reply_preview }}</span>
        </div>

        <!-- Message row -->
        <div
          class="msg-row"
          :class="isOwn(item) ? 'own' : 'other'"
          @contextmenu="showContextMenu($event, item)"
          @touchstart.passive="onTouchStart($event, item)"
          @touchend="onTouchEnd"
          @touchmove="onTouchMove"
        >
          <div v-if="!isOwn(item)" class="msg-av">
            <img v-if="getAvatarUrl(item)" :src="getAvatarUrl(item)" />
            <span v-else>{{ initials(getUsername(item)) }}</span>
          </div>
          <div class="msg-bubble" :class="isOwn(item) ? 'own' : 'other'">
            <span v-if="!isOwn(item) && showAuthor" class="msg-author">
              {{ getUsername(item) }}
            </span>
            <img
              v-if="item.image_url"
              :src="item.image_url"
              class="msg-img"
              :class="{ clickable: enableImageClick }"
              @click="enableImageClick && $emit('image-click', item.image_url)"
            />
            <p v-if="item.content">{{ item.content }}</p>
            <span v-if="item.edited_at" class="edited-tag">(editado)</span>
            <span class="msg-time">{{ formatTime(item.created_at) }}</span>
          </div>
        </div>

        <!-- Reactions -->
        <div class="reactions-bar" :class="isOwn(item) ? 'own' : 'other'">
          <button
            v-for="(users, emoji) in (item.reactions || {})"
            :key="emoji"
            class="reaction-chip"
            :class="{ active: users.includes(currentUserId) }"
            @click.stop="onReaction(item, emoji)"
          >
            {{ emoji }} {{ users.length }}
          </button>
          <button
            class="reaction-add"
            @click.stop="openEmojiPicker(item, $event)"
            title="Añadir reacción"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>
        </div>
      </template>
    </template>

    <!-- Typing indicator -->
    <div v-if="typingText" class="typing-indicator">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
      <span>{{ typingText }}</span>
    </div>

    <!-- Empty state -->
    <div v-if="!messages.length" class="no-msgs">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>Sé el primero en escribir</p>
    </div>

    <!-- Emoji Picker -->
    <div v-if="showEmojiPicker" ref="emojiPickerRef" class="emoji-picker" @click.stop>
      <button v-for="emoji in EMOJIS" :key="emoji" @click="onReaction(emojiTargetMsg, emoji)">
        {{ emoji }}
      </button>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :class="{ 'mobile-sheet': contextMenu.mobile }"
      :style="contextMenu.mobile
        ? { position: 'fixed', left: '12px', right: '12px', bottom: 'calc(80px + env(safe-area-inset-bottom))', zIndex: 1000 }
        : { position: 'fixed', left: contextMenu.x + 'px', top: contextMenu.y + 'px', zIndex: 1000 }"
      @click.stop
    >
      <button @click.stop="$emit('reply', contextMenu.msg); closeContextMenu()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
        </svg>
        Responder
      </button>
      <button v-if="isOwn(contextMenu.msg)" @click.stop="$emit('edit', contextMenu.msg); closeContextMenu()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Editar
      </button>
      <button v-if="isOwn(contextMenu.msg)" @click.stop="$emit('delete', contextMenu.msg); closeContextMenu()" class="danger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Eliminar
      </button>
    </div>
  </div>
</template>

<style scoped>
.messages {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-sep { text-align: center; margin: 10px 0; flex-shrink: 0; }
.date-sep span {
  font-size: 11px; font-weight: 600; color: rgba(34,40,78,.35);
  background: #f4f5f9; padding: 3px 12px; border-radius: 99px;
}

.reply-preview {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 8px;
  font-size: 11px; color: rgba(34,40,78,.5);
  max-width: 68%; margin-bottom: 2px;
}
.reply-preview.own { align-self: flex-end; background: rgba(34,40,78,.04); border-left: 2px solid rgba(34,40,78,.15); }
.reply-preview.other { align-self: flex-start; background: rgba(34,40,78,.04); border-left: 2px solid rgba(34,40,78,.15); }
.reply-preview svg { flex-shrink: 0; }
.reply-preview span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 2px;
  flex-shrink: 0;
}
.msg-row.own { justify-content: flex-end; }
.msg-row.other { justify-content: flex-start; }

.msg-av {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0; overflow: hidden;
}
.msg-av img { width: 100%; height: 100%; object-fit: cover; }

.msg-bubble {
  max-width: 68%; padding: 10px 14px;
  border-radius: 18px; display: flex; flex-direction: column; gap: 3px;
  flex-shrink: 0; position: relative;
}
.msg-bubble.own {
  background: linear-gradient(135deg, #22284E, #3d4570);
  color: #fff; border-bottom-right-radius: 4px;
}
.msg-bubble.other {
  background: #f4f5f9;
  color: #22284E; border-bottom-left-radius: 4px;
}
.msg-author { font-size: 11px; font-weight: 700; color: #ff6b9d; }
.msg-bubble p { margin: 0; font-size: 14px; line-height: 1.5; word-break: break-word; }
.msg-time { font-size: 10px; opacity: .55; align-self: flex-end; }
.msg-bubble.own .msg-time { color: rgba(255,255,255,.6); }
.edited-tag { font-size: 9px; opacity: .5; align-self: flex-end; }

.msg-img {
  max-width: 200px; border-radius: 10px;
  display: block; margin-bottom: 4px;
  transition: opacity .2s, transform .2s;
}
.msg-img.clickable { cursor: pointer; }
.msg-img.clickable:hover { opacity: .88; transform: scale(1.02); }

/* Reactions */
.reactions-bar { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px; min-height: 26px; }
.reactions-bar.own { justify-content: flex-end; padding-right: 8px; }
.reactions-bar.other { justify-content: flex-start; padding-left: 36px; }

.reaction-chip {
  padding: 2px 8px; border-radius: 99px; border: 1px solid rgba(34,40,78,.1);
  background: #fff; font-size: 12px; cursor: pointer;
  transition: all .15s; display: flex; align-items: center; gap: 3px;
  line-height: 1.4;
}
.reaction-chip.active { background: rgba(255,107,157,.1); border-color: rgba(255,107,157,.3); }
.reaction-chip:hover { transform: scale(1.1); }

.reaction-add {
  width: 22px; height: 22px; border-radius: 50%;
  border: 1px dashed rgba(34,40,78,.2); background: transparent;
  color: rgba(34,40,78,.4); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s; padding: 0;
}
.reaction-add:hover {
  border-color: #ff6b9d; color: #ff6b9d;
  background: rgba(255,107,157,.05);
}
.reaction-add svg { display: block; }

/* Typing indicator */
.typing-indicator {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 16px 8px; color: rgba(34,40,78,.4);
  font-size: 12px; flex-shrink: 0;
}
.typing-dots { display: flex; gap: 3px; }
.typing-dots span {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(34,40,78,.3);
  animation: typingBounce 1.4s infinite ease-in-out both;
}
.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }
@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.no-msgs {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: rgba(34,40,78,.25);
}
.no-msgs p { font-size: 13px; margin: 0; }

/* Emoji picker */
.emoji-picker {
  position: fixed;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0,0,0,.15);
  padding: 8px;
  z-index: 1001;
  display: flex;
  gap: 4px;
  border: 1px solid rgba(34,40,78,.08);
}
.emoji-picker button {
  width: 36px; height: 36px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emoji-picker button:hover {
  background: rgba(255,107,157,.1);
  transform: scale(1.15);
}

/* Context Menu */
.context-menu {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,.15);
  padding: 4px;
  z-index: 1000;
  min-width: 160px;
  border: 1px solid rgba(34,40,78,.08);
}
.context-menu button {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 12px;
  border: none; background: transparent;
  font-size: 13px; color: #22284E;
  cursor: pointer; border-radius: 8px;
  transition: background .15s;
  text-align: left;
}
.context-menu button:hover { background: rgba(34,40,78,.04); }
.context-menu button.danger { color: #dc2626; }
.context-menu button.danger:hover { background: rgba(220,38,38,.06); }
.context-menu button svg { flex-shrink: 0; }

@media (max-width: 768px) {
  .messages { padding: 12px; }
  .msg-bubble { max-width: 80%; padding: 8px 12px; }
  .context-menu { min-width: unset; }
  .context-menu.mobile-sheet {
    border-radius: 18px;
    padding: 8px;
    box-shadow: 0 -4px 32px rgba(0,0,0,.18);
    animation: slideUp .2s ease;
  }
  .context-menu.mobile-sheet button {
    padding: 13px 16px;
    font-size: 15px;
    border-radius: 12px;
    justify-content: flex-start;
  }
  .context-menu.mobile-sheet button svg { width: 18px; height: 18px; }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  .emoji-picker { padding: 6px; gap: 2px; }
  .emoji-picker button { width: 32px; height: 32px; font-size: 16px; }
}
</style>