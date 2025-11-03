package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class OverlayWindowManager {
    private static final String TAG = "OverlayWindowManager";
    private Context context;
    private WindowManager windowManager;
    private View overlayView;
    private String currentUrl;

    public OverlayWindowManager(Context context) {
        this.context = context;
        this.windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        Log.d(TAG, "OverlayWindowManager initialized");
    }

    public void showOverlay(String url) {
        try {
            if (!Settings.canDrawOverlays(context)) {
                Log.e(TAG, "Cannot show overlay: permission not granted");
                return;
            }

            if (overlayView != null) {
                Log.d(TAG, "Hiding existing overlay before showing new one");
                hideOverlay();
            }

            currentUrl = url;
            Log.d(TAG, "Showing overlay for URL: " + url);

            LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            overlayView = inflater.inflate(R.layout.overlay_save_dialog, null);

            TextView urlText = overlayView.findViewById(R.id.urlText);
            Button saveButton = overlayView.findViewById(R.id.saveButton);
            Button dismissButton = overlayView.findViewById(R.id.dismissButton);

            urlText.setText(truncateUrl(url));

            saveButton.setOnClickListener(v -> {
                try {
                    Log.d(TAG, "Save button clicked");
                    
                    // Get the plugin instance and notify
                    ClipboardMonitorPlugin plugin = ClipboardMonitorPlugin.getInstance();
                    if (plugin != null) {
                        Log.d(TAG, "Notifying plugin of save click");
                        plugin.notifySaveClicked(currentUrl);
                    } else {
                        Log.e(TAG, "Plugin instance is null, cannot notify");
                    }
                    
                    // Also try to open the app
                    Intent intent = new Intent(context, MainActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    intent.putExtra("clipboardUrl", currentUrl);
                    intent.putExtra("autoOpenSave", true);
                    context.startActivity(intent);
                    
                    hideOverlay();
                } catch (Exception e) {
                    Log.e(TAG, "Error handling save button click", e);
                    hideOverlay();
                }
            });

            dismissButton.setOnClickListener(v -> {
                Log.d(TAG, "Dismiss button clicked");
                hideOverlay();
            });

            int layoutFlag;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
            }

            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
            params.y = 100;

            windowManager.addView(overlayView, params);
            Log.d(TAG, "Overlay view added to window manager successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error showing overlay", e);
        }
    }

    public void hideOverlay() {
        try {
            if (overlayView != null && windowManager != null) {
                Log.d(TAG, "Hiding overlay");
                windowManager.removeView(overlayView);
                overlayView = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error hiding overlay", e);
            overlayView = null;
        }
    }

    private String truncateUrl(String url) {
        if (url.length() > 50) {
            return url.substring(0, 47) + "...";
        }
        return url;
    }
}
