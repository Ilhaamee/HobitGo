<script setup>
defineEmits(['start'])
</script>

<template>
  <section class="s-cta">

    <!-- Fondo blobs -->
    <div class="cta-bg" aria-hidden="true">
      <div class="blob cb1"></div>
      <div class="blob cb2"></div>
      <div class="blob cb3"></div>
    </div>

    <!-- Pills de hobbies flotantes -->
    <div class="cta-hobbies" aria-hidden="true">
      <div class="hobby-pill hp1">Cocinar</div>
      <div class="hobby-pill hp2">Fotografía</div>
      <div class="hobby-pill hp3">Música</div>
      <div class="hobby-pill hp4">Dibujar</div>
      <div class="hobby-pill hp5">Leer</div>
      <div class="hobby-pill hp6">Yoga</div>
    </div>

    <!-- Contenido -->
    <div class="cta-inner">

      <!-- Contador -->
      <div class="cta-counter">
        <div class="counter-item">
          <strong>30</strong>
          <span>días</span>
        </div>
        <div class="counter-dot"></div>
        <div class="counter-item">
          <strong>1</strong>
          <span>hábito</span>
        </div>
        <div class="counter-dot"></div>
        <div class="counter-item">
          <strong>∞</strong>
          <span>posibilidades</span>
        </div>
      </div>

      <h2>Empieza tu primer<br><span class="cta-accent">reto hoy</span></h2>
      <p>Tu versión mejorada empieza con un pequeño hábito de 30 días.</p>

      <button class="btn-cta" @click="$emit('start')">
        Empezar gratis →
      </button>

    </div>
  </section>
</template>

<style scoped>
.s-cta {
  padding: 110px 6vw;
  background: linear-gradient(135deg, #e8eaf6 0%, #c5cae9 40%, #fff59e 100%);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.cta-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); }

.cb1 { width:400px; height:400px; background:rgba(255,107,157,.22); top:-120px; right:-80px;  animation: drift 12s ease-in-out infinite; }
.cb2 { width:300px; height:300px; background:rgba(255,245,158,.5);  bottom:-80px; left:-60px; animation: drift 15s ease-in-out infinite reverse; }
.cb3 { width:200px; height:200px; background:rgba(197,202,233,.6);  top:40%; left:20%;        animation: drift 10s ease-in-out infinite 3s; }

@keyframes drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(30px, -20px) scale(1.1); }
}

.cta-hobbies { position: absolute; inset: 0; pointer-events: none; z-index: 1; }

.hobby-pill {
  position: absolute;
  background: rgba(255,255,255,.75);
  backdrop-filter: blur(8px);
  border: 1.5px solid rgba(255,255,255,.9);
  border-radius: 99px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #22284E;
  box-shadow: 0 4px 16px rgba(34,40,78,.1);
  white-space: nowrap;
}
.hp1 { top:18%;    left:5%;   animation: floatpill 5s   ease-in-out infinite; }
.hp2 { top:35%;    left:2%;   animation: floatpill 6s   ease-in-out infinite .8s; }
.hp3 { bottom:25%; left:6%;   animation: floatpill 7s   ease-in-out infinite 1.5s; }
.hp4 { top:20%;    right:5%;  animation: floatpill 5.5s ease-in-out infinite .4s; }
.hp5 { top:40%;    right:3%;  animation: floatpill 6.5s ease-in-out infinite 1s; }
.hp6 { bottom:22%; right:7%;  animation: floatpill 4.5s ease-in-out infinite 2s; }

@keyframes floatpill {
  0%, 100% { transform: translateY(0) rotate(-1deg); }
  50%       { transform: translateY(-10px) rotate(1deg); }
}

.cta-inner {
  max-width: 520px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.cta-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 32px;
}
.counter-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.counter-item strong { font-size: 36px; font-weight: 900; color: #22284E; line-height: 1; }
.counter-item span   { font-size: 11px; font-weight: 600; color: rgba(34,40,78,.5); text-transform: uppercase; letter-spacing: .07em; }
.counter-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,107,157,.5); }

.cta-inner h2 {
  font-size: clamp(32px, 4.5vw, 58px);
  font-weight: 900;
  letter-spacing: -2px;
  color: #22284E;
  margin-bottom: 16px;
  line-height: 1.05;
}
.cta-accent {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cta-inner p {
  font-size: 17px;
  color: rgba(34,40,78,.62);
  margin-bottom: 38px;
  line-height: 1.6;
}

.btn-cta {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  color: #fff;
  border: none;
  font-size: 16px;
  font-weight: 800;
  padding: 17px 36px;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 10px 32px rgba(255,107,157,.35);
  transition: transform .2s, box-shadow .2s;
}
.btn-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(255,107,157,.5); }
</style>