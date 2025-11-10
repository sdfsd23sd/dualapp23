package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(SharedPreferencesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
