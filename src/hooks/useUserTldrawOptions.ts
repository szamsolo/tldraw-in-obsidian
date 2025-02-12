import { useSyncExternalStore } from "react";
import UserSettingsManager from "src/obsidian/settings/UserSettingsManager";

export default function useUserTldrawOptions(settingsManager: UserSettingsManager) {
    const tldrawOptions = useSyncExternalStore(
        settingsManager.store.subscribe,
        settingsManager.store.get,
    );
    return tldrawOptions;
}