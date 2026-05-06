<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

const step = ref(1)
const saving = ref(false)
const error = ref('')

const selectedGoal = ref('')
const selectedHobbies = ref([])
const selectedTime = ref('')

const goals = [
  { value: 'habits', label: 'Crear hábitos positivos', emoji: '🌱' },
  { value: 'hobbies', label: 'Descubrir nuevos hobbies', emoji: '🎨' },
  { value: 'health', label: 'Mejorar mi salud', emoji: '💪' },
  { value: 'social', label: 'Conectar con otros', emoji: '🤝' },
  { value: 'productivity', label: 'Ser más productivo', emoji: '⚡' },
  { value: 'fun', label: 'Simplemente divertirme', emoji: '🎉' },
]

const hobbies = [
  { value: 'sport', label: 'Deporte', emoji: '🏃' },
  { value: 'reading', label: 'Lectura', emoji: '📚' },
  { value: 'music', label: 'Música', emoji: '🎵' },
  { value: 'art', label: 'Arte & Dibujo', emoji: '🎨' },
  { value: 'cooking', label: 'Cocina', emoji: '👨‍🍳' },
  { value: 'meditation', label: 'Meditación', emoji: '🧘' },
  { value: 'travel', label: 'Viajes', emoji: '✈️' },
  { value: 'photography', label: 'Fotografía', emoji: '📷' },
  { value: 'gaming', label: 'Videojuegos', emoji: '🎮' },
  { value: 'writing', label: 'Escritura', emoji: '✍️' },
  { value: 'dance', label: 'Baile', emoji: '💃' },
  { value: 'language', label: 'Idiomas', emoji: '🌍' },
]

const times = [
  { value: '15min', label: '15 minutos', desc: 'Rápido y fácil' },
  { value: '30min', label: '30 minutos', desc: 'Lo ideal para empezar' },
  { value: '1hour', label: '1 hora', desc: 'Me lo tomo en serio' },
  { value: 'more', label: 'Más de 1 hora', desc: 'Totalmente comprometido' },
]

const canContinue = computed(() => {
  if (step.value === 1) return selectedGoal.value !== ''
  if (step.value === 2) return selectedHobbies.value.length > 0
  if (step.value === 3) return selectedTime.value !== ''
  return false
})

function toggleHobby(value) {
  const idx = selectedHobbies.value.indexOf(value)
  if (idx === -1) {
    if (selectedHobbies.value.length < 5) selectedHobbies.value.push(value)
  } else {
    selectedHobbies.value.splice(idx, 1)
  }
}

async function finish() {
  saving.value = true
  error.value = ''
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { error: err } = await supabase.from('profiles').update({
      onboarding_goal: selectedGoal.value,
      onboarding_hobbies: selectedHobbies.value,
      onboarding_time: selectedTime.value,
      onboarding_done: true
    }).eq('id', user.id)

    if (err) throw err
    router.push('/dashboard')
  } catch (e) {
    error.value = e.message
    saving.value = false
  }
}
</script>

