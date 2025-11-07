package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;

public class FloatingBubbleManager {
    private static final String TAG = "FloatingBubbleManager";
    private Context context;
    private WindowManager windowManager;
    private View bubbleView;
    private String currentUrl;
    private boolean isDragging = false;
    private int initialX, initialY;
    private float initialTouchX, initialTouchY;
    private int screenHeight;

    public FloatingBubbleManager(Context context) {
        this.context = context;
        this.windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        
        DisplayMetrics displayMetrics = new DisplayMetrics();
        windowManager.getDefaultDisplay().getMetrics(displayMetrics);
        screenHeight = displayMetrics.heightPixels;
        
        Log.d(TAG, "FloatingBubbleManager initialized, screen height: " + screenHeight);
    }

    public void showBubble(String url) {
        try {
            if (!Settings.canDrawOverlays(context)) {
                Log.e(TAG, "Cannot show bubble: overlay permission not granted");
                return;
            }

            if (bubbleView != null) {
                Log.d(TAG, "Bubble already showing, updating URL");
                currentUrl = url;
                return;
            }

            currentUrl = url;
            Log.d(TAG, "Showing bubble for URL: " + url);

            LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            bubbleView = inflater.inflate(R.layout.floating_bubble, null);

            int layoutFlag;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
            }

            final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.START;
            params.x = 0;
            params.y = 200;

            bubbleView.setOnTouchListener(new View.OnTouchListener() {
                private long clickStartTime;
                private static final long MAX_CLICK_DURATION = 200;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            clickStartTime = System.currentTimeMillis();
                            isDragging = false;
                            initialX = params.x;
                            initialY = params.y;
                            initialTouchX = event.getRawX();
                            initialTouchY = event.getRawY();
                            return true;

                        case MotionEvent.ACTION_MOVE:
                            float deltaX = event.getRawX() - initialTouchX;
                            float deltaY = event.getRawY() - initialTouchY;
                            
                            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                                isDragging = true;
                            }

                            params.x = initialX + (int) deltaX;
                            params.y = initialY + (int) deltaY;
                            windowManager.updateViewLayout(bubbleView, params);
                            return true;

                        case MotionEvent.ACTION_UP:
                            long clickDuration = System.currentTimeMillis() - clickStartTime;
                            
                            // Check if dragged to bottom (dismiss zone)
                            if (params.y > screenHeight - 300) {
                                Log.d(TAG, "Bubble dragged to bottom, hiding");
                                hideBubble();
                                return true;
                            }

                            // If not dragging and was a quick tap, open the app
                            if (!isDragging && clickDuration < MAX_CLICK_DURATION) {
                                Log.d(TAG, "Bubble clicked, opening app");
                                openAppWithUrl();
                            }
                            
                            isDragging = false;
                            return true;
                    }
                    return false;
                }
            });

            windowManager.addView(bubbleView, params);
            Log.d(TAG, "Bubble view added successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error showing bubble", e);
        }
    }

    public void hideBubble() {
        try {
            if (bubbleView != null && windowManager != null) {
                Log.d(TAG, "Hiding bubble");
                windowManager.removeView(bubbleView);
                bubbleView = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error hiding bubble", e);
            bubbleView = null;
        }
    }

    public boolean isBubbleVisible() {
        return bubbleView != null;
    }

    private void openAppWithUrl() {
        try {
            // Store URL in SharedPreferences as backup
            android.content.SharedPreferences prefs = context.getSharedPreferences("VaultlyPrefs", android.content.Context.MODE_PRIVATE);
            prefs.edit().putString("pendingUrl", currentUrl).apply();
            
            Log.d(TAG, "Opening app with URL: " + currentUrl);
            
            // Try to notify plugin if available
            ClipboardMonitorPlugin plugin = ClipboardMonitorPlugin.getInstance();
            if (plugin != null) {
                Log.d(TAG, "Plugin available, notifying");
                plugin.notifySaveClicked(currentUrl);
            } else {
                Log.d(TAG, "Plugin not available, URL stored in SharedPreferences");
            }
            
            // Open MainActivity with intent
            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("clipboardUrl", currentUrl);
            intent.putExtra("autoOpenSave", true);
            context.startActivity(intent);
            
            hideBubble();
        } catch (Exception e) {
            Log.e(TAG, "Error opening app with URL", e);
        }
    }
}
