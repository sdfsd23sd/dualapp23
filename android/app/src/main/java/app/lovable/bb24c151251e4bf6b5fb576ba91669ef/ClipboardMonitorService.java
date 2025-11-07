package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class ClipboardMonitorService extends Service {
    private static final String TAG = "ClipboardMonitorService";
    private static final String CHANNEL_ID = "ClipboardMonitorChannel";
    private static final int NOTIFICATION_ID = 1;
    private ClipboardManager clipboardManager;
    private FloatingBubbleManager bubbleManager;
    private String lastClipboardText = "";
    
    private final String[] SUPPORTED_DOMAINS = {
        "youtube.com", "youtu.be", "tiktok.com", 
        "instagram.com/reel", "instagram.com/p",
        "facebook.com", "fb.watch"
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate");
        
        try {
            clipboardManager = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            bubbleManager = new FloatingBubbleManager(this);
            
            createNotificationChannel();
            startForeground(NOTIFICATION_ID, createNotification());
            
            clipboardManager.addPrimaryClipChangedListener(clipListener);
            Log.d(TAG, "Clipboard listener registered successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error in onCreate", e);
            stopSelf();
        }
    }

    private final ClipboardManager.OnPrimaryClipChangedListener clipListener = 
        new ClipboardManager.OnPrimaryClipChangedListener() {
            @Override
            public void onPrimaryClipChanged() {
                try {
                    // Check if we have overlay permission before proceeding
                    if (!Settings.canDrawOverlays(ClipboardMonitorService.this)) {
                        Log.w(TAG, "Overlay permission not granted, cannot show overlay");
                        return;
                    }

                    ClipData clipData = clipboardManager.getPrimaryClip();
                    if (clipData != null && clipData.getItemCount() > 0) {
                        CharSequence text = clipData.getItemAt(0).getText();
                        if (text != null) {
                            String clipText = text.toString();
                            Log.d(TAG, "Clipboard changed: " + clipText);
                            
                            if (!clipText.equals(lastClipboardText) && isSupportedVideoUrl(clipText)) {
                                lastClipboardText = clipText;
                                Log.d(TAG, "Supported video URL detected, showing bubble");
                                bubbleManager.showBubble(clipText);
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error handling clipboard change", e);
                }
            }
        };

    private boolean isSupportedVideoUrl(String text) {
        if (!text.startsWith("http://") && !text.startsWith("https://")) {
            return false;
        }
        for (String domain : SUPPORTED_DOMAINS) {
            if (text.contains(domain)) {
                return true;
            }
        }
        return false;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Clipboard Monitoring",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Vaultly is monitoring for video links");
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, ClipboardMonitorService.class);
        notificationIntent.putExtra("showBubble", true);
        PendingIntent pendingIntent = PendingIntent.getService(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultly Active")
            .setContentText("Tap to restore bubble - Copy video links to save")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand called");
        
        // Check permission again on start
        if (!Settings.canDrawOverlays(this)) {
            Log.e(TAG, "Overlay permission not granted on service start");
            stopSelf();
            return START_NOT_STICKY;
        }
        
        // Handle notification tap to restore bubble
        if (intent != null && intent.hasExtra("showBubble") && intent.getBooleanExtra("showBubble", false)) {
            Log.d(TAG, "Restoring bubble from notification tap");
            restoreBubbleIfUrlExists();
        }
        
        return START_STICKY;
    }
    
    private void restoreBubbleIfUrlExists() {
        try {
            ClipData clipData = clipboardManager.getPrimaryClip();
            if (clipData != null && clipData.getItemCount() > 0) {
                CharSequence text = clipData.getItemAt(0).getText();
                if (text != null) {
                    String clipText = text.toString();
                    if (isSupportedVideoUrl(clipText) && !bubbleManager.isBubbleVisible()) {
                        Log.d(TAG, "Restoring bubble with existing URL: " + clipText);
                        lastClipboardText = clipText;
                        bubbleManager.showBubble(clipText);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error restoring bubble", e);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (clipboardManager != null) {
            clipboardManager.removePrimaryClipChangedListener(clipListener);
        }
        if (bubbleManager != null) {
            bubbleManager.hideBubble();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
