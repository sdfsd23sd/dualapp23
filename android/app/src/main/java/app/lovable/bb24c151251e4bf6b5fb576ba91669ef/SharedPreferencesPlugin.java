package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SharedPreferences")
public class SharedPreferencesPlugin extends Plugin {
    
    private static final String PREFS_NAME = "VaultlyPrefs";
    
    @PluginMethod
    public void getString(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }
        
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String value = prefs.getString(key, null);
        
        call.resolve(new com.getcapacitor.JSObject().put("value", value));
    }
    
    @PluginMethod
    public void setString(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        
        if (key == null || value == null) {
            call.reject("Key and value are required");
            return;
        }
        
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(key, value).apply();
        
        call.resolve();
    }
    
    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }
        
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(key).apply();
        
        call.resolve();
    }
}
