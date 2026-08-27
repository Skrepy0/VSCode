<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

let lastBackPressTime = 0
let backButtonHandler: any = null

async function hideStatusBar() {
  try {
    await StatusBar.hide()
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setOverlaysWebView({ overlay: true })
  } catch {
    // 某些平台不支持，忽略
  }
}

onMounted(async () => {
  // 立即隐藏状态栏
  await hideStatusBar()

  // 多次延迟执行以应对 ColorOS 的强制恢复
  setTimeout(hideStatusBar, 300)
  setTimeout(hideStatusBar, 800)
  setTimeout(hideStatusBar, 1500)
  setTimeout(hideStatusBar, 3000)

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
