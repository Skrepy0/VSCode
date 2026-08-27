<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { StatusBar, Style } from '@capacitor/status-bar'

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
})
</script>
