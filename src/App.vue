<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
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

// 保存定时器 ID 以便清理
const timers: ReturnType<typeof setTimeout>[] = []

onMounted(async () => {
  // 立即隐藏状态栏
  await hideStatusBar()

  // 多次延迟执行以应对 ColorOS 的强制恢复
  timers.push(setTimeout(hideStatusBar, 300))
  timers.push(setTimeout(hideStatusBar, 800))
  timers.push(setTimeout(hideStatusBar, 1500))
  timers.push(setTimeout(hideStatusBar, 3000))
})

onUnmounted(() => {
  // 清理未执行的定时器，防止内存泄露
  timers.forEach(clearTimeout)
})
</script>
