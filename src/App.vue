<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { onMounted, onUnmounted } from 'vue'
let lastBackPressTime = 0
let backButtonHandler: any = null

onMounted(() => {
  backButtonHandler = App.addListener('backButton', async () => {
    const currentTime = new Date().getTime()
    if (currentTime - lastBackPressTime < 800) {
      await App.exitApp()
    } else {
      lastBackPressTime = currentTime
    }
  })
})

onUnmounted(() => {
  backButtonHandler?.remove()
})
</script>
