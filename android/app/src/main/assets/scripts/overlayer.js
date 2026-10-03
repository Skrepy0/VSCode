// ==UserScript==
// @name         Overlayer
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @icon         https://cdn.modrinth.com/data/IVkzWFlE/248189d69c5ee3a9f0b885cfb5b3cc9bf773acea_96.webp
// @author       Skrepy
// @description  多实例图像浮窗，位置锚定视口右下角，right/bottom 支持负值（特别版：沿用原加载方式）
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

;(function () {
  'use strict'

  // 防止重复注入
  if (window.__overlayer_installed) return
  if (window.top !== window.self) return
  window.__overlayer_installed = true

  // ==================== 默认设置 ====================
  const DEFAULT_GLOBAL = {
    shortcut: 'Ctrl+Alt+T',
    buttonEdge: 'right',
    buttonOffset: 0.5,
  }

  const DEFAULT_LAYER = {
    id: '',
    url: '',
    right: 24,
    bottom: 24,
    width: 200,
    height: 200,
    opacity: 0.85,
    rotation: 0,
    scale: 1.0,
    visible: false,
    layerOrder: 0,
  }

  const STORAGE_KEY = 'overlayer_layers'
  const GLOBAL_KEY = 'overlayer_global'

  // ==================== localStorage 读写 ====================
  function loadGlobalSettings() {
    try {
      const stored = localStorage.getItem(GLOBAL_KEY)
      if (stored) return { ...DEFAULT_GLOBAL, ...JSON.parse(stored) }
    } catch (e) {
      console.warn('全局设置解析失败')
    }
    return { ...DEFAULT_GLOBAL }
  }

  function saveGlobalSettings(s) {
    try {
      localStorage.setItem(GLOBAL_KEY, JSON.stringify(s))
    } catch (e) {
      console.warn('保存全局设置失败:', e)
    }
  }

  // 迁移旧版本字段到 right/bottom（允许负值）
  function migrateLayer(layer) {
    const out = { ...DEFAULT_LAYER, ...layer }
    if (out.right === undefined || out.right === null) out.right = 24
    if (out.bottom === undefined || out.bottom === null) out.bottom = 24
    delete out.x
    delete out.y
    delete out.xPercent
    delete out.yPercent
    delete out.maxWidth
    delete out.maxHeight
    return out
  }

  function loadLayers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const arr = JSON.parse(stored)
        if (Array.isArray(arr) && arr.length > 0) return arr.map(migrateLayer)
      }
    } catch (e) {
      console.warn('图层设置解析失败')
    }
    return [createDefaultLayer(0)]
  }

  function saveLayers(layers) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layers))
    } catch (e) {
      console.warn('保存图层设置失败:', e)
    }
  }

  function createDefaultLayer(existingCount) {
    const id = 'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
    const offset = (existingCount || 0) * 20 // 新图层错开，避免完全重叠
    return {
      ...DEFAULT_LAYER,
      id,
      right: 24 + offset,
      bottom: 24 + offset,
    }
  }

  // ==================== 实例管理 ====================
  const instances = new Map()

  let globalSettings = loadGlobalSettings()
  let layers = loadLayers()

  // ==================== 样式注入（代替 GM_addStyle） ====================
  // 【作用域原则】
  //   .overlayer-layer / #overlayer-toggle-btn 属于脚本自有命名，不会冲突，保持原样。
  //   其余所有通用类名都加 `#overlayer-settings-panel` 前缀限定，只在面板内生效，
  //   不会污染网页本身的同名 class。
  const styleEl = document.createElement('style')
  styleEl.id = 'overlayer-styles'
  styleEl.textContent = `
    /* ---------- 图层容器（独立命名，不影响网页） ---------- */
    .overlayer-layer {
      position: fixed;
      z-index: 999;
      pointer-events: none;
      border-radius: 12px;
      overflow: hidden;
      transition: opacity 0.3s ease, transform 0.2s ease;
      will-change: transform, opacity;
      transform-origin: center center;
    }
    .overlayer-layer img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .overlayer-layer.hidden { display: none !important; }

    @media (max-width: 719px) {
      .overlayer-layer {
        width: 100px !important;
        height: 100px !important;
      }
    }

    /* ---------- 吸附按钮（ID 选择器，唯一） ---------- */
    #overlayer-toggle-btn {
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
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      touch-action: none;
      transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  width 0.2s, height 0.2s, background 0.2s;
    }
    #overlayer-toggle-btn:hover {
      background: rgba(0, 0, 0, 0.6);
      border-color: rgba(255, 255, 255, 0.5);
    }
    #overlayer-toggle-btn:active { cursor: grabbing; }

    /* ---------- 设置面板遮罩（ID 选择器） ---------- */
    #overlayer-settings-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.45);
      z-index: 9999;
      display: none;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(3px);
    }

    /* ---------- 设置面板主体（ID 选择器） ---------- */
    #overlayer-settings-panel {
      background: #1e1e2e;
      color: #cdd6f4;
      border-radius: 16px;
      padding: 0;
      max-width: 520px;
      width: 92%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    #overlayer-settings-panel .panel-header {
      padding: 16px 24px;
      background: #181825;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #313244;
    }
    #overlayer-settings-panel .panel-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #89b4fa;
    }
    #overlayer-settings-panel .close-btn {
      background: none;
      border: none;
      font-size: 22px;
      cursor: pointer;
      padding: 0 8px;
      color: #6c7086;
      transition: color 0.2s;
    }
    #overlayer-settings-panel .close-btn:hover { color: #f38ba8; }

    #overlayer-settings-panel .panel-body {
      padding: 16px 24px 24px;
      overflow-y: auto;
      flex: 1;
    }

    /* ---------- 图层列表（限定在面板内） ---------- */
    #overlayer-settings-panel .layer-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    #overlayer-settings-panel .layer-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #313244;
      border-radius: 10px;
      border: 1px solid #45475a;
      transition: border-color 0.2s;
    }
    #overlayer-settings-panel .layer-item.selected {
      border-color: #89b4fa;
      box-shadow: 0 0 0 1px #89b4fa;
    }
    #overlayer-settings-panel .layer-item .layer-thumb {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      object-fit: cover;
      background: #11111b;
      flex-shrink: 0;
    }
    #overlayer-settings-panel .layer-item .layer-info {
      flex: 1;
      min-width: 0;
    }
    #overlayer-settings-panel .layer-item .layer-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #overlayer-settings-panel .layer-item .layer-meta {
      font-size: 11px;
      color: #6c7086;
      margin-top: 2px;
    }
    #overlayer-settings-panel .layer-item .layer-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    #overlayer-settings-panel .layer-item .layer-actions button {
      background: transparent;
      border: 1px solid #45475a;
      color: #cdd6f4;
      border-radius: 6px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    #overlayer-settings-panel .layer-item .layer-actions button:hover {
      background: #45475a;
      border-color: #89b4fa;
    }
    #overlayer-settings-panel .layer-item .layer-actions button.danger:hover {
      border-color: #f38ba8;
      color: #f38ba8;
    }

    /* ---------- 按钮（限定在面板内） ---------- */
    #overlayer-settings-panel .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #45475a;
      background: #313244;
      color: #cdd6f4;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      font-family: inherit;
    }
    #overlayer-settings-panel .btn:hover {
      background: #45475a;
      border-color: #89b4fa;
    }
    #overlayer-settings-panel .btn.primary {
      background: #89b4fa;
      color: #1e1e2e;
      border-color: #89b4fa;
      font-weight: 600;
    }
    #overlayer-settings-panel .btn.primary:hover { background: #74c7ec; }
    #overlayer-settings-panel .btn-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    /* ---------- 表单控件（限定在面板内） ---------- */
    #overlayer-settings-panel .setting-group { margin-bottom: 14px; }
    #overlayer-settings-panel .setting-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 4px;
      color: #a6adc8;
      font-size: 12px;
    }
    #overlayer-settings-panel .setting-group input[type="text"],
    #overlayer-settings-panel .setting-group input[type="number"] {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #45475a;
      border-radius: 8px;
      font-size: 13px;
      background: #11111b;
      color: #cdd6f4;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    #overlayer-settings-panel .setting-group input:focus {
      border-color: #89b4fa;
      box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.2);
    }
    #overlayer-settings-panel .setting-group input[type="range"] {
      width: 100%;
      margin: 6px 0;
      accent-color: #89b4fa;
    }
    #overlayer-settings-panel .setting-group .range-value {
      float: right;
      font-weight: 600;
      color: #89b4fa;
      font-size: 13px;
    }
    #overlayer-settings-panel .setting-row { display: flex; gap: 10px; }
    #overlayer-settings-panel .setting-row .setting-group { flex: 1; }

    /* ---------- 快捷键输入框（限定在面板内） ---------- */
    #overlayer-settings-panel .shortcut-input {
      background: #11111b;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: monospace;
      cursor: pointer;
      user-select: none;
      border: 1px dashed #45475a;
      text-align: center;
      font-size: 15px;
      color: #cdd6f4;
      transition: border-color 0.2s;
    }
    #overlayer-settings-panel .shortcut-input:focus {
      border-color: #89b4fa;
      outline: none;
      background: #1e1e2e;
    }

    /* ---------- 提示 / 分隔 / 空状态（限定在面板内） ---------- */
    #overlayer-settings-panel .hint {
      font-size: 11px;
      color: #6c7086;
      margin-top: 4px;
    }
    #overlayer-settings-panel .save-hint {
      text-align: center;
      margin-top: 8px;
      font-size: 12px;
      color: #a6e3a1;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #overlayer-settings-panel .save-hint.show { opacity: 1; }
    #overlayer-settings-panel .divider {
      height: 1px;
      background: #313244;
      margin: 16px 0;
    }
    #overlayer-settings-panel .empty-hint {
      text-align: center;
      color: #6c7086;
      padding: 20px 0;
      font-size: 13px;
    }
  `
  ;(document.head || document.documentElement).appendChild(styleEl)

  // ==================== 图像加载（沿用原版 arraybuffer 方式） ====================
  // 与 @grant GM_xmlhttpRequest.txt 完全一致，仅把全局 img 改为传入 targetImg
  function loadImage(url, targetImg) {
    if (!url || !targetImg) return
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

          if (!data) {
            console.error('响应数据为空')
            targetImg.alt = '加载失败'
            return
          }

          let blob
          if (data instanceof Blob) {
            blob = data
          } else if (data instanceof ArrayBuffer) {
            blob = new Blob([data])
          } else if (typeof data === 'string') {
            console.warn('返回的是字符串，尝试转为 Blob')
            blob = new Blob([data], { type: 'text/plain' })
          } else {
            console.error('未知数据类型，无法构造 Blob')
            targetImg.alt = '加载失败'
            return
          }

          const reader = new FileReader()
          reader.onload = function (e) {
            targetImg.src = e.target.result
            targetImg.onerror = function () {
              console.error('图片解码失败')
              targetImg.alt = '加载失败'
            }
          }
          reader.onerror = function (e) {
            console.error('FileReader 错误:', e)
            targetImg.alt = '加载失败'
          }
          reader.readAsDataURL(blob)
        } else {
          console.error('请求状态码异常:', response.status)
          targetImg.alt = '加载失败'
        }
      },
      onerror: function (err) {
        console.error('GM_xmlhttpRequest 请求异常:', err)
        targetImg.alt = '加载失败'
      },
    })
  }

  // ==================== 图层样式应用 ====================
  function applyLayerStyles(instance) {
    const { container, layer } = instance
    const { right, bottom, width, height, opacity, rotation, scale, visible, layerOrder } = layer

    container.classList.toggle('hidden', !visible)

    // right / bottom 允许负值，图层可以部分移出视口
    container.style.left = ''
    container.style.top = ''
    container.style.right = right + 'px'
    container.style.bottom = bottom + 'px'

    container.style.width = width + 'px'
    container.style.height = height + 'px'
    container.style.opacity = opacity
    container.style.zIndex = 999 + (layerOrder || 0)
    container.style.transform = `rotate(${rotation}deg) scale(${scale})`
  }

  // ==================== 图层实例创建 ====================
  function createLayerInstance(layer) {
    if (instances.has(layer.id)) return

    const container = document.createElement('div')
    container.className = 'overlayer-layer'
    container.dataset.layerId = layer.id

    const img = document.createElement('img')
    img.alt = 'overlayer-layer'
    container.appendChild(img)
    document.body.appendChild(container)

    const instance = { container, img, layer }
    instances.set(layer.id, instance)

    if (layer.url) {
      loadImage(layer.url, img)
    }

    applyLayerStyles(instance)
    return instance
  }

  function removeLayerInstance(id) {
    const inst = instances.get(id)
    if (inst) {
      inst.container.remove()
      instances.delete(id)
    }
  }

  function initAllLayers() {
    instances.forEach((inst) => inst.container.remove())
    instances.clear()
    layers.forEach((layer) => createLayerInstance(layer))
  }

  // ==================== 吸附按钮 ====================
  const BTN_SIZE = 40
  const DOCK_VISIBLE = 18

  let toggleBtn,
    isDocked = true,
    isExpanded = false
  let isDragging = false
  let dragStartX = 0,
    dragStartY = 0,
    startLeft = 0,
    startTop = 0
  let moved = false
  let dockTimeout = null

  function createToggleButton() {
    toggleBtn = document.createElement('div')
    toggleBtn.id = 'overlayer-toggle-btn'
    toggleBtn.title = '拖动调整位置 | 悬停展开 | 点击打开设置'
    toggleBtn.textContent = '⚙️'
    document.body.appendChild(toggleBtn)

    toggleBtn.addEventListener('mousedown', onDragStart)
    toggleBtn.addEventListener('touchstart', onDragStart, { passive: false })
    toggleBtn.addEventListener('mouseenter', function () {
      clearTimeout(dockTimeout)
      if (!isDragging) expandButton()
    })
    toggleBtn.addEventListener('mouseleave', function () {
      if (!isDragging) {
        dockTimeout = setTimeout(() => {
          if (!isDragging) dockButton()
        }, 800)
      }
    })
  }

  function dockToEdge(edge, offset) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left, top

    if (edge === 'left') {
      left = isDocked ? -(BTN_SIZE - DOCK_VISIBLE) : 0
      top = Math.min(Math.max((vh - BTN_SIZE) * offset, 0), vh - BTN_SIZE)
    } else if (edge === 'right') {
      left = isDocked ? vw - DOCK_VISIBLE : vw - BTN_SIZE
      top = Math.min(Math.max((vh - BTN_SIZE) * offset, 0), vh - BTN_SIZE)
    } else if (edge === 'top') {
      top = isDocked ? -(BTN_SIZE - DOCK_VISIBLE) : 0
      left = Math.min(Math.max((vw - BTN_SIZE) * offset, 0), vw - BTN_SIZE)
    } else if (edge === 'bottom') {
      top = isDocked ? vh - DOCK_VISIBLE : vh - BTN_SIZE
      left = Math.min(Math.max((vw - BTN_SIZE) * offset, 0), vw - BTN_SIZE)
    } else {
      edge = 'right'
      left = vw - BTN_SIZE
      top = vh - BTN_SIZE
    }

    globalSettings.buttonEdge = edge
    globalSettings.buttonOffset = offset
    saveGlobalSettings(globalSettings)

    toggleBtn.style.left = left + 'px'
    toggleBtn.style.top = top + 'px'
    toggleBtn.style.right = 'auto'
    toggleBtn.style.bottom = 'auto'
  }

  function expandButton() {
    if (isDragging) return
    isDocked = false
    isExpanded = true
    dockToEdge(globalSettings.buttonEdge, globalSettings.buttonOffset)
  }

  function dockButton() {
    if (isDragging) return
    isExpanded = false
    isDocked = true
    dockToEdge(globalSettings.buttonEdge, globalSettings.buttonOffset)
  }

  function snapToEdge() {
    const rect = toggleBtn.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const vw = window.innerWidth
    const vh = window.innerHeight

    const distLeft = cx,
      distRight = vw - cx
    const distTop = cy,
      distBottom = vh - cy
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

  function onDragStart(e) {
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

  function onDragMove(e) {
    const event = e.touches ? e.touches[0] : e
    if (!isDragging) return
    const dx = event.clientX - dragStartX
    const dy = event.clientY - dragStartY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
    const newX = Math.max(-BTN_SIZE + 5, Math.min(window.innerWidth - 5, startLeft + dx))
    const newY = Math.max(-BTN_SIZE + 5, Math.min(window.innerHeight - 5, startTop + dy))
    toggleBtn.style.left = newX + 'px'
    toggleBtn.style.top = newY + 'px'
    e.preventDefault()
  }

  function onDragEnd() {
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

  // ==================== 设置面板 ====================
  let overlay
  let editingLayerId = null

  function createSettingsPanel() {
    overlay = document.createElement('div')
    overlay.id = 'overlayer-settings-overlay'

    const panel = document.createElement('div')
    panel.id = 'overlayer-settings-panel'
    panel.innerHTML = `
      <div class="panel-header">
        <h2>⚙️ Overlayer 图层管理</h2>
        <button class="close-btn" id="overlayer-close-settings">✕</button>
      </div>
      <div class="panel-body" id="overlayer-panel-body"></div>
    `

    overlay.appendChild(panel)
    document.body.appendChild(overlay)

    document.getElementById('overlayer-close-settings').addEventListener('click', toggleSettings)
    overlay.addEventListener('click', function (e) {
      if (e.target === this) toggleSettings()
    })
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function renderSettingsPanel() {
    const body = document.getElementById('overlayer-panel-body')
    if (!body) return

    let html = `
      <div class="btn-row">
        <button class="btn primary" id="overlayer-add-layer">+ 添加图层</button>
        <button class="btn" id="overlayer-reset-all">重置全部</button>
      </div>
      <div class="layer-list">
    `

    if (layers.length === 0) {
      html += `<div class="empty-hint">暂无图层，点击上方按钮添加</div>`
    } else {
      layers.forEach((layer, idx) => {
        html += `
          <div class="layer-item ${editingLayerId === layer.id ? 'selected' : ''}" data-id="${layer.id}">
            <img class="layer-thumb" src="${escapeAttr(layer.url || '')}" alt="" onerror="this.style.opacity='0.2'">
            <div class="layer-info">
              <div class="layer-name">图层 ${idx + 1}</div>
              <div class="layer-meta">${layer.width}×${layer.height} · 右 ${layer.right} 下 ${layer.bottom} · 透明度 ${Math.round(layer.opacity * 100)}%</div>
            </div>
            <div class="layer-actions">
              <button class="edit-layer" data-id="${layer.id}" title="编辑">✎</button>
              <button class="toggle-layer" data-id="${layer.id}" title="${layer.visible ? '隐藏' : '显示'}">${layer.visible ? '👁' : '👁‍🗨'}</button>
              <button class="danger delete-layer" data-id="${layer.id}" title="删除">✕</button>
            </div>
          </div>
        `
      })
    }

    html += `</div>`

    if (editingLayerId) {
      const layer = layers.find((l) => l.id === editingLayerId)
      if (layer) {
        html += `
          <div class="divider"></div>
          <h3 style="margin: 0 0 12px; font-size: 14px; color: #89b4fa;">编辑图层</h3>
          <div class="setting-group">
            <label>🖼️ 图片链接</label>
            <input type="text" id="edit-url" value="${escapeAttr(layer.url)}" placeholder="输入图片URL">
          </div>
          <div class="setting-row">
            <div class="setting-group">
              <label>📐 宽度 (px)</label>
              <input type="number" id="edit-width" value="${layer.width}" min="20" max="2000">
            </div>
            <div class="setting-group">
              <label>📐 高度 (px)</label>
              <input type="number" id="edit-height" value="${layer.height}" min="20" max="2000">
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-group">
              <label>➡️ 距右侧 (px)</label>
              <input type="number" id="edit-right" value="${layer.right}" step="1">
            </div>
            <div class="setting-group">
              <label>⬇️ 距底部 (px)</label>
              <input type="number" id="edit-bottom" value="${layer.bottom}" step="1">
            </div>
          </div>
          <div class="hint" style="margin-top:-6px; margin-bottom:12px;">
            位置锚定视口右下角，跨网站一致。<br>
            支持负值：距离为负时，图层会向视口外偏移（露出一部分）。
          </div>
          <div class="setting-group">
            <label>🎨 透明度 <span class="range-value" id="edit-opacity-display">${layer.opacity}</span></label>
            <input type="range" id="edit-opacity" min="0" max="1" step="0.05" value="${layer.opacity}">
          </div>
          <div class="setting-row">
            <div class="setting-group">
              <label>🔄 旋转 (deg) <span class="range-value" id="edit-rotation-display">${layer.rotation}</span></label>
              <input type="range" id="edit-rotation" min="-180" max="180" step="1" value="${layer.rotation}">
            </div>
            <div class="setting-group">
              <label>🔍 缩放 <span class="range-value" id="edit-scale-display">${layer.scale}</span></label>
              <input type="range" id="edit-scale" min="0.1" max="3" step="0.05" value="${layer.scale}">
            </div>
          </div>
          <div class="setting-group">
            <label>📚 层级顺序</label>
            <input type="number" id="edit-order" value="${layer.layerOrder}" min="0" max="100">
            <div class="hint">数值越大越靠前显示</div>
          </div>
          <div class="save-hint" id="overlayer-save-hint">✅ 设置已自动保存</div>
        `
      }
    }

    html += `
      <div class="divider"></div>
      <div class="setting-group">
        <label>⌨️ 呼出快捷键</label>
        <div class="shortcut-input" id="overlayer-shortcut" tabindex="0">${globalSettings.shortcut}</div>
        <div class="hint">点击输入框后按下新的组合键</div>
      </div>
    `

    body.innerHTML = html
    bindPanelEvents()
  }

  function bindPanelEvents() {
    const addBtn = document.getElementById('overlayer-add-layer')
    if (addBtn)
      addBtn.addEventListener('click', function () {
        const newLayer = createDefaultLayer(layers.length)
        layers.push(newLayer)
        saveLayers(layers)
        createLayerInstance(newLayer)
        editingLayerId = newLayer.id
        renderSettingsPanel()
      })

    const resetBtn = document.getElementById('overlayer-reset-all')
    if (resetBtn)
      resetBtn.addEventListener('click', function () {
        if (!confirm('确定要重置所有图层吗？')) return
        layers = [createDefaultLayer(0)]
        saveLayers(layers)
        editingLayerId = layers[0].id
        initAllLayers()
        renderSettingsPanel()
      })

    document.querySelectorAll('.edit-layer').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation()
        editingLayerId = this.dataset.id
        renderSettingsPanel()
      })
    })

    document.querySelectorAll('.toggle-layer').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation()
        const layer = layers.find((l) => l.id === this.dataset.id)
        if (layer) {
          layer.visible = !layer.visible
          saveLayers(layers)
          const inst = instances.get(layer.id)
          if (inst) applyLayerStyles(inst)
          renderSettingsPanel()
        }
      })
    })

    document.querySelectorAll('.delete-layer').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation()
        const id = this.dataset.id
        if (!confirm('确定删除此图层？')) return
        layers = layers.filter((l) => l.id !== id)
        saveLayers(layers)
        removeLayerInstance(id)
        if (editingLayerId === id) editingLayerId = null
        renderSettingsPanel()
      })
    })

    if (editingLayerId) {
      const layer = layers.find((l) => l.id === editingLayerId)
      if (!layer) return

      const updateLayer = (key, value) => {
        layer[key] = value
        saveLayers(layers)
        const inst = instances.get(layer.id)
        if (inst) {
          inst.layer[key] = value
          applyLayerStyles(inst)
        }
        const hint = document.getElementById('overlayer-save-hint')
        if (hint) {
          hint.classList.add('show')
          clearTimeout(hint._timeout)
          hint._timeout = setTimeout(() => hint.classList.remove('show'), 1500)
        }
      }

      const urlInput = document.getElementById('edit-url')
      if (urlInput)
        urlInput.addEventListener('change', function () {
          const url = this.value.trim()
          updateLayer('url', url)
          const inst = instances.get(layer.id)
          if (inst) {
            loadImage(url, inst.img)
          }
        })

      const widthInput = document.getElementById('edit-width')
      if (widthInput)
        widthInput.addEventListener('change', function () {
          const v = parseInt(this.value, 10)
          if (!isNaN(v) && v > 0) updateLayer('width', v)
        })

      const heightInput = document.getElementById('edit-height')
      if (heightInput)
        heightInput.addEventListener('change', function () {
          const v = parseInt(this.value, 10)
          if (!isNaN(v) && v > 0) updateLayer('height', v)
        })

      // 距右侧：允许任意整数（含负值）
      const rightInput = document.getElementById('edit-right')
      if (rightInput) {
        const commitRight = function () {
          const v = parseInt(this.value, 10)
          if (isNaN(v)) {
            this.value = layer.right
            return
          }
          updateLayer('right', v)
        }
        rightInput.addEventListener('change', commitRight)
        rightInput.addEventListener('input', commitRight)
      }

      // 距底部：允许任意整数（含负值）
      const bottomInput = document.getElementById('edit-bottom')
      if (bottomInput) {
        const commitBottom = function () {
          const v = parseInt(this.value, 10)
          if (isNaN(v)) {
            this.value = layer.bottom
            return
          }
          updateLayer('bottom', v)
        }
        bottomInput.addEventListener('change', commitBottom)
        bottomInput.addEventListener('input', commitBottom)
      }

      const opacityRange = document.getElementById('edit-opacity')
      const opacityDisplay = document.getElementById('edit-opacity-display')
      if (opacityRange)
        opacityRange.addEventListener('input', function () {
          const v = parseFloat(this.value)
          opacityDisplay.textContent = v
          updateLayer('opacity', v)
        })

      const rotationRange = document.getElementById('edit-rotation')
      const rotationDisplay = document.getElementById('edit-rotation-display')
      if (rotationRange)
        rotationRange.addEventListener('input', function () {
          const v = parseInt(this.value, 10)
          rotationDisplay.textContent = v
          updateLayer('rotation', v)
        })

      const scaleRange = document.getElementById('edit-scale')
      const scaleDisplay = document.getElementById('edit-scale-display')
      if (scaleRange)
        scaleRange.addEventListener('input', function () {
          const v = parseFloat(this.value)
          scaleDisplay.textContent = v
          updateLayer('scale', v)
        })

      const orderInput = document.getElementById('edit-order')
      if (orderInput)
        orderInput.addEventListener('change', function () {
          const v = parseInt(this.value, 10)
          if (!isNaN(v) && v >= 0) updateLayer('layerOrder', v)
        })
    }

    const shortcutInput = document.getElementById('overlayer-shortcut')
    if (shortcutInput) {
      let isCapturing = false
      shortcutInput.addEventListener('click', function (e) {
        e.stopPropagation()
        if (isCapturing) return
        isCapturing = true
        this.textContent = '按下组合键...'
        this.style.borderColor = '#89b4fa'
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
          } else return
          const combo = parts.join('+')
          if (combo) {
            shortcutInput.textContent = combo
            globalSettings.shortcut = combo
            saveGlobalSettings(globalSettings)
            isCapturing = false
            shortcutInput.style.borderColor = ''
            document.removeEventListener('keydown', onKeyDown)
          }
        }
        document.addEventListener('keydown', onKeyDown)
        const onBlur = () => {
          if (isCapturing) {
            isCapturing = false
            shortcutInput.textContent = globalSettings.shortcut
            shortcutInput.style.borderColor = ''
            document.removeEventListener('keydown', onKeyDown)
            shortcutInput.removeEventListener('blur', onBlur)
          }
        }
        shortcutInput.addEventListener('blur', onBlur)
      })
    }
  }

  function toggleSettings() {
    if (overlay.style.display === 'flex') {
      overlay.style.display = 'none'
    } else {
      renderSettingsPanel()
      overlay.style.display = 'flex'
    }
  }

  // ==================== 全局快捷键 ====================
  const handleGlobalShortcut = function (e) {
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (e.target.closest('#overlayer-settings-panel')) return

    const shortcut = globalSettings.shortcut
    const parts = shortcut.split('+')
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

  // ==================== 窗口缩放响应 ====================
  const handleResize = function () {
    if (isDocked) {
      dockToEdge(globalSettings.buttonEdge, globalSettings.buttonOffset)
    } else {
      expandButton()
    }
  }
  window.addEventListener('resize', handleResize)

  // ==================== 清理函数 ====================
  function cleanup() {
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('keydown', handleGlobalShortcut)

    if (dockTimeout) {
      clearTimeout(dockTimeout)
      dockTimeout = null
    }

    instances.forEach((inst) => {
      if (inst.container && inst.container.parentNode) {
        inst.container.parentNode.removeChild(inst.container)
      }
    })
    instances.clear()

    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay)
    if (toggleBtn && toggleBtn.parentNode) toggleBtn.parentNode.removeChild(toggleBtn)
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl)

    window.__overlayer_installed = false
  }
  window.addEventListener('beforeunload', cleanup)
  window.addEventListener('pagehide', cleanup)

  // ==================== 启动 ====================
  function init() {
    initAllLayers()
    createToggleButton()
    createSettingsPanel()
    isDocked = true
    isExpanded = false
    dockToEdge(globalSettings.buttonEdge, globalSettings.buttonOffset)
  }

  init()
  console.log('Overlayer v1.0.1（特别版）已加载，图层数量:', layers.length)
})()
