<script setup>
import { ref } from 'vue'
import AppNavbar           from '../components/layout/AppNavbar.vue'
import AppFooter           from '../components/layout/AppFooter.vue'
import HeroSection         from '../components/home/HeroSection.vue'
import FeaturesSection     from '../components/home/FeaturesSection.vue'
import HowItWorksSection   from '../components/home/HowItWorksSection.vue'
import FaqSection          from '../components/home/FaqSection.vue'
import CtaSection          from '../components/home/CtaSection.vue'
import CreateChallengePage from './CreateChallengePage.vue'
import AuthPage            from './AuthPage.vue'

const showCreateChallenge = ref(false)
const showAuth            = ref(false)

function openCreateChallenge() { showCreateChallenge.value = true }
function openAuth()             { showAuth.value = true }

function handleCreateChallengeSignin() {
  showCreateChallenge.value = false
  showAuth.value = true
}
</script>

<template>
  <AppNavbar
    @signin="openAuth"
    @start="openCreateChallenge"
  />

  <!-- Siempre visible — móvil y web -->
  <HeroSection
    @start="openCreateChallenge"
    @signin="openAuth"
  />

  <!-- Solo visible en web (768px o más) -->
  <div class="solo-web">
    <FeaturesSection />
    <HowItWorksSection />
    <FaqSection />
    <CtaSection @start="openCreateChallenge" />
  </div>

  <CreateChallengePage
    :show="showCreateChallenge"
    @close="showCreateChallenge = false"
    @signin="handleCreateChallengeSignin"
  />

  <AuthPage
    :show="showAuth"
    @close="showAuth = false"
  />

  <AppFooter />
</template>

<style>
/* Por defecto (móvil) — ocultar secciones web */
.solo-web {
  display: none;
}

/* En pantalla grande (768px o más) — mostrar */
@media (min-width: 768px) {
  .solo-web {
    display: block;
  }
}
</style>