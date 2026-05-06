<script setup>
import { ref, onMounted } from 'vue'

const sectionRef = ref(null)
const isVisible  = ref(false)

onMounted(() => {
  const obs = new IntersectionObserver(
    ([e]) => { if (e.isIntersecting) isVisible.value = true },
    { threshold: 0.07 }
  )
  if (sectionRef.value) obs.observe(sectionRef.value)
})
</script>

<template>
  <section class="s-features" ref="sectionRef" :class="{ visible: isVisible }">
    <div class="s-inner">

      <header class="s-head">
        <div class="section-tag">Lo que hace HobitGo</div>
        <h2>Una app, tres pilares</h2>
        <p>Todo lo que necesitas para pasar del "quiero" al "lo hago".</p>
      </header>

      <div class="feat-row">

        <div class="feat-item" style="--i:0">
          <div class="feat-bubble" style="background:linear-gradient(135deg,#ffe0ec,#ffb3c6,#fff59e);">
            <svg viewBox="0 0 24 24" fill="none" width="40">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#22284E" stroke-width="1.8"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="#22284E" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="8"  y1="2" x2="8"  y2="6" stroke="#22284E" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="3"  y1="10" x2="21" y2="10" stroke="#22284E" stroke-width="1.8"/>
              <line x1="7"  y1="14" x2="17" y2="14" stroke="#22284E" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="7"  y1="17" x2="13" y2="17" stroke="#22284E" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="feat-label"><strong>Planifica</strong> tu día</div>
          <p class="feat-desc">Vista diaria clara con todas tus tareas y hábitos en un solo lugar.</p>
        </div>

        <div class="feat-item" style="--i:1">
          <div class="feat-bubble" style="background:linear-gradient(135deg,#fff59e,#ffe0b2,#ffb3c6);">
            <svg viewBox="0 0 24 24" fill="none" width="40">
              <circle cx="12" cy="12" r="9" stroke="#22284E" stroke-width="1.8"/>
              <path d="M12 7v5l3 3" stroke="#22284E" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="feat-label"><strong>Retos</strong> de 30 días</div>
          <p class="feat-desc">Desafíos progresivos diseñados para que el hábito quede grabado.</p>
        </div>

        <div class="feat-item" style="--i:2">
          <div class="feat-bubble" style="background:linear-gradient(135deg,#e8eaf6,#c5cae9,#fff59e);">
            <svg viewBox="0 0 24 24" fill="none" width="40">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#22284E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="feat-label"><strong>Sigue</strong> tu progreso</div>
          <p class="feat-desc">Gráficas diarias, rachas y estadísticas para mantenerte motivado.</p>
        </div>

      </div>
    </div>
  </section>
</template>

<style scoped>
.s-features {
  padding: 72px 0 80px;   /* ← menos espacio arriba */
  background: linear-gradient(150deg, #ff6b9d 0%, #ffb3c6 55%, #ff8fab 100%);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity .7s ease, transform .7s ease;
}
.s-features.visible { opacity: 1; transform: none; }

.s-inner { max-width: 1100px; margin: 0 auto; padding: 0 6vw; }

.s-head { text-align: center; margin-bottom: 48px; }

.section-tag {
  display: inline-block;
  background: rgba(255,255,255,.25);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 6px 16px;
  border-radius: 99px;
  margin-bottom: 16px;
  border: 1px solid rgba(255,255,255,.4);
}

.s-head h2 {
  font-size: clamp(26px, 3vw, 42px);
  font-weight: 800;
  letter-spacing: -.8px;
  color: #fff;
  margin-bottom: 10px;
}
.s-head p { font-size: 16px; color: rgba(255,255,255,.75); margin: 0; }

.feat-row {
  display: flex;
  justify-content: center;
  gap: 52px;
  flex-wrap: wrap;
}

.feat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 180px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity .5s ease calc(var(--i) * 130ms),
              transform .5s ease calc(var(--i) * 130ms);
}
.s-features.visible .feat-item { opacity: 1; transform: none; }

.feat-bubble {
  width: 120px; height: 120px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 12px 32px rgba(34,40,78,.13);
  transition: transform .3s, box-shadow .3s;
}
.feat-item:hover .feat-bubble {
  transform: translateY(-6px) scale(1.05);
  box-shadow: 0 20px 44px rgba(34,40,78,.2);
}

.feat-label { font-size: 16px; color: #fff; margin-bottom: 8px; line-height: 1.2; }
.feat-label strong { font-weight: 800; }
.feat-desc  { font-size: 13px; color: rgba(255,255,255,.8); line-height: 1.55; margin: 0; }
</style>