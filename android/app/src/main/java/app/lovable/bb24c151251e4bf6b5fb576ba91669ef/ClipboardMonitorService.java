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
import androidx.core.app.NotificationCompat;

public class ClipboardMonitorService extends Service {
    private static final String CHANNEL_ID = "ClipboardMonitorChannel";
    private static final int NOTIFICATION_ID = 1;
    private ClipboardManager clipboardManager;
    private OverlayWindowManager overlayManager;
    private String lastClipboardText = "";
    
    private final String[] SUPPORTED_DOMAINS = {
        "youtube.com", "youtu.be", "tiktok.com", 
        "instagram.com/reel", "instagram.com/p",
        "facebook.com", "fb.watch"
    };

    @Override
    public void onCreate() {
        super.onCreate();
        clipboardManager = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        overlayManager = new OverlayWindowManager(this);
        
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification());
        
        clipboardManager.addPrimaryClipChangedListener(clipListener);
    }

    private final ClipboardManager.OnPrimaryClipChangedListener clipListener = 
        new ClipboardManager.OnPrimaryClipChangedListener() {
            @Override
            public void onPrimaryClipChanged() {
                ClipData clipData = clipboardManager.getPrimaryClip();
                if (clipData != null && clipData.getItemCount() > 0) {
                    CharSequence text = clipData.getItemAt(0).getText();
                    if (text != null) {
                        String clipText = text.toString();
                        if (!clipText.equals(lastClipboardText) && isSupportedVideoUrl(clipText)) {
                            lastClipboardText = clipText;
                            overlayManager.showOverlay(clipText);
                        }
                    }
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
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultly")
            .setContentText("Monitoring clipboard for video links")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setContentIntent(pendingIntent)
            .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (clipboardManager != null) {
            clipboardManager.removePrimaryClipChangedListener(clipListener);
        }
        if (overlayManager != null) {
            overlayManager.hideOverlay();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
