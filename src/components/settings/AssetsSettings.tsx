import React, { ComponentProps, memo, useCallback, useMemo, useSyncExternalStore } from "react";
import Setting from "./Setting";
import useSettingsManager from "src/hooks/useSettingsManager";
import useUserPluginSettings from "src/hooks/useUserPluginSettings";
import DownloadManagerModal from "src/obsidian/modal/DownloadManagerModal";
import IconsSettingsManager from "src/obsidian/settings/IconsSettingsManager";
import FontsSettingsManager from "src/obsidian/settings/FontsSettingsManager";
import { FontTypes, IconNames } from "src/types/tldraw";
import { DownloadInfo } from "src/utils/fetch/download";
import { defaultFonts, fontExtensions, iconExtensions, iconTypes } from "src/obsidian/settings/constants";
import { FileSearchModal } from "src/obsidian/modal/FileSearchModal";
import { Notice, TFile, TFolder } from "obsidian";
import { TLDRAW_VERSION } from "src/utils/constants";

function AssetsSettingsGroup({
    downloadAll,
}: {
    downloadAll: () => void,
}) {
    const settingsManager = useSettingsManager();
    const settings = useUserPluginSettings(settingsManager);
    return (
        <>
            <Setting
                slots={{
                    name: 'Offline assets',
                    desc: (
                        <>
                            {'Download all assets for offline use'}
                            <code className="ptl-default-code">
                                {`Vault folder: ${settings.fileDestinations.assetsFolder}`}
                            </code>
                        </>
                    ),
                    control: (
                        <>
                            <Setting.Button onClick={downloadAll}>
                                Download all
                            </Setting.Button>
                        </>
                    )
                }}
            />
        </>
    );
}

function FontAssetsSettingsGroup({
    downloadAll,
}: {
    downloadAll: () => void,
}) {
    const settingsManager = useSettingsManager();
    const settings = useUserPluginSettings(settingsManager);
    return (
        <>
            <Setting
                slots={{
                    name: 'Offline fonts',
                    desc: (
                        <>
                            {'Download all fonts for offline use'}
                            <code className="ptl-default-code">
                                {`Vault folder: ${settings.fileDestinations.assetsFolder}/fonts`}
                            </code>
                        </>
                    ),
                    control: (
                        <>
                            <Setting.Button onClick={downloadAll}>
                                Download all
                            </Setting.Button>
                        </>
                    )
                }}
            />
        </>
    );
}

function IconAssetsSettingsGroup({
    downloadAll,
    manager,
}: {
    downloadAll: () => void,
    manager: IconsSettingsManager,
}) {
    return (
        <>
            <Setting
                slots={{
                    name: 'Offline icons',
                    desc: (
                        <>
                            {'Download all icons for offline use'}
                            <code className="ptl-default-code">
                                {`Vault folder: ${manager.plugin.settings.fileDestinations.assetsFolder}/icons`}
                            </code>
                        </>
                    ),
                    control: (
                        <>
                            <Setting.Button onClick={downloadAll}>
                                Download all
                            </Setting.Button>
                        </>
                    )
                }}
            />
        </>
    );
}

const MemoAssetsSettingsGroup = memo(({ downloadAll }: Pick<ComponentProps<typeof AssetsSettingsGroup>, 'downloadAll'>) => (
    <Setting.Container>
        <AssetsSettingsGroup downloadAll={downloadAll} />
    </Setting.Container>
));

function FontOverrideSetting({
    downloadFont,
    manager,
    setting: {
        font,
        name,
        appearsAs,
    }
}: {
    downloadFont: (font: FontTypes, config: DownloadInfo) => void,
    manager: FontsSettingsManager,
    setting: {
        name: string,
        font: keyof typeof defaultFonts,
        appearsAs: string,
    }
}) {
    const store = useMemo(() => (
        {
            getCurrent: () => manager.overrides[font],
            subscribe: (cb: () => void) => manager.onChanged(font, cb),
        }
    ), [manager, font]);

    const current = useSyncExternalStore(store.subscribe, store.getCurrent);

    const onFileSearchClick = useCallback(() => {
        new FileSearchModal(manager.plugin, {
            extensions: [...fontExtensions],
            initialSearchPath: store.getCurrent(),
            onEmptyStateText: (searchPath) => (
                `No folders or fonts at "${searchPath}".`
            ),
            setSelection: (file) => {
                if (!(file instanceof TFile)) {
                    const path = typeof file === 'string' ? file : file.path;
                    new Notice(`"${path}" is not a valid file.`);
                    return;
                }
                manager.setFontPath(font, file.path);
            },
        }).open()
    }, [manager, store]);

    const resetFont = useCallback(() => (
        manager.setFontPath(font, null)
    ), [font, manager]);

    const fontConfig = useMemo(() => (
        manager.getDownloadConfig(font)
    ), [manager, font]);

    const download = useCallback(() => (
        downloadFont(font, fontConfig)
    ), [font, fontConfig, downloadFont]);

    return (
        <>
            <Setting
                slots={{
                    name,
                    desc: `Appears as "${appearsAs}" in the style panel.`,
                    control: (
                        <>
                            <Setting.Text
                                value={current ?? ''}
                                placeholder="[ DEFAULT ]"
                                readonly={true}
                            />
                            <Setting.Button
                                icon={'file-search'}
                                onClick={onFileSearchClick}
                            />
                            <Setting.ExtraButton
                                icon={'download'}
                                tooltip={`Download from ${fontConfig.url}`}
                                onClick={download}
                            />
                            <Setting.ExtraButton
                                icon={'rotate-ccw'}
                                tooltip={'Use default'}
                                disabled={!current}
                                onClick={resetFont}
                            />
                        </>
                    )
                }}
            />
        </>
    );
}

