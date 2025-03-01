import { Setting } from "obsidian";
import { createContext } from "react";

export const SettingContext = createContext<Setting | undefined>(undefined);
export const SettingSlotContext = createContext<{
    setting: Setting,
    /**
     * The container element for the current slot.
     * 
     * This should be used by native Obsidian components when no other element is sufficient.
     */
    slotEl: HTMLElement,
} | undefined>(undefined);
