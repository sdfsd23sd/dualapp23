package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class OverlayWindowManager {
    private Context context;
    private WindowManager windowManager;
    private View overlayView;
    private String currentUrl;

    public OverlayWindowManager(Context context) {
        this.context = context;
        this.windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
    }

    public void showOverlay(String url) {
        if (!Settings.canDrawOverlays(context)) {
            return;
        }

        if (overlayView != null) {
            hideOverlay();
        }

        currentUrl = url;

        LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        overlayView = inflater.inflate(R.layout.overlay_save_dialog, null);

        TextView urlText = overlayView.findViewById(R.id.urlText);
        Button saveButton = overlayView.findViewById(R.id.saveButton);
        Button dismissButton = overlayView.findViewById(R.id.dismissButton);

        urlText.setText(truncateUrl(url));

        saveButton.setOnClickListener(v -> {
            try {
                Intent intent = new Intent(context, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                intent.putExtra("clipboardUrl", currentUrl);
                intent.putExtra("autoOpenSave", true);
                context.startActivity(intent);
                hideOverlay();
            } catch (Exception e) {
                e.printStackTrace();
                hideOverlay();
            }
        });

        dismissButton.setOnClickListener(v -> hideOverlay());

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
    }

    public void hideOverlay() {
        if (overlayView != null && windowManager != null) {
            windowManager.removeView(overlayView);
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