const fontOverrideSettingProps = [
    {
        name: 'Draw (handwriting) font',
        font: 'draw',
        appearsAs: 'draw',
    },
    {
        name: 'Sans-serif font',
        font: 'sansSerif',
        appearsAs: 'sans',
    },
    {
        name: 'Serif font',
        font: 'serif',
        appearsAs: 'serif',
    },
    {
        name: 'Monospace font',
        font: 'monospace',
        appearsAs: 'mono',
    }
] satisfies ComponentProps<typeof FontOverrideSetting>['setting'][]

const MemoFontAssetsSettingsGroup = memo(({
    downloadAll,
    downloadFont,
    manager,
}: {
    downloadAll: () => void,
    downloadFont: (font: FontTypes, config: DownloadInfo) => void,
    manager: FontsSettingsManager,
}) => (
    <>
        <Setting.Container>
            <FontAssetsSettingsGroup downloadAll={downloadAll} />
        </Setting.Container>
        <h2>Font assets overrides</h2>
        <Setting.Container>
            {fontOverrideSettingProps.map((props) => <FontOverrideSetting key={props.font} downloadFont={downloadFont} manager={manager} setting={props} />)}
        </Setting.Container>
    </>
));

function IconSetSetting({
    manager,
}: {
    manager: IconsSettingsManager,
}) {
    const onFileSearchClick = useCallback(() => {
        new FileSearchModal(manager.plugin, {
            setSelection: async (file) => {
                if (file instanceof TFolder) {
                    const updates: NonNullable<Parameters<typeof manager.saveIconSettings>[0]> = {};
                    for (const child of file.children) {
                        if (!(child instanceof TFile)) continue;

                        if ((iconExtensions as readonly string[]).includes(child.extension)
                            && (iconTypes as readonly string[]).includes(child.basename)
                        ) {
                            updates[child.basename as IconNames] = child.path;
                        }
                    }
                    await manager.saveIconSettings(updates);

                    new Notice(`Updated icon overrides for ${Object.entries(updates).length}`);
                }
            },
            selectDir: true,
            extensions: [],
            onEmptyStateText: (searchPath) => (
                `No folders found at "${searchPath}"`
            )
        }).open()
    }, [manager]);

    const clearAllOverrides = useCallback(() => (
        manager.saveIconSettings(null)
    ), [manager]);

    return (
        <>
            <Setting
                slots={{
                    name: 'Use icon set',
                    desc: 'Select a folder to load an icon set from. This option will only update an override if an icon name in the provided folder matches one of the names below.',
                    control: (
                        <>
                            <Setting.Button
                                icon={'file-search'}
                                onClick={onFileSearchClick}
                            />
                            <Setting.ExtraButton
                                icon={'rotate-ccw'}
                                tooltip={'Clear all overrides'}
                                onClick={clearAllOverrides}
                            />
                        </>
                    )
                }}
            />
        </>
    );
}

