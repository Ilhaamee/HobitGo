<script setup>
import { ref } from 'vue'

const currentFaq = ref(null)

const faqs = [
  {
    q: '¿Cuánto cuesta HobitGo?',
    a: 'Completamente gratuita. Acceso total a todos los retos, hobbies y funciones sociales sin coste.'
  },
  {
    q: '¿Cómo funcionan los retos de 30 días?',
    a: 'Eliges un hábito, fijas tu objetivo diario y la app te guía con seguimiento visual cada día. Al completar 30 días seguidos, el reto se convierte en hábito oficial y desbloqueas insignias.'
  },
  {
    q: '¿Funciona en móvil y ordenador?',
    a: 'Sí. Diseñada para ambos. Tus datos se sincronizan automáticamente entre dispositivos.'
  },
  {
    q: '¿Habrá clases en vivo con expertos?',
    a: 'Sí, es nuestra próxima gran función. Sesiones en directo con coaches de hábitos, nutricionistas y expertos en bienestar — directamente dentro de HobitGo, sin salir de tu rutina.'
  },
]

function toggleFaq(i) {
  currentFaq.value = currentFaq.value === i ? null : i
}
</script>

<template>
  <section class="s-faq">
    <div class="s-inner">

      <header class="s-head">
        <div class="section-tag">Tus dudas resueltas</div>
        <h2>Preguntas frecuentes</h2>
      </header>

      <div class="faq-list">
        <div
          v-for="(f, i) in faqs"
          :key="i"
          class="faq-item"
          :class="{ open: currentFaq === i }"
          @click="toggleFaq(i)"
        >
          <div class="faq-q">
            <span>{{ f.q }}</span>
            <div class="faq-icon" :class="{ open: currentFaq === i }">
              <svg viewBox="0 0 20 20" fill="none" width="16">
                <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
          <div class="faq-a">
            <p>{{ f.a }}</p>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.s-faq { padding: 72px 0 80px; background: #fafafa; } 

.s-inner { max-width: 720px; margin: 0 auto; padding: 0 6vw; }

.s-head { text-align: center; margin-bottom: 40px; }

.section-tag {
  display: inline-block;
  background: rgba(34,40,78,.06);
  color: #22284E;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 6px 16px;
  border-radius: 99px;
  margin-bottom: 14px;
  border: 1px solid rgba(34,40,78,.1);
}

.s-head h2 {
  font-size: clamp(26px, 3vw, 42px);
  font-weight: 800;
  letter-spacing: -.8px;
  color: #22284E;
  margin: 0;
}

.faq-list { display: flex; flex-direction: column; gap: 10px; }

.faq-item {
  border-radius: 14px;
  border: 1.5px solid rgba(34,40,78,.08);
  background: #fff;
  cursor: pointer;
  overflow: hidden;
  transition: border-color .25s, box-shadow .25s;
}
.faq-item:hover { border-color: rgba(255,107,157,.3); }
.faq-item.open  {
  border-color: rgba(255,107,157,.45);
  box-shadow: 0 4px 20px rgba(255,107,157,.1);
}

.faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  font-size: 15px;
  font-weight: 600;
  color: #22284E;
  gap: 12px;
}

.faq-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(34,40,78,.06);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: rgba(34,40,78,.4);
  transition: background .3s, transform .3s, color .3s;
}
.faq-icon.open {
  background: #ff6b9d;
  color: #fff;
  transform: rotate(180deg);
}

.faq-a {
  max-height: 0;
  overflow: hidden;
  transition: max-height .35s ease;
}
.faq-item.open .faq-a { max-height: 160px; }
.faq-a p {
  padding: 0 22px 18px;
  font-size: 14px;
  color: rgba(34,40,78,.58);
  line-height: 1.7;
  margin: 0;
}
</style>