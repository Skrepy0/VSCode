// @grant GM_xmlhttpRequest
;(function () {
  'use strict'

  // 防止重复注入
  if (window.__gifOverlayInstalled) return
  window.__gifOverlayInstalled = true

  // ========== 默认设置 ==========
  const DEFAULT_SETTINGS = {
    imageUrl: 'https://blog.skrepy.dpdns.org/assets/images/tianlubixie.gif',
    opacity: 0.85,
    maxWidth: 200,
    maxHeight: 200,
    bottom: 24,
    right: 24,
    shortcut: 'Ctrl+Alt+T',
    buttonEdge: 'right',
    buttonOffset: 0.5,
  }

  // ========== localStorage 读写 ==========
  function loadSettings() {
    try {
      const stored = localStorage.getItem('tianlu_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (e) {
      console.warn('设置解析失败，使用默认值')
    }
    return { ...DEFAULT_SETTINGS }
  }

  function saveSettings(settings) {
    localStorage.setItem('tianlu_settings', JSON.stringify(settings))
  }

  let settings = loadSettings()

  // ========== 注入全局 CSS（代替 GM_addStyle） ==========
  const style = document.createElement('style')
  style.textContent = `
                    #tianlu-container {
                      position: fixed;
                      z-index: 999;
                      cursor: default;
                      pointer-events: none;
                      border-radius: 12px;
                      overflow: hidden;
                      transition: opacity 0.3s ease;
                    }
                    #tianlu-container img {
                      display: block;
                      width: auto;
                      height: auto;
                    }
                    @media (max-width: 719px) {
                      #tianlu-container {
                        bottom: 8px !important;
                        right: 8px !important;
                      }
                      #tianlu-container img {
                        max-width: 100px !important;
                        max-height: 100px !important;
                      }
                    }

                    #tianlu-toggle-btn {
                      position: fixed;
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      background: rgba(0, 0, 0, 0.3);
                      color: #fff;
                      font-size: 22px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: grab;
                      z-index: 99999;
                      user-select: none;
                      backdrop-filter: blur(4px);
                      border: 1px solid rgba(255, 255, 255, 0.2);
                      font-family: 'Segoe UI', Arial, sans-serif;
                      line-height: 1;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                      touch-action: none;
                      transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                                  top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                                  width 0.2s, height 0.2s, background 0.2s,
                                  transform 0.3s ease;
                      will-change: transform;
                    }
                    #tianlu-toggle-btn:hover {
                      background: rgba(0, 0, 0, 0.6);
                      border-color: rgba(255, 255, 255, 0.5);
                      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
                      cursor: grab;
                    }
                    #tianlu-toggle-btn:active {
                      cursor: grabbing;
                    }

                    #tianlu-settings-overlay {
                      position: fixed;
                      top: 0;
                      left: 0;
                      width: 100%;
                      height: 100%;
                      background: rgba(0,0,0,0.4);
                      z-index: 9999;
                      display: none;
                      justify-content: center;
                      align-items: center;
                    }
                    #tianlu-settings-panel {
                      background: #fff;
                      color: #333;
                      border-radius: 16px;
                      padding: 24px 32px;
                      max-width: 460px;
                      width: 90%;
                      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                      font-family: system-ui, -apple-system, sans-serif;
                      font-size: 14px;
                      max-height: 90vh;
                      overflow-y: auto;
                      position: relative;
                    }
                    #tianlu-settings-panel h2 {
                      margin-top: 0;
                      margin-bottom: 16px;
                      font-weight: 600;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    }
                    #tianlu-settings-panel .close-btn {
                      background: none;
                      border: none;
                      font-size: 24px;
                      cursor: pointer;
                      padding: 0 8px;
                      color: #888;
                    }
                    #tianlu-settings-panel .close-btn:hover {
                      color: #000;
                    }
                    .setting-group {
                      margin-bottom: 18px;
                    }
                    .setting-group label {
                      display: block;
                      font-weight: 500;
                      margin-bottom: 4px;
                      color: #555;
                    }
                    .setting-group input[type="text"],
                    .setting-group input[type="number"] {
                      width: 100%;
                      padding: 8px 10px;
                      border: 1px solid #ccc;
                      border-radius: 8px;
                      font-size: 14px;
                      box-sizing: border-box;
                    }
                    .setting-group input[type="range"] {
                      width: 100%;
                      margin: 6px 0;
                    }
                    .setting-group .range-value {
                      float: right;
                      font-weight: 600;
                      color: #333;
                    }
                    .setting-row {
                      display: flex;
                      gap: 12px;
                    }
                    .setting-row .setting-group {
                      flex: 1;
                    }
                    .shortcut-input {
                      background: #f5f5f5;
                      padding: 8px 12px;
                      border-radius: 8px;
                      font-family: monospace;
                      cursor: pointer;
                      user-select: none;
                      border: 1px dashed #aaa;
                      text-align: center;
                      font-size: 16px;
                    }
                    .shortcut-input:focus {
                      border-color: #007bff;
                      outline: none;
                      background: #fff;
                    }
                    .hint {
                      font-size: 12px;
                      color: #999;
                      margin-top: 4px;
                    }
                    .save-hint {
                      text-align: center;
                      margin-top: 12px;
                      font-size: 13px;
                      color: #28a745;
                      opacity: 0;
                      transition: opacity 0.3s;
                    }
                    .save-hint.show {
                      opacity: 1;
                    }
                  `
  document.head.appendChild(style)

  // ========== 创建主容器 ==========
  const container = document.createElement('div')
  container.id = 'tianlu-container'
  container.title = 'gif'

  const img = document.createElement('img')
  img.alt = 'tianlubixie'
  container.appendChild(img)
  document.body.appendChild(container)

  // ========== 图片加载 ==========
  function loadImage(url) {
    if (!url) return
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer', // 尝试使用 arraybuffer
      onload: function (response) {
        console.log('GM_xmlhttpRequest 状态:', response.status)
        if (response.status === 200) {
          const data = response.response
          console.log('响应数据类型:', typeof data)
          console.log('是否是 ArrayBuffer:', data instanceof ArrayBuffer)
          console.log('是否是 Blob:', data instanceof Blob)
          console.log('数据长度/大小:', data ? data.byteLength || data.size || '未知' : '空')

          // 如果数据为空或 undefined，报错退出
          if (!data) {
            console.error('响应数据为空')
            img.alt = '加载失败'
            return
          }

          let blob
          // 根据类型构造 Blob
          if (data instanceof Blob) {
            blob = data
          } else if (data instanceof ArrayBuffer) {
            blob = new Blob([data])
          } else if (typeof data === 'string') {
            // 如果返回的是字符串（如 base64），可以尝试转换，但通常不会
            console.warn('返回的是字符串，尝试转为 Blob')
            blob = new Blob([data], { type: 'text/plain' })
          } else {
            console.error('未知数据类型，无法构造 Blob')
            img.alt = '加载失败'
            return
          }

          const reader = new FileReader()
          reader.onload = function (e) {
            img.src = e.target.result
            img.onerror = function () {
              console.error('图片解码失败')
              img.alt = '加载失败'
            }
          }
          reader.onerror = function (e) {
            console.error('FileReader 错误:', e)
            img.alt = '加载失败'
          }
          reader.readAsDataURL(blob)
        } else {
          console.error('请求状态码异常:', response.status)
          img.alt = '加载失败'
        }
      },
      onerror: function (err) {
        console.error('GM_xmlhttpRequest 请求异常:', err)
        img.alt = '加载失败'
      },
    })
  }

  // ========== 应用样式到容器 ==========
  function applyStyles() {
    const { opacity, maxWidth, maxHeight, bottom, right } = settings
    container.style.opacity = opacity
    container.style.bottom = bottom + 'px'
    container.style.right = right + 'px'
    img.style.maxWidth = maxWidth + 'px'
    img.style.maxHeight = maxHeight + 'px'
  }

  loadImage(settings.imageUrl)
  applyStyles()

  // ========== 创建设置面板 overlay ==========
  const overlay = document.createElement('div')
  overlay.id = 'tianlu-settings-overlay'
  overlay.innerHTML = `
                    <div id="tianlu-settings-panel">
                      <h2>
                        <span>⚙️ 设置</span>
                        <button class="close-btn" id="tianlu-close-settings">✕</button>
                      </h2>
                      <div class="setting-group">
                        <label>🖼️ 图片链接</label>
                        <input type="text" id="tianlu-url" placeholder="输入图片URL" />
                      </div>
                      <div class="setting-group">
                        <label>🎨 透明度 <span class="range-value" id="tianlu-opacity-display">${settings.opacity}</span></label>
                        <input type="range" id="tianlu-opacity" min="0" max="1" step="0.05" value="${settings.opacity}" />
                      </div>
                      <div class="setting-row">
                        <div class="setting-group">
                          <label>📐 最大宽度 (px)</label>
                          <input type="number" id="tianlu-maxwidth" value="${settings.maxWidth}" min="20" max="500" />
                        </div>
                        <div class="setting-group">
                          <label>📐 最大高度 (px)</label>
                          <input type="number" id="tianlu-maxheight" value="${settings.maxHeight}" min="20" max="500" />
                        </div>
                      </div>
                      <div class="setting-row">
                        <div class="setting-group">
                          <label>⬇️ 距底部 (px)</label>
                          <input type="number" id="tianlu-bottom" value="${settings.bottom}" min="0" max="200" />
                        </div>
                        <div class="setting-group">
                          <label>➡️ 距右侧 (px)</label>
                          <input type="number" id="tianlu-right" value="${settings.right}" min="0" max="200" />
                        </div>
                      </div>
                      <div class="setting-group">
                        <label>⌨️ 呼出快捷键</label>
                        <div class="shortcut-input" id="tianlu-shortcut" tabindex="0">${settings.shortcut}</div>
                        <div class="hint">点击输入框后按下新的组合键（如 Ctrl+Alt+E）</div>
                      </div>
                      <div class="save-hint" id="tianlu-save-hint">✅ 设置已自动保存</div>
                    </div>
                  `
  document.body.appendChild(overlay)

  // ========== 创建拖拽按钮 ==========
  const toggleBtn = document.createElement('div')
  toggleBtn.id = 'tianlu-toggle-btn'
  toggleBtn.title = '拖动调整位置 | 悬停展开 | 点击打开设置'
  toggleBtn.textContent = '⚙️'
  document.body.appendChild(toggleBtn)

  const BTN_SIZE = 40
  const DOCK_VISIBLE = 18

  let isDocked = true
  let isExpanded = false
  let isDragging = false
  let dragStartX = 0,
    dragStartY = 0
  let startLeft = 0,
    startTop = 0
  let moved = false

  function dockToEdge(edge, offset) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left, top

    if (edge === 'left') {
      left = 0
      top = Math.min(Math.max((vh - BTN_SIZE) * offset, 0), vh - BTN_SIZE)
    } else if (edge === 'right') {
      left = vw - BTN_SIZE
      top = Math.min(Math.max((vh - BTN_SIZE) * offset, 0), vh - BTN_SIZE)
    } else if (edge === 'top') {
      top = 0
      left = Math.min(Math.max((vw - BTN_SIZE) * offset, 0), vw - BTN_SIZE)
    } else if (edge === 'bottom') {
      top = vh - BTN_SIZE
      left = Math.min(Math.max((vw - BTN_SIZE) * offset, 0), vw - BTN_SIZE)
    } else {
      edge = 'right'
      left = vw - BTN_SIZE
      top = vh - BTN_SIZE
    }

    settings.buttonEdge = edge
    settings.buttonOffset = offset
    saveSettings(settings)

    if (isDocked) {
      if (edge === 'left') {
        left = -(BTN_SIZE - DOCK_VISIBLE)
      } else if (edge === 'right') {
        left = vw - DOCK_VISIBLE
      } else if (edge === 'top') {
        top = -(BTN_SIZE - DOCK_VISIBLE)
      } else if (edge === 'bottom') {
        top = vh - DOCK_VISIBLE
      }
      if (edge === 'top' || edge === 'bottom') {
        const offsetX = settings.buttonOffset
        left = Math.min(Math.max((vw - BTN_SIZE) * offsetX, 0), vw - BTN_SIZE)
      }
      if (edge === 'left' || edge === 'right') {
        const offsetY = settings.buttonOffset
        top = Math.min(Math.max((vh - BTN_SIZE) * offsetY, 0), vh - BTN_SIZE)
      }
    } else {
      if (edge === 'left') {
        left = 0
        top = Math.min(Math.max((vh - BTN_SIZE) * offset, 0), vh - BTN_SIZE)
      } else if (edge === 'right') {
        left = vw - BTN_SIZE
        top = Math.min(Math.max((vh - BTN_SIZE) * offset, 0), vh - BTN_SIZE)
      } else if (edge === 'top') {
        top = 0
        left = Math.min(Math.max((vw - BTN_SIZE) * offset, 0), vw - BTN_SIZE)
      } else if (edge === 'bottom') {
        top = vh - BTN_SIZE
        left = Math.min(Math.max((vw - BTN_SIZE) * offset, 0), vw - BTN_SIZE)
      }
    }

    toggleBtn.style.left = left + 'px'
    toggleBtn.style.top = top + 'px'
    toggleBtn.style.right = 'auto'
    toggleBtn.style.bottom = 'auto'
  }

  function snapToEdge() {
    const rect = toggleBtn.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const vw = window.innerWidth
    const vh = window.innerHeight

    const distLeft = cx
    const distRight = vw - cx
    const distTop = cy
    const distBottom = vh - cy
    const minDist = Math.min(distLeft, distRight, distTop, distBottom)

    let edge, offset
    if (minDist === distLeft) {
      edge = 'left'
      offset = (cy - rect.height / 2) / (vh - rect.height)
    } else if (minDist === distRight) {
      edge = 'right'
      offset = (cy - rect.height / 2) / (vh - rect.height)
    } else if (minDist === distTop) {
      edge = 'top'
      offset = (cx - rect.width / 2) / (vw - rect.width)
    } else {
      edge = 'bottom'
      offset = (cx - rect.width / 2) / (vw - rect.width)
    }
    offset = Math.max(0, Math.min(1, offset))

    isDocked = true
    isExpanded = false
    dockToEdge(edge, offset)
  }

  function expandButton() {
    if (isDragging) return
    isDocked = false
    isExpanded = true
    const { buttonEdge, buttonOffset } = settings
    const wasDocked = isDocked
    isDocked = false
    dockToEdge(buttonEdge, buttonOffset)
    isDocked = wasDocked
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left, top
    const edge = buttonEdge
    const offset = buttonOffset
    if (edge === 'left') {
      left = 0
      top = Math.min(Math.max((vh - BTN_SIZE) * offset, 0), vh - BTN_SIZE)
    } else if (edge === 'right') {
      left = vw - BTN_SIZE
      top = Math.min(Math.max((vh - BTN_SIZE) * offset, 0), vh - BTN_SIZE)
    } else if (edge === 'top') {
      top = 0
      left = Math.min(Math.max((vw - BTN_SIZE) * offset, 0), vw - BTN_SIZE)
    } else if (edge === 'bottom') {
      top = vh - BTN_SIZE
      left = Math.min(Math.max((vw - BTN_SIZE) * offset, 0), vw - BTN_SIZE)
    }
    toggleBtn.style.left = left + 'px'
    toggleBtn.style.top = top + 'px'
    isExpanded = true
    isDocked = false
  }

  function dockButton() {
    if (isDragging) return
    isExpanded = false
    isDocked = true
    dockToEdge(settings.buttonEdge, settings.buttonOffset)
  }

  let dockTimeout = null
  toggleBtn.addEventListener('mouseenter', function () {
    clearTimeout(dockTimeout)
    if (!isDragging) expandButton()
  })
  toggleBtn.addEventListener('mouseleave', function () {
    if (!isDragging) {
      dockTimeout = setTimeout(() => {
        if (!isDragging && !isExpanded) return
        dockButton()
      }, 800)
    }
  })

  // ---- 拖拽逻辑 ----
  const onDragStart = (e) => {
    const event = e.touches ? e.touches[0] : e
    if (isDocked) expandButton()
    isDragging = true
    moved = false
    dragStartX = event.clientX
    dragStartY = event.clientY
    const rect = toggleBtn.getBoundingClientRect()
    startLeft = rect.left
    startTop = rect.top
    toggleBtn.style.transition = 'none'
    toggleBtn.style.cursor = 'grabbing'
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('touchmove', onDragMove, { passive: false })
    document.addEventListener('touchend', onDragEnd)
    e.preventDefault()
  }

  const onDragMove = (e) => {
    const event = e.touches ? e.touches[0] : e
    if (!isDragging) return
    const dx = event.clientX - dragStartX
    const dy = event.clientY - dragStartY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
    let newX = startLeft + dx
    let newY = startTop + dy
    newX = Math.max(-BTN_SIZE + 5, Math.min(window.innerWidth - 5, newX))
    newY = Math.max(-BTN_SIZE + 5, Math.min(window.innerHeight - 5, newY))
    toggleBtn.style.left = newX + 'px'
    toggleBtn.style.top = newY + 'px'
    e.preventDefault()
  }

  const onDragEnd = (e) => {
    if (!isDragging) return
    isDragging = false
    toggleBtn.style.cursor = 'grab'
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('touchmove', onDragMove)
    document.removeEventListener('touchend', onDragEnd)
    toggleBtn.style.transition = ''
    if (!moved) {
      toggleSettings()
      clearTimeout(dockTimeout)
      dockTimeout = setTimeout(() => dockButton(), 1500)
      return
    }
    snapToEdge()
  }

  toggleBtn.addEventListener('mousedown', onDragStart)
  toggleBtn.addEventListener('touchstart', onDragStart, { passive: false })

  function initButtonPosition() {
    const { buttonEdge, buttonOffset } = settings
    isDocked = true
    isExpanded = false
    dockToEdge(buttonEdge, buttonOffset)
  }
  initButtonPosition()

  // resize 事件处理函数（命名函数以便后续移除）
  const handleResize = function () {
    if (isDocked) {
      dockToEdge(settings.buttonEdge, settings.buttonOffset)
    } else {
      expandButton()
    }
  }
  window.addEventListener('resize', handleResize)

  // ========== 绑定设置面板事件 ==========
  const urlInput = document.getElementById('tianlu-url')
  const opacityRange = document.getElementById('tianlu-opacity')
  const opacityDisplay = document.getElementById('tianlu-opacity-display')
  const maxWidthInput = document.getElementById('tianlu-maxwidth')
  const maxHeightInput = document.getElementById('tianlu-maxheight')
  const bottomInput = document.getElementById('tianlu-bottom')
  const rightInput = document.getElementById('tianlu-right')
  const shortcutInput = document.getElementById('tianlu-shortcut')
  const closeBtn = document.getElementById('tianlu-close-settings')
  const saveHint = document.getElementById('tianlu-save-hint')

  function updateSetting(key, value) {
    settings[key] = value
    saveSettings(settings)
    if (key === 'imageUrl') {
      loadImage(value)
    } else if (key === 'opacity') {
      container.style.opacity = value
      opacityDisplay.textContent = value
    } else if (key === 'maxWidth') {
      img.style.maxWidth = value + 'px'
    } else if (key === 'maxHeight') {
      img.style.maxHeight = value + 'px'
    } else if (key === 'bottom') {
      container.style.bottom = value + 'px'
    } else if (key === 'right') {
      container.style.right = value + 'px'
    }
    saveHint.classList.add('show')
    clearTimeout(saveHint._timeout)
    saveHint._timeout = setTimeout(() => saveHint.classList.remove('show'), 1500)
  }

  urlInput.addEventListener('change', function () {
    updateSetting('imageUrl', this.value.trim())
  })
  opacityRange.addEventListener('input', function () {
    const val = parseFloat(this.value)
    updateSetting('opacity', val)
  })
  maxWidthInput.addEventListener('change', function () {
    const val = parseInt(this.value, 10)
    if (!isNaN(val) && val > 0) updateSetting('maxWidth', val)
  })
  maxHeightInput.addEventListener('change', function () {
    const val = parseInt(this.value, 10)
    if (!isNaN(val) && val > 0) updateSetting('maxHeight', val)
  })
  bottomInput.addEventListener('change', function () {
    const val = parseInt(this.value, 10)
    if (!isNaN(val)) updateSetting('bottom', val)
  })
  rightInput.addEventListener('change', function () {
    const val = parseInt(this.value, 10)
    if (!isNaN(val)) updateSetting('right', val)
  })

  // ---- 快捷键设置 ----
  let isCapturing = false
  shortcutInput.addEventListener('click', function (e) {
    e.stopPropagation()
    if (isCapturing) return
    isCapturing = true
    this.textContent = '按下组合键...'
    this.style.borderColor = '#007bff'
    const onKeyDown = (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(ev.key)) return
      const parts = []
      if (ev.ctrlKey) parts.push('Ctrl')
      if (ev.shiftKey) parts.push('Shift')
      if (ev.altKey) parts.push('Alt')
      if (ev.metaKey) parts.push('Meta')
      const key = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key
      if (key && !['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        parts.push(key)
      } else {
        return
      }
      const combo = parts.join('+')
      if (combo) {
        shortcutInput.textContent = combo
        updateSetting('shortcut', combo)
        isCapturing = false
        shortcutInput.style.borderColor = ''
        document.removeEventListener('keydown', onKeyDown)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const onBlur = () => {
      if (isCapturing) {
        isCapturing = false
        shortcutInput.textContent = settings.shortcut
        shortcutInput.style.borderColor = ''
        document.removeEventListener('keydown', onKeyDown)
        shortcutInput.removeEventListener('blur', onBlur)
      }
    }
    shortcutInput.addEventListener('blur', onBlur)
  })

  // ========== 打开/关闭设置面板 ==========
  function toggleSettings() {
    if (overlay.style.display === 'flex') {
      overlay.style.display = 'none'
    } else {
      urlInput.value = settings.imageUrl
      opacityRange.value = settings.opacity
      opacityDisplay.textContent = settings.opacity
      maxWidthInput.value = settings.maxWidth
      maxHeightInput.value = settings.maxHeight
      bottomInput.value = settings.bottom
      rightInput.value = settings.right
      shortcutInput.textContent = settings.shortcut
      overlay.style.display = 'flex'
    }
  }

  closeBtn.addEventListener('click', toggleSettings)
  overlay.addEventListener('click', function (e) {
    if (e.target === this) toggleSettings()
  })

  // ========== 全局快捷键呼出 ==========
  const handleGlobalShortcut = function (e) {
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (e.target.closest('#tianlu-settings-panel')) return

    const currentShortcut = settings.shortcut
    const parts = currentShortcut.split('+')
    const key = parts.pop()
    const modifiers = parts
    const matchCtrl = modifiers.includes('Ctrl') ? e.ctrlKey : !e.ctrlKey
    const matchShift = modifiers.includes('Shift') ? e.shiftKey : !e.shiftKey
    const matchAlt = modifiers.includes('Alt') ? e.altKey : !e.altKey
    const matchMeta = modifiers.includes('Meta') ? e.metaKey : !e.metaKey
    const matchKey = e.key.toUpperCase() === key.toUpperCase() || e.key === key
    if (matchCtrl && matchShift && matchAlt && matchMeta && matchKey) {
      e.preventDefault()
      toggleSettings()
    }
  }
  document.addEventListener('keydown', handleGlobalShortcut)

  // ========== 清理函数（防止内存泄露） ==========
  function cleanup() {
    // 移除全局事件监听器
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('keydown', handleGlobalShortcut)

    // 清理定时器
    if (dockTimeout) {
      clearTimeout(dockTimeout)
      dockTimeout = null
    }
    if (saveHint._timeout) {
      clearTimeout(saveHint._timeout)
      saveHint._timeout = null
    }

    // 移除 DOM 元素
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay)
    }
    if (toggleBtn && toggleBtn.parentNode) {
      toggleBtn.parentNode.removeChild(toggleBtn)
    }
    if (style && style.parentNode) {
      style.parentNode.removeChild(style)
    }

    // 重置安装标志，允许重新注入
    window.__gifOverlayInstalled = false
  }

  // 页面卸载时清理资源
  window.addEventListener('beforeunload', cleanup)
  window.addEventListener('pagehide', cleanup)

  console.log('图片浮窗已加载（完整版）')
})()
