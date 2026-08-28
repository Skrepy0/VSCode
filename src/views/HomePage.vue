<template>
  <ion-page>
    <ion-content :fullscreen="true" class="iframe-container">
      <div v-if="loading" class="loading-overlay">
        <ion-spinner name="crescent"></ion-spinner>
        <p>正在加载 code-server...</p>
      </div>
      <iframe
        ref="iframeRef"
        :src="currentUrl"
        class="web-iframe"
        frameborder="0"
        @load="onIframeLoadSuccess"
        @error="onIframeLoadError"
        allow="geolocation; microphone; camera; midi; encrypted-media"
        allowfullscreen
      ></iframe>
      <div v-if="loadFailed" class="error-overlay">
        <div class="error-content">
          <ion-icon :icon="cloudOfflineOutline" size="large" class="error-icon"></ion-icon>
          <h3>无法连接到 {{ iframeSrc }}</h3>
          <p>请检查 code-server 是否已启动</p>
          <ion-button @click="retryLoad" color="primary">重新加载</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/vue'
import { ref, onUnmounted } from 'vue'
import { cloudOfflineOutline } from 'ionicons/icons'

const loadFailed = ref(false)
const loading = ref(true)
const iframeSrc = 'http://localhost:1145'
const currentUrl = ref(iframeSrc)
let loadTimeout: ReturnType<typeof setTimeout> | null = null

const retryLoad = () => {
  loadFailed.value = false
  loading.value = true
  currentUrl.value = ''
  setTimeout(() => {
    currentUrl.value = iframeSrc
  }, 50)
  startLoadTimeout()
}

const startLoadTimeout = () => {
  if (loadTimeout) clearTimeout(loadTimeout)
  loadTimeout = setTimeout(() => {
    if (loading.value && !loadFailed.value) {
      console.log('iframe 加载超时')
      handleLoadFailure()
    }
  }, 10000)
}

const handleLoadFailure = () => {
  if (loadTimeout) {
    clearTimeout(loadTimeout)
    loadTimeout = null
  }
  loading.value = false
  loadFailed.value = true
}

const onIframeLoadSuccess = () => {
  console.log('[iframe] 加载成功')
  loading.value = false
}

const onIframeLoadError = () => {
  console.error('[iframe] 加载失败')
  loadFailed.value = true
}

onUnmounted(() => {
  if (loadTimeout) clearTimeout(loadTimeout)
})
</script>

<style scoped>
.iframe-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.code-server-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.error-overlay {
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
</style>
