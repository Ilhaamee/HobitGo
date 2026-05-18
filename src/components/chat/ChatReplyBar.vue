<script setup>
const props = defineProps({
  replyingTo:  { type: Object, default: null },
  authorName:  { type: String, default: '' },
  previewText: { type: String, default: '' },
})

const emit = defineEmits(['cancel'])
</script>

<template>
  <div v-if="replyingTo" class="reply-bar">
    <div class="reply-info">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M9 14L4 9l5-5"/>
        <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
      </svg>
      <span>Respondiendo a {{ authorName }}</span>
      <span class="reply-preview-text">{{ previewText }}</span>
    </div>
    <button @click="$emit('cancel')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.reply-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  background: rgba(34,40,78,.03);
  border-top: 1px solid rgba(34,40,78,.06);
  flex-shrink: 0;
}
.reply-info {
  flex: 1; display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: rgba(34,40,78,.5);
}
.reply-info svg { flex-shrink: 0; }
.reply-preview-text {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 200px; opacity: .7;
}
.reply-bar button {
  width: 24px; height: 24px; border-radius: 50%;
  border: none; background: rgba(34,40,78,.08);
  color: rgba(34,40,78,.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.reply-bar button svg { display: block; }
</style>