package com.skrepy.vscode;

import android.os.Build;
import android.os.Bundle;
import android.view.View;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

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
