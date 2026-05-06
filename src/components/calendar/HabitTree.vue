<script setup>
import { computed } from 'vue'

const props = defineProps({
  hobbies: { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
  filterHobby: { type: String, default: null },
  maxDaysPerHobby: { type: Number, default: 30 },
})

// Cada sesión done = una hoja (día). Si hay varias sesiones done el mismo día para el mismo hobby,
// se agrupan en una hoja con contador.
function toDateKey(createdAt) {
  // created_at de Supabase viene normalmente como ISO string
  return new Date(createdAt).toISOString().split('T')[0]
}

const doneSessions = computed(() => {
  return props.sessions.filter(s => {
    if (!s.done) return false
    if (props.filterHobby && s.hobby_id !== props.filterHobby) return false
    return true
  })
})

const treeByHobby = computed(() => {
  const byHobby = new Map()

  for (const s of doneSessions.value) {
    const hId = s.hobby_id
    if (!byHobby.has(hId)) byHobby.set(hId, [])
    byHobby.get(hId).push(s)
  }

  // Para cada hobby: agrupar por dateKey y ordenar.
  const out = []
  for (const [hId, list] of byHobby.entries()) {
    const dayMap = new Map()
    for (const s of list) {
      const dk = toDateKey(s.created_at)
      if (!dayMap.has(dk)) dayMap.set(dk, [])
      dayMap.get(dk).push(s)
    }

    const days = [...dayMap.entries()]
      .map(([dateKey, items]) => ({
        dateKey,
        count: items.length,
      }))
      .sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1))

    out.push({
      hobbyId: hId,
      days,
    })
  }

  // Mantener orden por nombre del hobby si existe
  out.sort((a, b) => {
    const ha = props.hobbies.find(h => h.id === a.hobbyId)
    const hb = props.hobbies.find(h => h.id === b.hobbyId)
    const na = ha?.name || a.hobbyId
    const nb = hb?.name || b.hobbyId
    return na.localeCompare(nb)
  })

  return out
})

function colorForHobby(hobbyId) {
  const h = props.hobbies.find(h => h.id === hobbyId)
  return h?.gradient?.[0] || '#ff6b9d'
}

