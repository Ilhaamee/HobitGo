import { ref, computed, nextTick } from 'vue'
import { supabase } from '../lib/supabase.js'

export function useFormatters() {
  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }
  function formatTime(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }
  function formatDate(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }
  function formatFullDate(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return { initials, formatTime, formatDate, formatFullDate }
}

export function useTyping({ currentUserId, profile }) {
  const typingUsers = ref([])
  let typingTimer = null
  let typingSub = null

  async function notifyTyping(groupId, isCommunity = true) {
    if (!groupId) return
    if (isCommunity) {
      await supabase.from('typing_indicators').upsert({
        group_id: groupId,
        user_id: currentUserId,
        username: profile?.username,
        typing: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_id,user_id' })
    } else {
      await supabase.from('typing_indicators').insert({
        receiver_id: groupId,
        user_id: currentUserId,
        username: profile?.username,
        typing: true,
        updated_at: new Date().toISOString()
      })
    }

    clearTimeout(typingTimer)
    typingTimer = setTimeout(async () => {
      if (isCommunity) {
        await supabase.from('typing_indicators')
          .update({ typing: false })
          .eq('group_id', groupId)
          .eq('user_id', currentUserId)
      } else {
        await supabase.from('typing_indicators').delete()
          .eq('receiver_id', groupId)
          .eq('user_id', currentUserId)
      }
    }, 3000)
  }

  function subscribeTyping(groupId, isCommunity = true) {
    if (typingSub) supabase.removeChannel(typingSub)
    const filter = isCommunity
      ? `group_id=eq.${groupId}`
      : `receiver_id=eq.${currentUserId}`
    typingSub = supabase.channel(`typing-${groupId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'typing_indicators',
        filter
      }, payload => {
        const row = payload.new
        if (!row || row.user_id === currentUserId) return
        if (isCommunity && row.group_id !== groupId) return
        if (!isCommunity && row.user_id !== groupId) return
        if (row.typing) {
          if (!typingUsers.value.includes(row.username)) typingUsers.value.push(row.username)
        } else {
          typingUsers.value = typingUsers.value.filter(u => u !== row.username)
        }
      })
      .subscribe()
  }

  function cleanupTyping() {
    if (typingSub) supabase.removeChannel(typingSub)
    typingUsers.value = []
  }

  return { typingUsers, notifyTyping, subscribeTyping, cleanupTyping }
}

export function useMessageActions({ messagesRef, tableName }) {
  const editingMsg = ref(null)
  const editText   = ref('')
  const replyingTo = ref(null)

  function startEdit(msg) {
    editingMsg.value = msg
    editText.value = msg.content || ''
  }
  async function saveEdit() {
    if (!editingMsg.value || !editText.value.trim()) return
    const { data, error } = await supabase
      .from(tableName)
      .update({ content: editText.value.trim(), edited_at: new Date().toISOString() })
      .eq('id', editingMsg.value.id)
      .select()
      .single()
    if (!error && data) {
      const idx = messagesRef.value.findIndex(m => m.id === data.id)
      if (idx !== -1) messagesRef.value[idx] = { ...messagesRef.value[idx], ...data }
    }
    editingMsg.value = null
    editText.value = ''
  }
  function cancelEdit() {
    editingMsg.value = null
    editText.value = ''
  }

  async function deleteMessage(msg) {
    await supabase.from(tableName).delete().eq('id', msg.id)
    messagesRef.value = messagesRef.value.filter(m => m.id !== msg.id)
  }

  function replyTo(msg) {
    replyingTo.value = msg
  }
  function cancelReply() {
    replyingTo.value = null
  }

  return {
    editingMsg, editText, replyingTo,
    startEdit, saveEdit, cancelEdit, deleteMessage, replyTo, cancelReply
  }
}

export function useScroll(messagesRef) {
  async function scrollToBottom() {
    await nextTick()
    if (messagesRef?.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  }
  return { scrollToBottom }
}

export function useGroupedMessages(messagesRef, formatDateFn) {
  const grouped = computed(() => {
    const groups = []
    let lastDate = null
    for (const msg of messagesRef.value) {
      const d = formatDateFn(msg.created_at)
      if (d !== lastDate) {
        groups.push({ type: 'date', label: d })
        lastDate = d
      }
      groups.push({ type: 'msg', ...msg })
    }
    return groups
  })
  return { grouped }
}