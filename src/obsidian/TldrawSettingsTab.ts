import TldrawPlugin from "../main";
import {
	App,
	PluginSettingTab,
} from "obsidian";
import { FontOverrides, IconOverrides } from "src/types/tldraw";
import { TLCameraOptions, TldrawOptions } from "tldraw";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import TldrawSettingsTabView from "src/components/settings/TldrawSettingsTabView";
import { destinationMethods, themePreferenceRecord } from "./settings/constants";

export type ThemePreference = keyof typeof themePreferenceRecord;

export type DestinationMethod = typeof destinationMethods[number];

export type FileDestinationsSettings = {
	/**
	 * The location where tldraw assets will be downloaded in
	 */
	assetsFolder: string;
	/**
	 * Whether to show an input to confirm the path of the new file.
	 * 
	 * By default, the input will be filled in with the path defined by {@linkcode FileDestinationsSettings.destinationMethod}
	 * 
	 * The modal will also show the following options:
	 * 
	 * - Colocate file, if there is an active file view
	 * - Default attachment folder as defined in the Obsidian settings
	 * - {@linkcode FileDestinationsSettings.defaultFolder}
	 */
	confirmDestination: boolean;
	/**
	 * The default folder to save new tldraw files in.
	 */
	defaultFolder: string,
	/**
	 * 
	 * # `colocate`
	 * If this is true then create new tldraw files in the same folder as the active note or file view.
	 * 
	 * If there is no active note or file view, then root directory is used.
	 * 
	 * # `attachments-folder`
	 * Use the attachments folder defined in the Obsidian "Files and links" settings. 
	 * 
	 */
	destinationMethod: DestinationMethod,
	/**
	 * When the colocate destination method is used, this folder will be used as its subfolder.
	 */
	colocationSubfolder: string,
};

/**
 * These are old settings, the properties have been marked as deprecated to assist the programmer migrate these settings.
 */
type DeprecatedFileDestinationSettings = {
	/**
	 * @deprecated Migrate to {@linkcode TldrawPluginSettings.fileDestinations}
	 * The location where tldraw assets will be downloaded in
	 */
	assetsFolder?: string;
	/**
	 * @deprecated Migrate to {@linkcode TldrawPluginSettings.fileDestinations}
	 */
	folder?: string;
	/**
	 * @deprecated Migrate to {@linkcode TldrawPluginSettings.fileDestinations}
	 * Use the attachments folder defined in the Obsidian "Files and links" settings. 
	 */
	useAttachmentsFolder?: boolean;
};

type RemoveReadonly<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Camera options that users can choose
 */
export type UserTLCameraOptions = Pick<Partial<TLCameraOptions>, 'panSpeed' | 'zoomSpeed' | 'zoomSteps' | 'wheelBehavior'>;

export interface TldrawPluginSettings extends DeprecatedFileDestinationSettings {
	fileDestinations: FileDestinationsSettings;
	saveFileDelay: number; // in seconds
	newFilePrefix: string;
	newFileTimeFormat: string;
	toolSelected: string;
	themeMode: ThemePreference;
	gridMode: boolean;
	snapMode: boolean;
	debugMode: boolean;
	focusMode: boolean;
	fonts?: {
		overrides?: FontOverrides
	},
	icons?: {
		overrides?: IconOverrides
	}
	embeds: {
		padding: number;
		/**
		 * Default value to control whether to show the background for markdown embeds
		 */
		showBg: boolean
		/**
		 * Default value to control whether to show the background dotted pattern for markdown embeds
		 */
		showBgDots: boolean;
	};
	/**
	 * Options that apply to the editor
	 */
	tldrawOptions?: Pick<Partial<RemoveReadonly<TldrawOptions>>, 'laserDelayMs'> & {
		/**
		 * When the laser tool is stopped, whether to keep the delay defined by `laserDelayMs`
		 */
		laserKeepDelayAfterStop?: boolean,
	}
	/**
	 * Options that apply to the editor camera
	 */
	cameraOptions?: UserTLCameraOptions,
}

export const DEFAULT_SETTINGS = {
	saveFileDelay: 0.5,
	newFilePrefix: "Tldraw ",
	newFileTimeFormat: "YYYY-MM-DD h.mmA",
	toolSelected: "select",
	themeMode: "light",
	gridMode: false,
	snapMode: false,
	debugMode: false,
	focusMode: false,
	fileDestinations: {
		confirmDestination: true,
		assetsFolder: "tldraw/assets",
		destinationMethod: "colocate",
		defaultFolder: "tldraw",
		colocationSubfolder: "",
	},
	embeds: {
		padding: 0,
		showBg: true,
		showBgDots: true,
	},
} as const satisfies Partial<TldrawPluginSettings>;

export class TldrawSettingsTab extends PluginSettingTab {
	plugin: TldrawPlugin;
	#root?: Root;

	constructor(app: App, plugin: TldrawPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		this.#root?.unmount();
		const root = this.#root = createRoot(containerEl);
		root.render(createElement(TldrawSettingsTabView, {
			settingsManager: this.plugin.settingsManager,
		}));
	}

	hide() {
		super.hide();
		this.#root?.unmount();
	}
}
