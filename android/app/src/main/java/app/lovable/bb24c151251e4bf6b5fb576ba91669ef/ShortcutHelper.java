package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;
import java.util.HashSet;
import java.util.Set;

public class ShortcutHelper {
    
    public static void updateShortcuts(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            // Create intent for the main activity
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setClass(context, MainActivity.class);
            
            // Create categories set for sharing shortcut
            Set<String> categories = new HashSet<>();
            categories.add("android.shortcut.conversation");
            
            // Build the sharing shortcut
            ShortcutInfoCompat shortcut = new ShortcutInfoCompat.Builder(context, "quick_save")
                    .setShortLabel("Vaultly")
                    .setLongLabel("Save to Vaultly")
                    .setIcon(IconCompat.createWithResource(context, R.mipmap.ic_launcher))
                    .setIntent(intent)
                    .setCategories(categories)
                    .setLongLived(true)
                    .setRank(0)
                    .build();
            
            // Push as a sharing shortcut for Direct Share
            ShortcutManagerCompat.pushDynamicShortcut(context, shortcut);
        }
    }
}
