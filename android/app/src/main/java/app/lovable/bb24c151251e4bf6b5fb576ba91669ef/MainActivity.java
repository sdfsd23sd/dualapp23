package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register plugin BEFORE super.onCreate() to ensure it's available when bridge initializes
        registerPlugin(ClipboardMonitorPlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        
        if (intent.hasExtra("clipboardUrl")) {
            String url = intent.getStringExtra("clipboardUrl");
            boolean autoOpen = intent.getBooleanExtra("autoOpenSave", false);
            
            if (autoOpen && url != null) {
                // Store in SharedPreferences so plugin can pick it up when ready
                android.content.SharedPreferences prefs = getSharedPreferences("VaultlyPrefs", MODE_PRIVATE);
                prefs.edit().putString("pendingUrl", url).apply();
                android.util.Log.d("MainActivity", "Stored pending URL: " + url);
                
                // Also try to notify immediately if plugin is ready
                getBridge().getWebView().post(() -> {
                    try {
                        ClipboardMonitorPlugin plugin = (ClipboardMonitorPlugin) 
                            getBridge().getPlugin("ClipboardMonitor").getInstance();
                        if (plugin != null) {
                            android.util.Log.d("MainActivity", "Plugin ready, notifying immediately");
                            plugin.notifySaveClicked(url);
                            // Clear pending URL since we notified successfully
                            prefs.edit().remove("pendingUrl").apply();
                        }
                    } catch (Exception e) {
                        android.util.Log.e("MainActivity", "Error notifying plugin", e);
                    }
                });
            }
        }
    }
}
