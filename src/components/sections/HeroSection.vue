 <script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Button from '../Button.vue'

defineEmits(['start', 'signin'])

const isVisible = ref(false)
const currentWord = ref(0)
const words = ['Transforma.', 'Crece.', 'Conecta.']
const showFeatures = ref(false)
const currentFaq = ref(null)
const canvasRef = ref(null)
let animationFrame = null

// Canvas particle system - elegant and professional
function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  
  const particles = []
  const particleCount = 120
  let mouseX = canvas.width / 2
  let mouseY = canvas.height / 2
  let isMouseActive = false
  
  // Track mouse
  canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    isMouseActive = true
    setTimeout(() => isMouseActive = false, 2000)
  })
  
  canvas.addEventListener('touchmove', (e) => {
    mouseX = e.touches[0].clientX
    mouseY = e.touches[0].clientY
    isMouseActive = true
    setTimeout(() => isMouseActive = false, 2000)
  })
  
  class Particle {
    constructor() {
      this.reset()
    }
    
    reset() {
      this.x = Math.random() * canvas.width
      this.y = Math.random() * canvas.height
      this.size = Math.random() * 2 + 0.5
      this.speedX = (Math.random() - 0.5) * 0.5
      this.speedY = (Math.random() - 0.5) * 0.5
      this.opacity = Math.random() * 0.3 + 0.05
      this.baseOpacity = this.opacity
    }
    
    update() {
      // Mouse interaction
      if (isMouseActive) {
        const dx = mouseX - this.x
        const dy = mouseY - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 150) {
          const force = (150 - distance) / 150
          this.speedX += (dx / distance) * force * 0.5
          this.speedY += (dy / distance) * force * 0.5
          this.opacity = Math.min(1, this.baseOpacity + force * 0.5)
        }
      }
      
      this.x += this.speedX
      this.y += this.speedY
      
      // Bounce off edges
      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1
      
      // Damping
      this.speedX *= 0.99
      this.speedY *= 0.99
      
      // Keep minimum speed
      if (Math.abs(this.speedX) < 0.1) this.speedX += (Math.random() - 0.5) * 0.1
      if (Math.abs(this.speedY) < 0.1) this.speedY += (Math.random() - 0.5) * 0.1
    }
    
    draw() {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = this.opacity
      ctx.fill()
      ctx.globalAlpha = 1
      
      // Glow effect
      if (this.opacity > 0.3) {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.fill()
      }
    }
  }
  
  // Create particles
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle())
  }
  
  // Draw connections - interactive
  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 180) {
          const opacity = (1 - distance / 180) * 0.15
          ctx.beginPath()
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`
          ctx.lineWidth = 0.5
          ctx.moveTo(particles[i].x, particles[j].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }
  }
  
  // Animation loop
  let time = 0
  function animate() {
    time += 0.01
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
    ctx.lineWidth = 1
    const gridSize = 60
    const offset = (time * 20) % gridSize
    
    for (let x = offset; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = offset; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    
    particles.forEach(p => {
      p.update()
      p.draw()
    })
    
    drawConnections()
    animationFrame = requestAnimationFrame(animate)
  }
  
  animate()
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  })
}

const faqs = [
  {
    question: '¿Cuánto cuesta HobitGo?',
    answer: 'HobitGo es completamente gratuito. Puedes acceder a todos los retos de 30 días y funciones sin pagar nada.'
  },
  {
    question: '¿Cómo funcionan los retos de 30 días?',
    answer: 'Eliges un hábito, defines tu objetivo diario y nosotros te guiamos paso a paso durante 30 días con recordatorios y seguimiento.'
  },
  {
    question: '¿Puedo usar HobitGo en móvil?',
    answer: 'Sí! HobitGo funciona perfectamente en iOS y Android. Tus datos se sincronizan automáticamente entre dispositivos.'
  },
  {
    question: '¿Qué incluye la versión gratuita?',
    answer: 'Tienes acceso completo a todos los retos, seguimiento de hábitos, estadísticas y comunidad sin ningún coste.'
  },
  {
    question: '¿Tendrán funciones de pago en el futuro?',
    answer: 'Sí! Estamos trabajando en colaboraciones con expertos de diversas especialidades que ofrecerán sesiones en directo con consejos y planes personalizados. Los precios se anunciarán cuando estén disponibles.'
  }
]

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 100)
  
  setInterval(() => {
    currentWord.value = (currentWord.value + 1) % words.length
  }, 2500)
 
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        showFeatures.value = true
      }
    },
    { threshold: 0.1 }
  )
  
  const featuresSection = document.querySelector('.features-section')
  if (featuresSection) {
    observer.observe(featuresSection)
  }
  
  initCanvas()
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})

function toggleFaq(index) {
  currentFaq.value = currentFaq.value === index ? null : index
}
</script>

<template>
  <section class="hero" role="banner">
    <!-- Elegant Canvas Background -->
    <div class="canvas-container">
      <canvas ref="canvasRef" class="particles-canvas"></canvas>
      <div class="bg-overlay"></div>
      <div class="bg-glow glow-1"></div>
      <div class="bg-glow glow-2"></div>
      <div class="bg-glow glow-3"></div>
    </div>

    <!-- Hero Content -->
    <div class="hero-content" :class="{ visible: isVisible }">
      <h1 class="hero-title">
        <span class="word-rotate">
          <span 
            v-for="(word, index) in words" 
            :key="word"
            class="word"
            :class="{ active: currentWord === index }"
          >
            {{ word }}
          </span>
        </span>
      </h1>
      
      <p class="hero-subtitle">
        Transforma tus hobbies en hábitos reales con retos de 30 días.
      </p>

      <div class="hero-buttons">
        <Button type="primary" size="large" @click="$emit('start')">
          Empezar Ahora
        </Button>
        <Button type="outline" class="btn-light" size="large" @click="$emit('signin')">
          Explorar Retos
        </Button>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features-section" :class="{ visible: showFeatures }">
    <div class="features-bg-pattern"></div>
    
    <div class="features-content">
      <div class="features-header">
        <h2 class="features-title">Tu planificador todo en uno</h2>
        <p class="features-subtitle">
          HobitGo combina todas tus tareas y hábitos en una línea de tiempo visual única.
        </p>
      </div>
      
      <div class="features-grid">
        <div class="feature-card" :class="{ animate: showFeatures }" style="--delay: 0ms">
          <div class="feature-shine"></div>
          <div class="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="feature-number">01</div>
          <h3>Planifica tu día</h3>
          <p>Organiza tus tareas diarias de forma visual e intuitiva con nuestra interfaz drag & drop</p>
        </div>
        
        <div class="feature-card feature-card-highlight" :class="{ animate: showFeatures }" style="--delay: 100ms">
          <div class="feature-badge">Popular</div>
          <div class="feature-shine"></div>
          <div class="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
          </div>
          <div class="feature-number">02</div>
          <h3>Retos de 30 días</h3>
          <p>Crea hábitos duraderos con desafíos personalizados diseñados por expertos</p>
        </div>
        
        <div class="feature-card" :class="{ animate: showFeatures }" style="--delay: 200ms">
          <div class="feature-shine"></div>
          <div class="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <div class="feature-number">03</div>
          <h3>Seguimiento</h3>
          <p>Visualiza tu progreso con gráficos detallados y mantén la motivación</p>
        </div>
      </div>

      <!-- How it Works -->
      <div class="how-it-works">
        <h3 class="how-title">Cómo funciona</h3>
        <div class="steps">
          <div class="step" :class="{ animate: showFeatures }" style="--delay: 600ms">
            <div class="step-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div class="step-content">
              <h4>1. Crea tu cuenta</h4>
              <p>Regístrate en segundos y empieza tu viaje</p>
            </div>
          </div>
          <div class="step-connector"></div>
          <div class="step" :class="{ animate: showFeatures }" style="--delay: 700ms">
            <div class="step-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
            </div>
            <div class="step-content">
              <h4>2. Elige hábitos</h4>
              <p>Selecciona qué quieres lograr en 30 días</p>
            </div>
          </div>
          <div class="step-connector"></div>
          <div class="step" :class="{ animate: showFeatures }" style="--delay: 800ms">
            <div class="step-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <div class="step-content">
              <h4>3. Tracking diario</h4>
              <p>Completa tareas y ve tu progreso</p>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="faq-section" :class="{ animate: showFeatures }" style="--delay: 1000ms">
        <h3 class="faq-title">Preguntas frecuentes</h3>
        <div class="faq-list">
          <div 
            v-for="(faq, index) in faqs" 
            :key="index"
            class="faq-item"
            :class="{ active: currentFaq === index }"
            @click="toggleFaq(index)"
          >
            <div class="faq-question">
              <span>{{ faq.question }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="faq-answer">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Newsletter Section -->
      <div class="newsletter-section">
        <div class="newsletter-card">
          <div class="newsletter-content">
            <span class="newsletter-badge">📬 Newsletter</span>
            <h3>Recibe tips de productividad</h3>
            <p>Únete a 25,000+ personas que reciben nuestros consejos semanalmente</p>
            <form class="newsletter-form" @submit.prevent>
              <input type="email" placeholder="Tu email..." />
              <Button type="primary">Suscribirse</Button>
            </form>
            <span class="newsletter-privacy">Sin spam, unsubscribe cuando quieras</span>
          </div>
          <div class="newsletter-decoration">
            <div class="deco-circle"></div>
            <div class="deco-circle"></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta-section">
    <div class="cta-bg">
      <div class="cta-circle cta-circle-1"></div>
      <div class="cta-circle cta-circle-2"></div>
      <div class="cta-circle cta-circle-3"></div>
    </div>
    <div class="cta-content">
      <div class="cta-glow">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/>
        </svg>
      </div>
      <h2>Transforma tu vida hoy</h2>
      <p>Únete a la comunidad que está cambiando hábitos para siempre</p>
      <div class="cta-buttons">
        <Button type="primary" size="large" @click="$emit('start')">
          Empezar Gratis
        </Button>
      </div>
      <div class="cta-trust">
        <div class="trust-badge">
          <span class="trust-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#E08E6B"/></svg>
          </span>
          <span>100% Gratis</span>
        </div>
        <div class="trust-badge">
          <span class="trust-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#E08E6B" stroke-width="2"/><path d="M8 12L11 15L16 9" stroke="#E08E6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span>Sin compromiso</span>
        </div>
        <div class="trust-badge">
          <span class="trust-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#E08E6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span>Acceso inmediato</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Hero Section */
.hero {
  position: relative;
  height: 100vh;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%);
}

.particles-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%);
  z-index: 2;
}

.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
  animation: glow-pulse 8s ease-in-out infinite;
}

.glow-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(224, 142, 107, 0.4) 0%, transparent 70%);
  top: -200px;
  right: -100px;
  animation-delay: 0s;
  animation: glow-move-1 15s ease-in-out infinite;
}

.glow-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(76, 175, 80, 0.3) 0%, transparent 70%);
  bottom: -150px;
  left: -100px;
  animation-delay: 4s;
  animation: glow-move-2 12s ease-in-out infinite;
}

.glow-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(33, 150, 243, 0.3) 0%, transparent 70%);
  top: 40%;
  left: 60%;
  animation-delay: 2s;
  animation: glow-move-3 18s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.1); opacity: 0.6; }
}

@keyframes glow-move-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(-50px, 50px) scale(1.1); }
  50% { transform: translate(-100px, 0) scale(1); }
  75% { transform: translate(-50px, -50px) scale(0.9); }
}

@keyframes glow-move-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(80px, -30px) scale(1.15); }
  66% { transform: translate(40px, 40px) scale(0.95); }
}

@keyframes glow-move-3 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-60px, 40px); }
}

.hero-content {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 0 20px;
  max-width: 900px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-content.visible {
  opacity: 1;
  transform: translateY(0);
}

.hero-title {
  font-size: 72px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 20px;
  line-height: 1.1;
}

.word-rotate {
  display: inline-block;
  position: relative;
  min-width: 320px;
  height: 1.2em;
}

.word {
  display: block;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.word.active {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.hero-subtitle {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 40px;
  line-height: 1.5;
}

.hero-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.hero-buttons :deep(.btn) {
  min-width: 180px;
}

.btn-light {
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: #fff !important;
}

.btn-light:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  animation: bounce 2s infinite;
}

.scroll-arrow {
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
  40% { transform: translateX(-50%) translateY(-10px); }
  60% { transform: translateX(-50%) translateY(-5px); }
}

/* Features Section */
.features-section {
  padding: 100px 20px;
  background: #fff;
  position: relative;
  overflow: hidden;
}

.features-bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 1px 1px, #f0f0f0 1px, transparent 0);
  background-size: 40px 40px;
  opacity: 0.5;
}

.features-content {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.features-header {
  text-align: center;
  margin-bottom: 60px;
}

.features-badge {
  display: inline-block;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  padding: 8px 20px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  color: #f57c00;
  margin-bottom: 20px;
}

.badge-sparkle {
  margin-right: 6px;
}

.features-title {
  font-size: 52px;
  font-weight: 800;
  background: linear-gradient(135deg, #1a1a2e 0%, #22284E 50%, #E08E6B 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 16px;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.features-subtitle {
  font-size: 20px;
  color: #555;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
}

.feature-card {
  background: linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%);
  border-radius: 32px;
  padding: 50px 40px;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.02),
    0 0 0 1px rgba(224, 142, 107, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: var(--delay);
}

.feature-card.animate {
  opacity: 1;
  transform: translateY(0);
}

.feature-card:hover {
  transform: translateY(-12px);
  box-shadow: 
    0 30px 60px rgba(0, 0, 0, 0.08),
    0 0 40px rgba(224, 142, 107, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.feature-card-highlight {
  background: linear-gradient(135deg, #fefefe 0%, #ffe4e8 50%, #e8f4fc 100%);
  box-shadow: 
    0 15px 50px rgba(135, 206, 250, 0.3),
    0 0 0 1px rgba(255, 182, 193, 0.3);
}

.feature-card-highlight:hover {
  box-shadow: 
    0 30px 60px rgba(135, 206, 250, 0.3),
    0 0 50px rgba(255, 182, 193, 0.2);
}

.feature-card-highlight h3 {
  background: none;
  -webkit-text-fill-color: #1a1a2e;
  color: #1a1a2e !important;
}

.feature-card-highlight p {
  color: #5a5a7a !important;
}

.feature-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #E08E6B;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.feature-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%);
  transform: rotate(45deg);
  transition: all 0.5s;
}

.feature-card:hover .feature-shine {
  animation: shine 0.5s;
}

@keyframes shine {
  0% { transform: rotate(45deg) translateX(-100%); }
  100% { transform: rotate(45deg) translateX(100%); }
}

.feature-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #22284E 0%, #1a1a3e 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
  box-shadow: 
    0 8px 24px rgba(34, 40, 78, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.feature-icon svg {
  width: 36px;
  height: 36px;
  color: #fff;
}

.feature-card-highlight .feature-icon {
  background: linear-gradient(135deg, #22284E 0%, #1a1a3e 100%);
}

.feature-card-highlight .feature-icon svg {
  color: #fff;
}

.feature-number {
  font-size: 14px;
  font-weight: 700;
  color: #E08E6B;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #1a1a2e 0%, #22284E 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 14px;
  letter-spacing: -0.3px;
}

.feature-card p {
  font-size: 16px;
  color: #5a5a7a;
  line-height: 1.7;
  margin: 0;
}

.feature-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #22284E;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: gap 0.2s;
}

.feature-link:hover {
  gap: 12px;
}

.feature-link svg {
  width: 16px;
  height: 16px;
}

/* Feature Highlights */
.feature-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 80px;
}

.highlight-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 12px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
  transition-delay: var(--delay);
}

.highlight-item.animate {
  opacity: 1;
  transform: translateY(0);
}

.highlight-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.highlight-text h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
}

.highlight-text p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* How it Works */
.how-it-works {
  text-align: center;
  margin-bottom: 80px;
}

.how-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 40px;
}

.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 250px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
  transition-delay: var(--delay);
}

.step.animate {
  opacity: 1;
  transform: translateY(0);
}

.step-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #22284E 0%, #1a1a3e 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.step-icon svg {
  width: 32px;
  height: 32px;
  color: #fff;
}

.step-content h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px;
}

.step-content p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.step-connector {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, #22284E, #E08E6B);
  margin: 40px 20px 0;
  flex-shrink: 0;
}

/* Testimonials */
.testimonials-section {
  margin-bottom: 80px;
}

.testimonials-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
  margin: 0 0 40px;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.testimonial-card {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.testimonial-stars {
  font-size: 18px;
  margin-bottom: 16px;
}

.testimonial-text {
  font-size: 16px;
  color: #333;
  line-height: 1.6;
  margin: 0 0 20px;
  font-style: italic;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 48px;
  height: 48px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-info strong {
  color: #1a1a1a;
  font-size: 14px;
}

.author-info span {
  color: #888;
  font-size: 13px;
}

/* FAQ */
.faq-section {
  max-width: 800px;
  margin: 0 auto 80px;
}

.faq-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
  margin: 0 0 40px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  background: #f9f9f9;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.faq-item:hover {
  background: #f0f0f0;
}

.faq-item.active {
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.faq-question svg {
  width: 20px;
  height: 20px;
  transition: transform 0.3s;
}

.faq-item.active .faq-question svg {
  transform: rotate(180deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.faq-item.active .faq-answer {
  max-height: 200px;
}

.faq-answer p {
  padding: 0 20px 20px;
  margin: 0;
  color: #666;
  line-height: 1.6;
}

/* Newsletter */
.newsletter-section {
  max-width: 800px;
  margin: 0 auto;
}

.newsletter-card {
  background: linear-gradient(135deg, #22284E 0%, #1a1a3e 100%);
  border-radius: 24px;
  padding: 60px 40px;
  position: relative;
  overflow: hidden;
}

.newsletter-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.newsletter-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: #fff;
  margin-bottom: 16px;
}

.newsletter-card h3 {
  font-size: 28px;
  color: #fff;
  margin: 0 0 12px;
}

.newsletter-card p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 24px;
}

.newsletter-form {
  display: flex;
  gap: 12px;
  max-width: 400px;
  margin: 0 auto 12px;
}

.newsletter-form input {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
}

.newsletter-form input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(224, 142, 107, 0.3);
}

.newsletter-privacy {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.newsletter-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.deco-circle:first-child {
  width: 300px;
  height: 300px;
  background: #fff;
  top: -100px;
  right: -50px;
}

.deco-circle:last-child {
  width: 200px;
  height: 200px;
  background: #E08E6B;
  bottom: -50px;
  left: -50px;
}

/* CTA Section */
.cta-section {
  padding: 120px 20px;
  background: linear-gradient(180deg, #fafbfc 0%, #f0f4f8 100%);
  position: relative;
  overflow: hidden;
}

.cta-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cta-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
}

.cta-circle-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(224, 142, 107, 0.25) 0%, transparent 70%);
  top: -150px;
  left: -150px;
  animation: float 8s ease-in-out infinite;
}

.cta-circle-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(76, 175, 80, 0.2) 0%, transparent 70%);
  bottom: -100px;
  right: 5%;
  animation: float 10s ease-in-out infinite reverse;
}

.cta-circle-3 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(33, 150, 243, 0.2) 0%, transparent 70%);
  top: 40%;
  right: -80px;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.cta-content {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
  position: relative;
}

.cta-glow {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #E08E6B, #f5a882);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 30px rgba(224, 142, 107, 0.4);
}

.cta-glow svg {
  width: 32px;
  height: 32px;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.cta-content h2 {
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, #1a1a2e 0%, #22284E 50%, #E08E6B 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 16px;
  line-height: 1.2;
}

.cta-content p {
  font-size: 20px;
  color: #5a5a7a;
  margin: 0 0 36px;
  line-height: 1.6;
}

.cta-buttons {
  margin-bottom: 32px;
}

.cta-trust {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.trust-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 12px 20px;
  border-radius: 50px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  transition: transform 0.3s, box-shadow 0.3s;
}

.trust-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.trust-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trust-icon svg {
  width: 100%;
  height: 100%;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: 42px;
  }
  
  .word-rotate {
    min-width: 200px;
  }
  
  .hero-subtitle {
    font-size: 18px;
  }
  
  .features-title {
    font-size: 32px;
  }
  
  .step-connector {
    display: none;
  }
  
  .steps {
    gap: 30px;
  }
  
  .newsletter-form {
    flex-direction: column;
  }
  
  .cta-content h2 {
    font-size: 28px;
  }
}
</style>
