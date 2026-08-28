;(function () {
  'use strict'

  const LOGIN_URL = 'http://127.0.0.1:1145/login'
  const ROOT_URL = 'http://127.0.0.1:1145/'
  const PASSWORD = '114514191981000'

  if (window.location.href !== LOGIN_URL) {
    return
  }

  if (sessionStorage.getItem('autoLoginDone') === 'true') {
    console.log('本次会话已自动登录，跳过')
    return
  }

  fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `base=.&href=${encodeURIComponent(LOGIN_URL)}&password=${PASSWORD}`,
    credentials: 'same-origin',
  })
    .then((response) => {
      if (response.ok) {
        console.log('登录成功，跳转到根路径')
        sessionStorage.setItem('autoLoginDone', 'true')
        setTimeout(() => {
          window.location.href = ROOT_URL
        }, 200)
      } else {
        console.error('登录失败，状态码:', response.status)
        sessionStorage.removeItem('autoLoginDone')
      }
    })
    .catch((err) => {
      console.error('请求异常:', err)
      sessionStorage.removeItem('autoLoginDone')
    })
})()
