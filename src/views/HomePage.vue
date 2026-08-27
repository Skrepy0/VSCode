<template>
  <ion-page>
    <ion-content :fullscreen="true" class="iframe-container">
      <iframe
        ref="iframeRef"
        :src="currentUrl"
        class="web-iframe"
        frameborder="0"
        @load="onIframeLoadSuccess"
        @error="onIframeLoadError"
        allow="geolocation; microphone; camera; midi; encrypted-media; autoplay; clipboard-write"
        allowfullscreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>

      <div v-if="loadFailed" class="error-overlay">
        <div class="error-content">
          <ion-icon :icon="cloudOfflineOutline" size="large" class="error-icon"></ion-icon>
          <h3>无法连接到 http://127.0.0.1:1145</h3>
          <p>请检查网络连接后重试</p>
          <ion-button @click="retryLoad" color="primary">重新加载</ion-button>
        </div>
      </div>

      <div v-if="isLoading && !loadFailed" class="loading-overlay">
        <ion-spinner name="crescent"></ion-spinner>
        <p>加载中...</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { App } from '@capacitor/app'
import { cloudOfflineOutline } from 'ionicons/icons'

const TARGET_URL = 'http://127.0.0.1:1145'

const currentUrl = ref(TARGET_URL)
const isLoading = ref(true)
const loadFailed = ref(false)

let backButtonListener: any = null
let loadTimeout: ReturnType<typeof setTimeout> | null = null

const preCheckUrl = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    await fetch(url, { method: 'HEAD', signal: controller.signal, mode: 'no-cors' })
    clearTimeout(timeoutId)
    return true
  } catch (error) {
    console.error('预检失败:', error)
    return false
  }
}

const onIframeLoadSuccess = () => {
  if (loadTimeout) {
    clearTimeout(loadTimeout)
    loadTimeout = null
  }
  isLoading.value = false
  loadFailed.value = false
  console.log('iframe 加载成功')
}

const onIframeLoadError = () => {
  console.log('iframe 触发 error 事件')
  handleLoadFailure()
}

const handleLoadFailure = () => {
  if (loadTimeout) {
    clearTimeout(loadTimeout)
    loadTimeout = null
  }
  isLoading.value = false
  loadFailed.value = true
}

const retryLoad = () => {
  loadFailed.value = false
  isLoading.value = true
  currentUrl.value = ''
  setTimeout(() => {
    currentUrl.value = TARGET_URL
  }, 50)
  startLoadTimeout()
}

const startLoadTimeout = () => {
  if (loadTimeout) clearTimeout(loadTimeout)
  loadTimeout = setTimeout(() => {
    if (isLoading.value && !loadFailed.value) {
      console.log('iframe 加载超时')
      handleLoadFailure()
    }
  }, 10000)
}

const initBackButton = () => {
  backButtonListener = App.addListener('backButton', async () => {
    if (loadFailed.value) {
      await App.minimizeApp()
    }
  })
}

const loadIframeContent = async () => {
  isLoading.value = true
  loadFailed.value = false
  const isReachable = await preCheckUrl(TARGET_URL)
  if (!isReachable) {
    handleLoadFailure()
    return
  }
  startLoadTimeout()
}

onMounted(() => {
  initBackButton()
  loadIframeContent()
})

onUnmounted(() => {
  backButtonListener?.remove()
  if (loadTimeout) clearTimeout(loadTimeout)
})
</script>

<style scoped>
.iframe-container {
  position: relative;
}
.web-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.error-overlay,
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  flex-direction: column;
  z-index: 10;
}
.error-content {
  text-align: center;
  padding: 20px;
}
.error-icon {
  font-size: 64px;
  color: #666;
  margin-bottom: 16px;
}
.loading-overlay {
  background: rgba(255, 256, 255, 0.9);
}
.loading-overlay ion-spinner {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}
</style>