<template>
  <div class="onboarding">
    <div class="ob-card">
      <!-- Header -->
      <div class="ob-header">
        <div class="ob-logo">
          <span class="logo-hobit">Hobit</span><span class="logo-go">GO</span>
        </div>
        <div class="ob-steps">
          <div v-for="i in 3" :key="i" class="ob-step-dot" :class="{ active: step >= i, current: step === i }"></div>
        </div>
      </div>

      <!-- Step 1: Objetivo -->
      <div v-if="step === 1" class="ob-body">
        <h2>¿Cuál es tu principal objetivo?</h2>
        <p>Personalizaremos tu experiencia según tus metas</p>
        <div class="options-grid">
          <button
            v-for="g in goals" :key="g.value"
            class="option-btn"
            :class="{ selected: selectedGoal === g.value }"
            @click="selectedGoal = g.value"
          >
            <span class="opt-emoji">{{ g.emoji }}</span>
            <span>{{ g.label }}</span>
          </button>
        </div>
      </div>

      <!-- Step 2: Hobbies -->
      <div v-if="step === 2" class="ob-body">
        <h2>¿Qué te interesa? </h2>
        <p>Elige hasta 5 áreas que te gusten o quieras explorar</p>
        <div class="hobbies-grid">
          <button
            v-for="h in hobbies" :key="h.value"
            class="hobby-btn"
            :class="{ selected: selectedHobbies.includes(h.value) }"
            @click="toggleHobby(h.value)"
          >
            <span class="opt-emoji">{{ h.emoji }}</span>
            <span>{{ h.label }}</span>
          </button>
        </div>
        <p class="hint">{{ selectedHobbies.length }}/5 seleccionados</p>
      </div>

      <!-- Step 3: Tiempo -->
      <div v-if="step === 3" class="ob-body">
        <h2>¿Cuánto tiempo al día puedes dedicar?</h2>
        <p>Sé realista, la constancia es más importante que la cantidad</p>
        <div class="time-grid">
          <button
            v-for="t in times" :key="t.value"
            class="time-btn"
            :class="{ selected: selectedTime === t.value }"
            @click="selectedTime = t.value"
          >
            <span class="time-label">{{ t.label }}</span>
            <span class="time-desc">{{ t.desc }}</span>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="ob-footer">
        <div v-if="error" class="error-msg">{{ error }}</div>
        <div class="ob-actions">
          <button v-if="step > 1" class="btn-back" @click="step--">Atrás</button>
          <button
            v-if="step < 3"
            class="btn-next"
            :disabled="!canContinue"
            @click="step++"
          >Continuar →</button>
          <button
            v-if="step === 3"
            class="btn-next"
            :disabled="!canContinue || saving"
            @click="finish"
          >{{ saving ? 'Guardando...' : '¡Empezar! 🚀' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding {
  min-height: 100vh;
  background: linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.ob-card {
  background: #fff;
  border-radius: 24px;
  width: 100%;
  max-width: 560px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.ob-header {
  padding: 28px 32px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
}

.ob-logo { font-size: 24px; font-weight: 700; }
.logo-hobit { color: #22284E; }
.logo-go { color: #E08E6B; }

.ob-steps { display: flex; gap: 8px; }
.ob-step-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #e0e0e0; transition: all 0.3s ease;
}
.ob-step-dot.active { background: #E08E6B; }
.ob-step-dot.current { transform: scale(1.3); }

.ob-body {
  padding: 32px;
}

.ob-body h2 {
  font-size: 22px;
  color: #1a1a2e;
  margin: 0 0 8px;
  font-weight: 700;
}

.ob-body > p {
  color: #888;
  font-size: 15px;
  margin: 0 0 24px;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 2px solid #eee;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s ease;
  text-align: left;
}

.option-btn:hover { border-color: #E08E6B; background: #fff8f5; }
.option-btn.selected { border-color: #E08E6B; background: #fff3ee; color: #1a1a2e; }

.hobbies-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.hobby-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border: 2px solid #eee;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s ease;
}

.hobby-btn:hover { border-color: #E08E6B; background: #fff8f5; }
.hobby-btn.selected { border-color: #E08E6B; background: #fff3ee; color: #1a1a2e; }

.opt-emoji { font-size: 22px; }
.hint { font-size: 13px; color: #aaa; text-align: center; margin: 0; }

.time-grid { display: flex; flex-direction: column; gap: 10px; }

.time-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border: 2px solid #eee;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.time-btn:hover { border-color: #E08E6B; background: #fff8f5; }
.time-btn.selected { border-color: #E08E6B; background: #fff3ee; }

.time-label { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.time-desc { font-size: 13px; color: #888; }

.ob-footer {
  padding: 20px 32px 28px;
  border-top: 1px solid #f0f0f0;
}

.error-msg {
  background: #ffebee;
  color: #c62828;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}

.ob-actions { display: flex; gap: 10px; justify-content: flex-end; }

.btn-back {
  padding: 12px 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: #fff;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-back:hover { background: #f5f5f5; }

.btn-next {
  padding: 12px 28px;
  border: none;
  border-radius: 10px;
  background: #E08E6B;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}
.btn-next:hover:not(:disabled) { background: #d07a5a; transform: translateY(-1px); }
.btn-next:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 480px) {
  .ob-card { border-radius: 16px; }
  .ob-body { padding: 24px 20px; }
  .ob-footer { padding: 16px 20px 24px; }
  .ob-header { padding: 20px; }
  .options-grid { grid-template-columns: 1fr; }
  .hobbies-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
