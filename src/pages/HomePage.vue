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

function handleCreateChallengeSignin(mode = 'signin') {
  showCreateChallenge.value = false
  authMode.value = mode
  showAuth.value = true
}

const authMode = ref('signin')

function openAuth(mode = 'signin') {
  authMode.value = mode
  showAuth.value = true
}
</script>

<template>
  <AppNavbar
    @signin="openAuth('login')"
    @start="openCreateChallenge"
  />

  <HeroSection
    @start="openCreateChallenge"
    @signin="openAuth"
  />

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
    :initial-mode="authMode"
    @close="showAuth = false"
  />

  <AppFooter />
</template>

<style>
.solo-web {
  display: none;
}

@media (min-width: 768px) {
  .solo-web {
    display: block;
  }
}
</style>