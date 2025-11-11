package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;
import java.util.ArrayList;
import java.util.List;

public class ShortcutHelper {
    
    public static void updateShortcuts(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            List<ShortcutInfoCompat> shortcuts = new ArrayList<>();
            
            // Create a sharing shortcut for quick access
            Intent intent = new Intent(context, ShareActivity.class);
            intent.setAction(Intent.ACTION_SEND);
            intent.setType("text/plain");
            
            ShortcutInfoCompat shortcut = new ShortcutInfoCompat.Builder(context, "quick_save")
                    .setShortLabel("Quick Save")
                    .setLongLabel("Save Video to Vaultly")
                    .setIcon(IconCompat.createWithResource(context, R.mipmap.ic_launcher))
                    .setIntent(intent)
                    .setRank(0)
                    .build();
            
            shortcuts.add(shortcut);
            
            // Push dynamic shortcuts
            ShortcutManagerCompat.addDynamicShortcuts(context, shortcuts);
            
            // Also set as sharing shortcuts for Direct Share
            ShortcutManagerCompat.pushDynamicShortcut(context, shortcut);
        }
    }
}
