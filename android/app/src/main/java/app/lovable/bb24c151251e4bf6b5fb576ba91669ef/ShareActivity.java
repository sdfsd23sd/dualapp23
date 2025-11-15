package app.lovable.bb24c151251e4bf6b5fb576ba91669ef;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.Nullable;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class ShareActivity extends Activity {
    private static final String TAG = "ShareActivity";
    private AlertDialog dialog;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent intent = getIntent();
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                handleSharedText(intent);
            }
        } else {
            finish();
        }
    }

    private void handleSharedText(Intent intent) {
        String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        
        if (sharedText != null && (sharedText.contains("instagram.com") || 
            sharedText.contains("tiktok.com") || 
            sharedText.contains("youtube.com") ||
            sharedText.contains("youtu.be") ||
            sharedText.contains("facebook.com"))) {
            
            showQuickSaveDialog(sharedText);
        } else {
            Toast.makeText(this, "Please share a valid video link", Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    private void showQuickSaveDialog(String url) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View dialogView = LayoutInflater.from(this).inflate(R.layout.quick_save_dialog, null);
        builder.setView(dialogView);
        
        TextView urlText = dialogView.findViewById(R.id.urlText);
        EditText titleInput = dialogView.findViewById(R.id.titleInput);
        Button cancelButton = dialogView.findViewById(R.id.cancelButton);
        Button saveButton = dialogView.findViewById(R.id.saveButton);
        
        urlText.setText(truncateUrl(url));
        
        cancelButton.setOnClickListener(v -> {
            if (dialog != null) dialog.dismiss();
            finish();
        });
        
        saveButton.setOnClickListener(v -> {
            String customTitle = titleInput.getText().toString().trim();
            saveVideo(url, customTitle);
        });
        
        dialog = builder.create();
        
        // Make dialog appear as overlay
        if (dialog.getWindow() != null) {
            dialog.getWindow().setType(WindowManager.LayoutParams.TYPE_APPLICATION_PANEL);
            dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
        
        dialog.setOnDismissListener(d -> finish());
        dialog.show();
    }

    private void saveVideo(String url, String customTitle) {
        new Thread(() -> {
            try {
                // Get stored auth token
                String authToken = getSharedPreferences("VaultlyPrefs", MODE_PRIVATE)
                    .getString("auth_token", null);
                
                if (authToken == null) {
                    runOnUiThread(() -> {
                        Toast.makeText(this, "Please log in to the app first", Toast.LENGTH_LONG).show();
                        if (dialog != null) dialog.dismiss();
                        finish();
                    });
                    return;
                }

                // Detect platform from URL
                String platform = detectPlatform(url);
                
                // Use custom title or generate default
                String title = customTitle.isEmpty() ? "Saved from " + platform : customTitle;

                // Call save-video edge function
                URL apiUrl = new URL(BuildConfig.SUPABASE_URL + "/functions/v1/save-video");
                HttpURLConnection conn = (HttpURLConnection) apiUrl.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
                conn.setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY);
                conn.setDoOutput(true);

                JSONObject jsonBody = new JSONObject();
                jsonBody.put("url", url);
                jsonBody.put("title", title);
                jsonBody.put("platform", platform);

                OutputStream os = conn.getOutputStream();
                os.write(jsonBody.toString().getBytes());
                os.flush();
                os.close();

                int responseCode = conn.getResponseCode();
                
                runOnUiThread(() -> {
                    if (responseCode == 200) {
                        Toast.makeText(this, "✓ Video saved successfully!", Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(this, "Failed to save video", Toast.LENGTH_SHORT).show();
                    }
                    if (dialog != null) dialog.dismiss();
                    finish();
                });

            } catch (Exception e) {
                Log.e(TAG, "Error saving video", e);
                runOnUiThread(() -> {
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    if (dialog != null) dialog.dismiss();
                    finish();
                });
            }
        }).start();
    }

    private String detectPlatform(String url) {
        if (url.contains("instagram.com")) {
            return "Instagram";
        } else if (url.contains("tiktok.com")) {
            return "TikTok";
        } else if (url.contains("youtube.com") || url.contains("youtu.be")) {
            return "YouTube";
        } else if (url.contains("facebook.com")) {
            return "Facebook";
        }
        return "Unknown";
    }

    private String truncateUrl(String url) {
        if (url.length() > 50) {
            return url.substring(0, 47) + "...";
        }
        return url;
    }
}
