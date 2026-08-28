package com.skrepy.vscode.network;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class ClipboardBridge {
    private final WebView webView;
    private final ClipboardManager clipboardManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public ClipboardBridge(WebView webView) {
        this.webView = webView;
        this.clipboardManager = (ClipboardManager) webView.getContext().getSystemService(Context.CLIPBOARD_SERVICE);
    }

    @JavascriptInterface
    public void readText(final String callbackId) {
        mainHandler.post(() -> {
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

    private String escapeJsString(String s) {
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
    }
}
