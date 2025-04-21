import React, { useCallback } from "react";
import Setting from "./Setting";
import useSettingsManager from "src/hooks/useSettingsManager";
import { DEFAULT_SETTINGS, TldrawPluginSettings } from "src/obsidian/TldrawSettingsTab";
import useUserPluginSettings from "src/hooks/useUserPluginSettings";

const markdownViewOptions = {
    'markdown': 'Markdown editor',
    'tldraw-read-only': 'Tldraw read-only',
    'tldraw-view': 'Tldraw editor',

} as const satisfies Record<TldrawPluginSettings['workspace']['tldrMarkdownViewType'], string>;

export default function WorkspaceSettings() {
    const manager = useSettingsManager();
    const settings = useUserPluginSettings(manager);

    const onSwitchViewTypeChanged = useCallback(async (value: boolean) => {
        manager.settings.workspace.switchMarkdownView = value;
        await manager.updateSettings(manager.settings);
    }, [manager]);

    const onMarkdownViewTypeChanged = useCallback(async (value: string) => {
        if (!Object.hasOwn(markdownViewOptions, value)) {
            return;
        }
        manager.settings.workspace.tldrMarkdownViewType = value as keyof typeof markdownViewOptions;
        await manager.updateSettings(manager.settings);
    }, [manager]);


    return (
        <>
            <Setting.Container >
                <Setting
                    heading={true}
                    slots={{
                        name: 'Markdown view'
                    }}
                />
                <Setting
                    slots={{
                        name: 'Switch markdown view type',
                        desc: (
                            <>
                                When opening a `.md` file that is detected as a tldraw document, switch to the view type below.
                                <code className="ptl-default-code">
                                    DEFAULT: {DEFAULT_SETTINGS.workspace.switchMarkdownView ? 'On' : 'Off'}
                                </code>
                            </>
                        ),
                        control: (
                            <>
                                <Setting.Toggle
                                    value={settings.workspace.switchMarkdownView}
                                    onChange={onSwitchViewTypeChanged}
                                />
                            </>
                        )
                    }}
                />
                <Setting
                    slots={{
                        name: 'Tldraw markdown view type',
                        desc: (
                            <>
                                When opening a `.md` file that is detected as a tldraw document, use this view type.
                                <code className="ptl-default-code">
                                    DEFAULT: {markdownViewOptions[DEFAULT_SETTINGS.workspace.tldrMarkdownViewType]}
                                </code>
                            </>
                        ),
                        info: settings.workspace.switchMarkdownView ? <></> : (
                            <>
                                <p style={{ color: 'var(--color-yellow)' }}>Enable the toggle above to change this setting</p>
                            </>
                        ),
                        control: (
                            <>
                                <Setting.Dropdown
                                    options={markdownViewOptions}
                                    value={settings.workspace.tldrMarkdownViewType}
                                    onChange={onMarkdownViewTypeChanged}
                                    disabled={!settings.workspace.switchMarkdownView}
                                />
                            </>
                        )
                    }}
                />
            </Setting.Container>
        </>
    )
}