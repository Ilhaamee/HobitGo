<template>
  <section class="s-how">
    <div class="s-inner">

      <header class="s-head">
        <div class="section-tag">Simple y directo</div>
        <h2>Tres pasos para empezar</h2>
        <p>En menos de 2 minutos ya tienes tu primer reto activo.</p>
      </header>

      <div class="how-steps">

        <div class="how-step">
          <div class="hs-num">01</div>
          <div class="hs-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b9d" stroke-width="1.8" width="28">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h4>Crea tu cuenta</h4>
          <p>Registro en segundos, sin tarjeta.</p>
        </div>

        <div class="how-arrow" aria-hidden="true">
          <svg viewBox="0 0 40 16" fill="none" width="36">
            <path d="M0 8h34M28 2l6 6-6 6" stroke="#ffb3c6" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <div class="how-step">
          <div class="hs-num">02</div>
          <div class="hs-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b9d" stroke-width="1.8" width="28">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <h4>Elige un hábito</h4>
          <p>Selecciona qué quieres lograr en 30 días.</p>
        </div>

        <div class="how-arrow" aria-hidden="true">
          <svg viewBox="0 0 40 16" fill="none" width="36">
            <path d="M0 8h34M28 2l6 6-6 6" stroke="#ffb3c6" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <div class="how-step">
          <div class="hs-num">03</div>
          <div class="hs-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b9d" stroke-width="1.8" width="28">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <h4>Sigue tu progreso</h4>
          <p>Completa tareas y mantén tu racha viva.</p>
        </div>

      </div>
    </div>
  </section>
</template>

<style scoped>
.s-how { padding: 72px 0 80px; background: #fff; }   /* ← menos espacio arriba */

.s-inner { max-width: 1100px; margin: 0 auto; padding: 0 6vw; }

.s-head { text-align: center; margin-bottom: 48px; }

.section-tag {
  display: inline-block;
  background: rgba(255,107,157,.1);
  color: #ff6b9d;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 6px 16px;
  border-radius: 99px;
  margin-bottom: 16px;
  border: 1px solid rgba(255,107,157,.2);
}

.s-head h2 {
  font-size: clamp(26px, 3vw, 42px);
  font-weight: 800;
  letter-spacing: -.8px;
  color: #22284E;
  margin-bottom: 10px;
}
.s-head p { font-size: 16px; color: rgba(34,40,78,.5); margin: 0; }

.how-steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
}

.how-step {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  max-width: 200px;
}

.hs-num {
  font-size: 11px; font-weight: 800;
  letter-spacing: .1em; color: #ff6b9d;
  margin-bottom: 14px;
}

.hs-icon {
  width: 68px; height: 68px;
  background: linear-gradient(135deg, #fff5f8, #ffe4f0);
  border: 1.5px solid rgba(255,107,157,.2);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
  transition: background .3s, box-shadow .3s;
}
.how-step:hover .hs-icon {
  background: linear-gradient(135deg, #ff6b9d, #ffb3c6);
  box-shadow: 0 8px 24px rgba(255,107,157,.3);
}
.how-step:hover .hs-icon svg { stroke: #fff; }
.hs-icon svg { transition: stroke .3s; }

.how-step h4 { font-size: 15px; font-weight: 700; color: #22284E; margin-bottom: 6px; }
.how-step p  { font-size: 13px; color: rgba(34,40,78,.55); line-height: 1.6; margin: 0; }

.how-arrow { color: rgba(255,107,157,.4); margin: 34px 16px 0; flex-shrink: 0; }

@media (max-width: 700px) {
  .how-arrow { display: none; }
  .how-steps { gap: 32px; }
}
</style>