<script setup>
import Navbar from '../components/Navbar.vue'
import HeroSection from '../components/sections/HeroSection.vue'
import CreateChallenge from '../pages/CreateChallenge.vue'
import AuthPage from '../pages/AuthPage.vue'
import Footer from '../components/Footer.vue'
import { ref } from 'vue'

const showCreateChallenge = ref(false)
const showAuth = ref(false)

function openCreateChallenge() {
  showCreateChallenge.value = true
}

function openAuth() {
  showAuth.value = true
}

function handleCreateChallengeSignin() {
  showCreateChallenge.value = false
  showAuth.value = true
}
</script>

<template>
  <Navbar 
    @signin="openAuth" 
    @start="openCreateChallenge" 
  />

  <HeroSection 
    @start="openCreateChallenge"
    @signin="openAuth"
  />

  <CreateChallenge 
    :show="showCreateChallenge" 
    @close="showCreateChallenge = false"
    @signin="handleCreateChallengeSignin"
  />
  
  <AuthPage :show="showAuth" @close="showAuth = false" />

  <Footer />
</template>