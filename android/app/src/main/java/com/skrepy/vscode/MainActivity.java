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

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    private long lastBackPressTime = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 禁用 edge-to-edge 强制（Android 15+）
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // 使用 WindowInsetsControllerCompat
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

        getBridge().getWebView().post(new Runnable() {
            @Override
            public void run() {
                WebView webView = getBridge().getWebView();
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        // 注入浮窗脚本
                        injectGifFloat(view);
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
        // 每次焦点变化时再次隐藏状态栏（应对 ColorOS 的强制恢复）
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

    private void injectGifFloat(WebView webView) {
        String jsCode = loadScriptFromAssets();
        if (jsCode != null && !jsCode.isEmpty()) {
            webView.evaluateJavascript(jsCode, null);
        }
    }

    private String loadScriptFromAssets() {
        try {
            InputStream is = getAssets().open("gif-overlay.js");
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            is.close();
            return new String(buffer, StandardCharsets.UTF_8);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
