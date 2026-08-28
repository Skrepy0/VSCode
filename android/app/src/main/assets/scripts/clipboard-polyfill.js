;(function () {
  'use strict'

  // 防止重复注入
  if (window.__clipboardPolyfillInstalled) return
  window.__clipboardPolyfillInstalled = true

  if (!window.__clipboardCallbacks) {
    window.__clipboardCallbacks = {}
  }

  function generateId() {
    return 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // 保存原始 API（如果存在）
  var originalClipboard = window.navigator.clipboard ? window.navigator.clipboard : null

  // 自定义 Clipboard 对象
  var clipboardPolyfill = {}

  clipboardPolyfill.readText = function () {
    return new Promise(function (resolve, reject) {
      var callbackId = generateId()
      window.__clipboardCallbacks[callbackId] = function (success, text) {
        delete window.__clipboardCallbacks[callbackId]
        if (success) {
          resolve(text)
        } else {
          reject(new Error('读取剪贴板失败'))
        }
      }
      if (window.ClipboardBridge && window.ClipboardBridge.readText) {
        window.ClipboardBridge.readText(callbackId)
      } else {
        delete window.__clipboardCallbacks[callbackId]
        reject(new Error('ClipboardBridge 未初始化'))
      }
    })
  }

  clipboardPolyfill.writeText = function (text) {
    return new Promise(function (resolve, reject) {
      var callbackId = generateId()
      window.__clipboardCallbacks[callbackId] = function (success, error) {
        delete window.__clipboardCallbacks[callbackId]
        if (success) {
          resolve()
        } else {
          reject(new Error(error || '写入剪贴板失败'))
        }
      }
      if (window.ClipboardBridge && window.ClipboardBridge.writeText) {
        window.ClipboardBridge.writeText(text, callbackId)
      } else {
        delete window.__clipboardCallbacks[callbackId]
        reject(new Error('ClipboardBridge 未初始化'))
      }
    })
  }

  // 尝试覆盖 navigator.clipboard
  try {
    // 如果原始 clipboard 存在，保留 read 方法（如果可用）
    if (originalClipboard && typeof originalClipboard.read === 'function') {
      clipboardPolyfill.read = originalClipboard.read.bind(originalClipboard)
    }
    if (originalClipboard && typeof originalClipboard.write === 'function') {
      clipboardPolyfill.write = originalClipboard.write.bind(originalClipboard)
    }

    Object.defineProperty(window.navigator, 'clipboard', {
      value: clipboardPolyfill,
      writable: false,
      configurable: true,
    })
    console.log('[ClipboardPolyfill] navigator.clipboard 已替换为原生桥接')
  } catch (e) {
    console.warn('[ClipboardPolyfill] 无法覆盖 navigator.clipboard:', e)
    // 降级：直接挂到 window 上
    window.clipboardPolyfill = clipboardPolyfill
  }

  // 同时拦截 execCommand('paste') 作为备选方案
  var originalExecCommand = document.execCommand
  document.execCommand = function (command) {
    if (command.toLowerCase() === 'paste') {
      console.warn(
        '[ClipboardPolyfill] execCommand("paste") 不被支持，请使用 navigator.clipboard.readText()'
      )
      return false
    }
    return originalExecCommand.apply(this, arguments)
  }
})()
