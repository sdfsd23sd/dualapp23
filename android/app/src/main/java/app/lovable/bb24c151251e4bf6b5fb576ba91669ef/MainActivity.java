package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
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
        if (intent != null && intent.hasExtra("clipboardUrl")) {
            String url = intent.getStringExtra("clipboardUrl");
            boolean autoOpen = intent.getBooleanExtra("autoOpenSave", false);
            
            if (autoOpen && url != null) {
                // Notify the plugin
                ClipboardMonitorPlugin plugin = (ClipboardMonitorPlugin) 
                    getBridge().getPlugin("ClipboardMonitor").getInstance();
                if (plugin != null) {
                    plugin.notifySaveClicked(url);
                }
            }
        }
    }
}
