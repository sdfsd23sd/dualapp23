package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ClipboardMonitor")
public class ClipboardMonitorPlugin extends Plugin {
    private static final String TAG = "ClipboardMonitorPlugin";
    private static ClipboardMonitorPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "Plugin loaded and instance set");
        
        // Check for pending URL from SharedPreferences
        checkPendingUrl();
    }

    public static ClipboardMonitorPlugin getInstance() {
        return instance;
    }
    
    private void checkPendingUrl() {
        try {
            android.content.SharedPreferences prefs = getContext().getSharedPreferences("VaultlyPrefs", android.content.Context.MODE_PRIVATE);
            String pendingUrl = prefs.getString("pendingUrl", null);
            
            if (pendingUrl != null && !pendingUrl.isEmpty()) {
                Log.d(TAG, "Found pending URL: " + pendingUrl);
                
                // Notify after a short delay to ensure listeners are set up
                getActivity().runOnUiThread(() -> {
                    android.os.Handler handler = new android.os.Handler();
                    handler.postDelayed(() -> {
                        Log.d(TAG, "Notifying pending URL");
                        notifySaveClicked(pendingUrl);
                        // Clear the pending URL
                        prefs.edit().remove("pendingUrl").apply();
                    }, 1000); // 1 second delay
                });
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking pending URL", e);
        }
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        try {
            // Check if overlay permission is granted first
            if (!Settings.canDrawOverlays(getContext())) {
                Log.e(TAG, "Overlay permission not granted");
                call.reject("Overlay permission not granted. Please enable 'Display over other apps' permission.");
                return;
            }

            Log.d(TAG, "Starting clipboard monitoring service");
            Intent serviceIntent = new Intent(getContext(), ClipboardMonitorService.class);
            serviceIntent.setAction("START_MONITORING");
            getContext().startForegroundService(serviceIntent);
        call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start monitoring service", e);
            call.reject("Failed to start monitoring: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        try {
            Log.d(TAG, "Stopping clipboard monitoring service");
            Intent serviceIntent = new Intent(getContext(), ClipboardMonitorService.class);
            getContext().stopService(serviceIntent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop monitoring service", e);
            call.reject("Failed to stop monitoring: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        try {
            boolean granted = Settings.canDrawOverlays(getContext());
            Log.d(TAG, "Overlay permission check: " + granted);
            call.resolve(new com.getcapacitor.JSObject().put("granted", granted));
        } catch (Exception e) {
            Log.e(TAG, "Failed to check overlay permission", e);
            call.reject("Failed to check permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        try {
            Log.d(TAG, "Requesting overlay permission");
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
            
            // Use context instead of activity since we're in a plugin
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            call.resolve();
            Log.d(TAG, "Permission settings opened successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to request overlay permission", e);
            call.reject("Failed to open permission settings: " + e.getMessage());
        }
    }

    public void notifyClipboardDetected(String url) {
        Log.d(TAG, "Notifying clipboard detected: " + url);
        notifyListeners("clipboardDetected", new com.getcapacitor.JSObject().put("url", url));
    }

    public void notifySaveClicked(String url) {
        Log.d(TAG, "Notifying save clicked: " + url);
        notifyListeners("saveClicked", new com.getcapacitor.JSObject().put("url", url));
    }
}
