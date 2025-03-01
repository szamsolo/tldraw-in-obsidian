import TldrawPlugin from "src/main";
import { DEFAULT_SETTINGS, FileDestinationsSettings, TldrawPluginSettings, UserTLCameraOptions } from "../TldrawSettingsTab";

type UserTldrawOptions = NonNullable<TldrawPluginSettings['tldrawOptions']>;

export default class UserSettingsManager {
    #plugin: TldrawPlugin;
    #subscribers = new Set<() => void>();
    #store = {
        subscribe: (cb: () => void) => {
            this.#subscribers.add(cb);
            return () => this.#subscribers.delete(cb);
        },
        get: (): TldrawPluginSettings => this.#plugin.settings
    };

    constructor(plugin: TldrawPlugin) {
        this.#plugin = plugin;
    }

    get settings() { return this.#plugin.settings; }
    get store() { return Object.assign({}, this.#store); }

    #notifyStoreSubscribers() {
        this.#subscribers.forEach((e) => e());
    }

    async loadSettings() {
        // We destructure the defaults for nested properties, e.g `embeds`, so that we can merge them separately since Object.assign does not merge nested properties.
        const {
            embeds: embedsDefault,
            fileDestinations: fileDestinationsDefault,
            ...restDefault
        } = DEFAULT_SETTINGS;
        const {
            embeds,
            fileDestinations,
            tldrawOptions,
            ...rest
        } = await this.#plugin.loadData() as Partial<TldrawPluginSettings> || {};

        const embedsMerged = Object.assign({}, embedsDefault, embeds)
        const fileDestinationsMerged = Object.assign({}, fileDestinationsDefault,
            (() => {
                // Do not migrate if the the old file destination settings were already migrated.
                if (fileDestinations === undefined) return {};
                // Migrate old settings
                const migrated: Partial<FileDestinationsSettings> = {};

                if (rest.folder !== undefined) {
                    migrated.defaultFolder = rest.folder;
                }

                if (rest.assetsFolder !== undefined) {
                    migrated.assetsFolder = rest.assetsFolder;
                }

                if (rest.useAttachmentsFolder !== undefined && rest.useAttachmentsFolder) {
                    migrated.destinationMethod = 'attachments-folder';
                }
            })(),
            fileDestinations,
        );
        delete rest.folder;
        delete rest.assetsFolder;
        delete rest.useAttachmentsFolder;
        const restMerged = Object.assign({}, restDefault, rest);

        this.#plugin.settings = {
            embeds: embedsMerged,
            fileDestinations: fileDestinationsMerged,
            tldrawOptions,
            ...restMerged
        };

        this.#notifyStoreSubscribers();
    }

    async updateSettings(settings: TldrawPluginSettings) {
        this.#plugin.settings = Object.assign({}, settings);
        await this.#plugin.saveSettings();
        this.#notifyStoreSubscribers();
    }

    async updateLaserDelayMs(delayMs: UserTldrawOptions['laserDelayMs']) {
        let tldrawOptions = this.#plugin.settings.tldrawOptions;
        if (delayMs === tldrawOptions?.laserDelayMs) return;
        if (delayMs === undefined) {
            delete tldrawOptions?.laserDelayMs;
        } else {
            if (!tldrawOptions) tldrawOptions = {};
            tldrawOptions.laserDelayMs = delayMs;
        }
        this.#plugin.settings.tldrawOptions = Object.assign({}, tldrawOptions);
        this.updateSettings(this.#plugin.settings);
    }

    async updateLaserKeepDelayAfterStop(keepDelay: UserTldrawOptions['laserKeepDelayAfterStop']) {
        let tldrawOptions = this.#plugin.settings.tldrawOptions;
        if (keepDelay === tldrawOptions?.laserKeepDelayAfterStop) return;
        if (keepDelay === undefined) {
            delete tldrawOptions?.laserKeepDelayAfterStop;
        } else {
            if (!tldrawOptions) tldrawOptions = {};
            tldrawOptions.laserKeepDelayAfterStop = keepDelay;
        }
        this.#plugin.settings.tldrawOptions = Object.assign({}, tldrawOptions);
        this.updateSettings(this.#plugin.settings);
    }

    async updateEditorWheelBehavior(wheelBehavior: UserTLCameraOptions['wheelBehavior']) {
        let options = this.#plugin.settings.cameraOptions;
        if (wheelBehavior === options?.wheelBehavior) return;
        if (wheelBehavior === undefined) {
            delete options?.wheelBehavior;
        } else {
            if (!options) options = {};
            options.wheelBehavior = wheelBehavior;
        }
        this.#plugin.settings.cameraOptions = Object.assign({}, options);
        this.updateSettings(this.#plugin.settings);
    }
}