function IconOverrideSetting({
    downloadIcon,
    manager,
    icon,
}: {
    downloadIcon: (icon: IconNames, config: DownloadInfo) => void,
    manager: IconsSettingsManager,
    icon: IconNames,
}) {
    const store = useMemo(() => (
        {
            getCurrent: () => manager.overrides[icon],
            subscribe: (cb: () => void) => manager.onChanged(icon, cb),
        }
    ), [manager, icon]);

    const current = useSyncExternalStore(store.subscribe, store.getCurrent);

    const onFileSearchClick = useCallback(() => {
        new FileSearchModal(manager.plugin, {
            extensions: [...iconExtensions],
            initialSearchPath: store.getCurrent(),
            onEmptyStateText: (searchPath) => (
                `No folders or icons found at "${searchPath}".`
            ),
            setSelection: (file) => {
                if (!(file instanceof TFile)) {
                    const path = typeof file === 'string' ? file : file.path;
                    new Notice(`"${path}" is not a valid file.`);
                    return;
                }
                manager.setIconPath(icon, file.path);
            },
        }).open()
    }, [manager, store]);

    const resetIcon = useCallback(() => (
        manager.setIconPath(icon, null)
    ), [icon, manager]);

    const iconConfig = useMemo(() => (
        manager.getDownloadConfig(icon)
    ), [manager, icon]);

    const download = useCallback(() => (
        downloadIcon(icon, iconConfig)
    ), [icon, iconConfig, downloadIcon]);

    const href = `https://github.com/tldraw/tldraw/blob/v${TLDRAW_VERSION}/assets/icons/icon/${icon}.svg`;

    return (
        <>
            <Setting
                slots={{
                    name: (
                        <a href={href} title={href}>{icon}</a>
                    ),
                    control: (
                        <>
                            <Setting.Text
                                value={current ?? ''}
                                placeholder="[ DEFAULT ]"
                                readonly={true}
                            />
                            <Setting.Button
                                icon={'file-search'}
                                onClick={onFileSearchClick}
                            />
                            <Setting.ExtraButton
                                icon={'download'}
                                tooltip={`Download from ${iconConfig.url}`}
                                onClick={download}
                            />
                            <Setting.ExtraButton
                                icon={'rotate-ccw'}
                                tooltip={'Use default'}
                                disabled={!current}
                                onClick={resetIcon}
                            />
                        </>
                    )
                }}
            />
        </>
    );
}

const MemoIconAssetsSettingsGroup = memo(({
    downloadAll,
    downloadIcon,
    manager,
}: {
    downloadAll: () => void,
    downloadIcon: (icon: IconNames, config: DownloadInfo) => void,
    manager: IconsSettingsManager,
}) => (
    <>
        <Setting.Container>
            <IconAssetsSettingsGroup downloadAll={downloadAll} manager={manager} />
        </Setting.Container>
        <h2>Icon assets overrides</h2>
        <Setting.Container>
            <IconSetSetting manager={manager} />
        </Setting.Container>
        <h2>Individual icon overrides</h2>
        <p>
            Click an icon name to view the default in your web browser. All of the default icons are available to browse on <a href="https://github.com/tldraw/tldraw/tree/v${TLDRAW_VERSION}/assets/icons/icon">
                {'tldraw\'s GitHub repository'}
            </a>.
        </p>
        <Setting.Container>
            {iconTypes.map((e) => (
                <IconOverrideSetting key={e} icon={e} manager={manager} downloadIcon={downloadIcon} />
            ))}
        </Setting.Container>
    </>
));

export default function AssetsSettings() {
    const settingsManager = useSettingsManager();

    const assetManagers = useMemo(() => ({
        fonts: new FontsSettingsManager(settingsManager.plugin),
        icons: new IconsSettingsManager(settingsManager.plugin),
        downloads: new DownloadManagerModal(settingsManager.plugin.app),
    }), [settingsManager]);

    const downloadFont = useCallback((font: FontTypes, config: DownloadInfo) => (
        assetManagers.downloads.startDownload(config,
            async (tFile) => assetManagers.fonts.setFontPath(font, tFile.path)
        )
    ), [assetManagers]);

    const downloadIcon = useCallback((icon: IconNames, config: DownloadInfo) => (
        assetManagers.downloads.startDownload(config,
            async (tFile) => assetManagers.icons.setIconPath(icon, tFile.path)
        )
    ), [assetManagers]);

    const downloadAllFonts = useCallback(async () => {
        const configs = assetManagers.fonts.getAllAssetsConfigs();
        for (const [font, downloadInfo] of configs) {
            await downloadFont(font, downloadInfo);
        }
    }, [settingsManager, assetManagers, downloadFont]);

    const downloadAllIcons = useCallback(async () => {
        const configs = assetManagers.icons.getAllDownloadConfigs();
        for (const [icon, downloadInfo] of configs) {
            await downloadIcon(icon, downloadInfo);
        }
    }, [settingsManager, downloadIcon]);

    const downloadAll = useCallback(async () => {
        await downloadAllFonts();
        await downloadAllIcons();
    }, [downloadAllFonts, downloadAllIcons]);

    return (
        <>
            <MemoAssetsSettingsGroup downloadAll={downloadAll} />
            <h2>Fonts</h2>
            <MemoFontAssetsSettingsGroup downloadAll={downloadAllFonts} downloadFont={downloadFont} manager={assetManagers.fonts} />
            <h2>Icons</h2>
            <MemoIconAssetsSettingsGroup downloadAll={downloadAllIcons} downloadIcon={downloadIcon} manager={assetManagers.icons} />
        </>
    );
}
