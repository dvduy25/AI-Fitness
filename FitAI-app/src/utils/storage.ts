import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * expo-secure-store wraps the OS Keychain/Keystore and only fully works on
 * iOS/Android. Its web shim is incomplete (missing deleteValueWithKeyAsync in
 * some SDK versions), so on web we transparently fall back to AsyncStorage
 * (which itself uses localStorage under the hood on web). Note this means
 * data is NOT encrypted at rest when running in a browser — acceptable for
 * local development, but native builds keep using the secure OS storage.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
