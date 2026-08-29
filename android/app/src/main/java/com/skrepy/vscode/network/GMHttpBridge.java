package com.skrepy.vscode.network;

import android.annotation.SuppressLint;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class GMHttpBridge {
    private static final String TAG = "GMHttpBridge";
    private final WebView webView;
    private final ExecutorService executor;

    public GMHttpBridge(WebView webView) {
        this.webView = webView;
        // 使用守护线程，不会阻止 JVM 退出
        this.executor = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "GMHttpBridge");
            t.setDaemon(true);
            return t;
        });
    }

    /**
     * 销毁桥接，关闭线程池
     */
    public void destroy() {
        executor.shutdownNow();
    }

    @JavascriptInterface
    public void httpRequest(final String url, final String method, final String body, final String callbackId, final String responseType) {
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setRequestMethod(method);
                connection.setDoOutput(body != null && !body.isEmpty());
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);

                if (body != null && !body.isEmpty()) {
                    connection.getOutputStream().write(body.getBytes(StandardCharsets.UTF_8));
                }

                int responseCode = connection.getResponseCode();
                boolean success = responseCode >= 200 && responseCode < 300;

                // 根据 responseType 决定返回格式
                if ("arraybuffer".equals(responseType)) {
                    // 读取二进制数据
                    byte[] data;
                    try (java.io.InputStream is = success ? connection.getInputStream() : connection.getErrorStream()) {
                        data = readAllBytes(is);
                    }
                    // 回调时返回 Base64 字符串，并在 JS 中解码
                    final String resultBase64 = android.util.Base64.encodeToString(data, android.util.Base64.NO_WRAP);
                    webView.post(() -> {
                        @SuppressLint("DefaultLocale") String js = String.format(
                                "if (window.__gmCallbacks && window.__gmCallbacks['%s']) { window.__gmCallbacks['%s'](%b, %d, null, '%s'); }",
                                callbackId, callbackId, success, responseCode, escapeJsString(resultBase64)
                        );
                        webView.evaluateJavascript(js, null);
                    });
                } else {
                    // 文本模式（原有逻辑）
                    String text = getString(connection, success);
                    webView.post(() -> {
                        @SuppressLint("DefaultLocale") String js = String.format(
                                "if (window.__gmCallbacks && window.__gmCallbacks['%s']) { window.__gmCallbacks['%s'](%b, %d, '%s', null); }",
                                callbackId, callbackId, success, responseCode, escapeJsString(text)
                        );
                        webView.evaluateJavascript(js, null);
                    });
                }
            } catch (Exception e) {
                Log.e(TAG, "HTTP request failed", e);
                webView.post(() -> {
                    String js = String.format(
                            "if (window.__gmCallbacks && window.__gmCallbacks['%s']) {" +
                                    "  window.__gmCallbacks['%s'](false, 0, 'Error: %s', '');" +
                                    "}",
                            callbackId, callbackId, escapeJsString(Objects.requireNonNull(e.getMessage()))
                    );
                    webView.evaluateJavascript(js, null);
                });
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    // 读取 InputStream 为 byte[]
    private byte[] readAllBytes(java.io.InputStream is) throws IOException {
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int len;
        while ((len = is.read(buffer)) != -1) {
            baos.write(buffer, 0, len);
        }
        return baos.toByteArray();
    }

    private String getString(HttpURLConnection connection, boolean success) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                success ? connection.getInputStream() : connection.getErrorStream(),
                StandardCharsets.UTF_8))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            return response.toString();
        }
    }

    private String escapeJsString(String s) {
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
    }
}
