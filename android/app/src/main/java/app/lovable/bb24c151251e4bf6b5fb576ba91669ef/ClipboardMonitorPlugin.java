package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ClipboardMonitor")
public class ClipboardMonitorPlugin extends Plugin {

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), ClipboardMonitorService.class);
        serviceIntent.setAction("START_MONITORING");
        getContext().startForegroundService(serviceIntent);
        call.resolve();
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), ClipboardMonitorService.class);
        getContext().stopService(serviceIntent);
        call.resolve();
    }

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        boolean granted = Settings.canDrawOverlays(getContext());
        call.resolve(new com.getcapacitor.JSObject().put("granted", granted));
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
        getActivity().startActivityForResult(intent, 1234);
        call.resolve();
    }

    public void notifyClipboardDetected(String url) {
        notifyListeners("clipboardDetected", new com.getcapacitor.JSObject().put("url", url));
    }

    public void notifySaveClicked(String url) {
        notifyListeners("saveClicked", new com.getcapacitor.JSObject().put("url", url));
    }
}
