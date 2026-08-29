package com.skrepy.vscode.network;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.lang.ref.WeakReference;

public class ClipboardBridge {
    private final WeakReference<WebView> webViewRef;
    private final ClipboardManager clipboardManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public ClipboardBridge(WebView webView) {
        this.webViewRef = new WeakReference<>(webView);
        this.clipboardManager = (ClipboardManager) webView.getContext().getSystemService(Context.CLIPBOARD_SERVICE);
    }

    private WebView getWebView() {
        return webViewRef.get();
    }

    @JavascriptInterface
    public void readText(final String callbackId) {
        mainHandler.post(() -> {
            // 检查 WebView 是否仍然可用
            WebView webView = getWebView();
            if (webView == null) return;

            String result = "";
            try {
                if (clipboardManager != null && clipboardManager.hasPrimaryClip()) {
                    ClipData clip = clipboardManager.getPrimaryClip();
                    if (clip != null && clip.getItemCount() > 0) {
                        CharSequence text = clip.getItemAt(0).getText();
                        result = text != null ? text.toString() : "";
                    }
                }
            } catch (Exception e) {
                result = "";
            }
            String js = String.format(
                    "if (window.__clipboardCallbacks && window.__clipboardCallbacks['%s']) { window.__clipboardCallbacks['%s'](true, '%s'); }",
                    callbackId, callbackId, escapeJsString(result)
            );
            webView.evaluateJavascript(js, null);
        });
    }

    @JavascriptInterface
    public void writeText(final String text, final String callbackId) {
        mainHandler.post(() -> {
            // 检查 WebView 是否仍然可用
            WebView webView = getWebView();
            if (webView == null) return;

            boolean success = false;
            try {
                ClipData clip = ClipData.newPlainText("text", text);
                clipboardManager.setPrimaryClip(clip);
                success = true;
            } catch (Exception ignored) {
            }
            String js = String.format(
                    "if (window.__clipboardCallbacks && window.__clipboardCallbacks['%s']) { window.__clipboardCallbacks['%s'](%b, ''); }",
                    callbackId, callbackId, success
            );
            webView.evaluateJavascript(js, null);
        });
    }

    /**
     * 销毁桥接，清理 Handler 中的待处理任务
     */
    public void destroy() {
        mainHandler.removeCallbacksAndMessages(null);
    }

    private String escapeJsString(String s) {
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
    }
}
