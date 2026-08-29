package com.skrepy.vscode;

import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.skrepy.vscode.network.ClipboardBridge;
import com.skrepy.vscode.network.GMHttpBridge;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    private long lastBackPressTime = 0;
    private GMHttpBridge gmHttpBridge;
    private ClipboardBridge clipboardBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 禁用 edge-to-edge 强制（Android 15+）
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // 隐藏状态栏
        WindowInsetsControllerCompat controller = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            View decorView = getWindow().getDecorView();
            controller = WindowCompat.getInsetsController(getWindow(), decorView);
        }
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.statusBars());
            controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
        WebView webView = getBridge().getWebView();
        gmHttpBridge = new GMHttpBridge(webView);
        clipboardBridge = new ClipboardBridge(webView);
        webView.addJavascriptInterface(gmHttpBridge, "GM");
        webView.addJavascriptInterface(clipboardBridge, "ClipboardBridge");
        webView.post(new Runnable() {
            @Override
            public void run() {
                WebView webView = getBridge().getWebView();
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        injectAllScripts(view);
                    }
                });
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == 4) {
            long currentTime = System.currentTimeMillis();
            if (currentTime - lastBackPressTime < 800) {
                // 快速返回两次：最小化应用
                moveTaskToBack(true);
                return true;
            } else {
                lastBackPressTime = currentTime;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            WindowInsetsControllerCompat controller = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                View decorView = getWindow().getDecorView();
                controller = WindowCompat.getInsetsController(getWindow(), decorView);
            }
            if (controller != null) {
                controller.hide(WindowInsetsCompat.Type.statusBars());
            }
        }
    }

    @Override
    public void onDestroy() {
        // 清理 JavaScript 接口，防止内存泄露
        WebView webView = getBridge().getWebView();
        webView.removeJavascriptInterface("GM");
        webView.removeJavascriptInterface("ClipboardBridge");

        // 销毁桥接实例，释放资源
        if (gmHttpBridge != null) {
            gmHttpBridge.destroy();
            gmHttpBridge = null;
        }
        if (clipboardBridge != null) {
            clipboardBridge.destroy();
            clipboardBridge = null;
        }

        super.onDestroy();
    }

    /**
     * 注入 assets/scripts/ 目录下的所有 .js 文件
     */
    private void injectAllScripts(WebView webView) {
        try {
            String[] files = getAssets().list("scripts");
            if (files == null) return;
            String polyfill = loadScriptFromAssets("scripts/libs/gm-polyfill.js");
            if (polyfill != null && !polyfill.isEmpty()) {
                webView.evaluateJavascript(polyfill, null);
            }
            for (String fileName : files) {
                if (fileName.endsWith(".js") && !fileName.equals("gm-polyfill.js")) {
                    String jsCode = loadScriptFromAssets("scripts/" + fileName);
                    if (jsCode != null && !jsCode.isEmpty()) {
                        webView.evaluateJavascript(jsCode, null);
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * 从 assets 加载指定路径的脚本内容
     */
    private String loadScriptFromAssets(String path) {
        try (InputStream is = getAssets().open(path)) {
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            return new String(buffer, StandardCharsets.UTF_8);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}