function formatLeafDate(dateKey) {
  const d = new Date(dateKey + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

// Racha 7+ días consecutivos (por hobby) y por hojas
// Regla: si existen hojas para fechas consecutivas, marca un tramo floreciente.
const flowering = computed(() => {
  const res = new Map() // hobbyId -> { start: index, length }

  for (const item of treeByHobby.value) {
    const dates = item.days.map(d => d.dateKey).sort()
    // Convertir a números de días
    const dayNums = dates.map(dk => {
      const t = new Date(dk + 'T12:00:00').getTime()
      return Math.round(t / 86400000)
    })

    // buscar el primer tramo con len>=7
    let best = null
    let curStart = 0
    for (let i = 1; i <= dayNums.length; i++) {
      const prev = dayNums[i - 1]
      const cur = dayNums[i]
      const isConsecutive = i < dayNums.length && (cur - prev === 1)
      if (!isConsecutive) {
        const len = i - curStart
        if (len >= 7) {
          best = { start: curStart, length: len }
          break
        }
        curStart = i
      }
    }

    if (best) res.set(item.hobbyId, best)
  }

  return res
})

// UI dinámica: si cambias filtro, el árbol se re-renderiza.
// Para animación simple, calculamos hojas visibles.
const visibleTree = computed(() => {
  return treeByHobby.value.map(({ hobbyId, days }) => {
    const max = props.maxDaysPerHobby
    const sliced = days.slice(Math.max(0, days.length - max))
    return { hobbyId, days: sliced, total: days.length }
  })
})
</script>

<template>
  <div class="ht-wrap">
    <div class="ht-head">
      <div class="ht-title">
        <span class="ht-icon">🌳</span>
        <div>
          <h3>Árbol de Hábitos</h3>
          <p>Ramas por hábito · Hojas por días completados · Flores en rachas 7+ 🌸</p>
        </div>
      </div>
      <div class="ht-hint">
        <span class="ht-mini">Tip:</span> cambia el filtro para ver tu árbol por hobby.
      </div>
    </div>

    <div class="ht-body">
      <div v-if="visibleTree.length === 0" class="ht-empty">
        <div class="ht-empty-icon">🌱</div>
        <div class="ht-empty-text">Aún no tienes sesiones completadas.</div>
      </div>

      <div v-else class="ht-grid">
        <div v-for="node in visibleTree" :key="node.hobbyId" class="ht-node">
          <div class="ht-branch" :style="{ '--branch': colorForHobby(node.hobbyId) }">
            <div class="ht-branch-top"></div>

            <div class="ht-branch-label">
              <span class="ht-branch-dot" :style="{ background: colorForHobby(node.hobbyId) }"></span>
              <span class="ht-branch-name">{{ props.hobbies.find(h => h.id === node.hobbyId)?.name || 'Hábito' }}</span>
              <span class="ht-branch-count" v-if="node.total > node.days.length">+{{ node.total - node.days.length }}</span>
            </div>

            <div class="ht-leaves" :class="{ flowering: flowering.get(node.hobbyId) }">
              <div v-for="(leaf, idx) in node.days" :key="leaf.dateKey + '-' + idx" class="ht-leaf">
                <span
                  class="ht-leaf-dot"
                  :style="{
                    background: colorForHobby(node.hobbyId),
                    opacity: 0.6 + (idx / Math.max(1, node.days.length - 1)) * 0.4,
                  }"
                  :class="{
                    bloom:
                      flowering.get(node.hobbyId) &&
                      idx >= flowering.get(node.hobbyId).start &&
                      idx < flowering.get(node.hobbyId).start + flowering.get(node.hobbyId).length
                  }"
                ></span>

                <span class="ht-leaf-pop" v-if="flowering.get(node.hobbyId) &&
                  idx >= flowering.get(node.hobbyId).start &&
                  idx < flowering.get(node.hobbyId).start + flowering.get(node.hobbyId).length">✿</span>

                <span class="ht-leaf-date" :title="leaf.dateKey + ' · ' + leaf.count + ' sesión(es)'">
                  {{ formatLeafDate(leaf.dateKey) }}
                  <span class="ht-leaf-count" v-if="leaf.count > 1">×{{ leaf.count }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ht-wrap {
  background: #fff;
  border-radius: 20px;
  padding: 18px 18px 14px;
  box-shadow: 0 2px 16px rgba(34,40,78,.07);
  border: 1px solid rgba(34,40,78,.05);
  margin-bottom: 16px;
}

.ht-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.ht-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.ht-icon { font-size: 22px; margin-top: 2px; }
.ht-title h3 { margin: 0; font-size: 16px; font-weight: 900; color: #22284E; letter-spacing: -0.2px; }
.ht-title p { margin: 4px 0 0; font-size: 12px; color: rgba(34,40,78,.45); }

.ht-hint { font-size: 12px; color: rgba(34,40,78,.45); white-space: nowrap; }
.ht-mini { font-weight: 800; color: rgba(34,40,78,.65); }

.ht-body { overflow: hidden; }

.ht-empty { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; padding: 28px 0; }
.ht-empty-icon { font-size: 34px; }
.ht-empty-text { font-size: 13px; color: rgba(34,40,78,.45); font-weight: 600; }

.ht-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.ht-node { min-width: 0; }

.ht-branch {
  position: relative;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(34,40,78,.02), rgba(34,40,78,.01));
  border: 1px solid rgba(34,40,78,.05);
}

.ht-branch-top {
  position: absolute;
  left: 18px;
  right: 18px;
  top: 14px;
  height: 2px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--branch) 70%, transparent), transparent);
  opacity: .9;
}

.ht-branch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.ht-branch-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.ht-branch-name {
  font-size: 13px;
  font-weight: 800;
  color: #22284E;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ht-branch-count {
  font-size: 12px;
  color: rgba(34,40,78,.45);
  font-weight: 700;
}

.ht-leaves {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ht-leaf {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 10px;
  border-radius: 14px;
  background: rgba(34,40,78,.02);
  border: 1px dashed rgba(34,40,78,.06);
  transition: transform .2s ease, background .2s ease;
}

.ht-leaf:hover { transform: translateY(-2px); background: rgba(34,40,78,.03); }

.ht-leaf-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 8px 18px rgba(255,107,157,.18);
  transition: transform .2s ease, filter .2s ease;
}

.ht-leaf-dot.bloom {
  background: radial-gradient(circle at 30% 30%, #fff, var(--leaf, #ff6b9d));
  transform: scale(1.15);
  filter: saturate(1.2);
  animation: bloomPop .9s ease-in-out infinite;
}

.ht-leaf-pop {
  font-size: 12px;
  line-height: 1;
  color: rgba(34,40,78,.55);
}

.ht-leaf-date {
  font-size: 11px;
  color: rgba(34,40,78,.5);
  font-weight: 700;
  white-space: nowrap;
}
.ht-leaf-count { color: rgba(34,40,78,.35); margin-left: 4px; font-weight: 900; }

@keyframes bloomPop {
  0%, 100% { transform: scale(1.1); }
  50% { transform: scale(1.25); }
}
</style>

