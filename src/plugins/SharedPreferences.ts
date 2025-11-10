import { registerPlugin } from '@capacitor/core';

export interface SharedPreferencesPlugin {
  getString(options: { key: string }): Promise<{ value: string | null }>;
  setString(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

const SharedPreferences = registerPlugin<SharedPreferencesPlugin>('SharedPreferences', {
  web: () => {
    // Web implementation using localStorage
    return {
      async getString(options: { key: string }) {
        return { value: localStorage.getItem(options.key) };
      },
      async setString(options: { key: string; value: string }) {
        localStorage.setItem(options.key, options.value);
      },
      async remove(options: { key: string }) {
        localStorage.removeItem(options.key);
      }
    };
  }
});

export default SharedPreferences;
