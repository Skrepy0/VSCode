const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:1145'
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  // 移除 CSP 头 / Remove CSP header
  delete proxyRes.headers['content-security-policy'];
});

const server = http.createServer(function (req, res) {
  proxy.web(req, res);
});

server.listen(8080, '127.0.0.1', () => {
  // 代理运行在 / Proxy running at
  console.log('代理运行在 http://127.0.0.1:8080');
});
