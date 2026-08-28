;(function () {
  if (!window.__gmCallbacks) {
    window.__gmCallbacks = {}
  }

  function generateId() {
    return 'gm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  window.GM_xmlhttpRequest = function (details) {
    var url = details.url
    var method = details.method || 'GET'
    var data = details.data || details.body || null
    var responseType = details.responseType || 'text'
    var callbackId = generateId()

    window.__gmCallbacks[callbackId] = function (success, statusCode, textResult, base64Result) {
      var response = {
        status: statusCode,
        finalUrl: url,
        readyState: 4,
        statusText: success ? 'OK' : 'Error',
      }

      // 根据 responseType 构造响应
      if (responseType === 'arraybuffer' || responseType === 'blob') {
        if (success && base64Result) {
          // 将 Base64 解码为 ArrayBuffer
          var binaryString = atob(base64Result)
          var len = binaryString.length
          var bytes = new Uint8Array(len)
          for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          var arrayBuffer = bytes.buffer
          if (responseType === 'arraybuffer') {
            response.response = arrayBuffer
          } else {
            response.response = new Blob([arrayBuffer])
          }
        } else {
          response.response = null
        }
      } else {
        response.responseText = textResult || ''
      }

      if (success) {
        if (details.onload) details.onload(response)
        if (details.onreadystatechange) details.onreadystatechange(response)
      } else {
        if (details.onerror) details.onerror(response)
        if (details.onreadystatechange) details.onreadystatechange(response)
      }
      delete window.__gmCallbacks[callbackId]
    }

    // 调用 Java 桥接，传递 responseType
    if (window.GM && window.GM.httpRequest) {
      window.GM.httpRequest(url, method, data, callbackId, responseType)
    } else {
      console.error('GM 桥接未初始化')
      window.__gmCallbacks[callbackId](false, 0, 'GM bridge not available', null)
    }
  }
})()
