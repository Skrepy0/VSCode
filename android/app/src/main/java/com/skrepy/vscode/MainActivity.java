package com.skrepy.vscode;

import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

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

        // 配置 WebView 以允许跨域 iframe
        configureWebView();
    }

    private void configureWebView() {
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // 允许混合内容（HTTP iframe 在 HTTPS 页面中）
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            // 启用 JavaScript
            settings.setJavaScriptEnabled(true);
            // 启用 DOM storage
            settings.setDomStorageEnabled(true);
            // 允许文件访问
            settings.setAllowFileAccess(true);
            // 允许内容访问
            settings.setAllowContentAccess(true);
            // 允许跨域访问（Android 5.0+）
            settings.setAllowUniversalAccessFromFileURLs(true);
            settings.setAllowFileAccessFromFileURLs(true);
            // 启用数据库
            settings.setDatabaseEnabled(true);
            System.out.println("WebView 配置完成");
        }
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
                // 单次返回：不做任何功能
                lastBackPressTime = currentTime;
                return true;
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
}
