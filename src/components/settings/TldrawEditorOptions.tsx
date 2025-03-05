import React, { useCallback } from "react";
import Setting from "./Setting";
import CameraOptionsSettings from "./CameraOptionsSettings";
import useSettingsManager from "src/hooks/useSettingsManager";
import useUserPluginSettings from "src/hooks/useUserPluginSettings";
import { defaultTldrawOptions } from "tldraw";

function TldrawEditorOptionsGroup() {
    const settingsManager = useSettingsManager();
    const settings = useUserPluginSettings(settingsManager);

    const onLaserDelayMsChange = useCallback(async (value: string) => {
        const parsedValue = parseInt(value);
        if (Number.isNaN(parsedValue)) return;
        await settingsManager.updateLaserDelayMs(parsedValue);
    }, [settingsManager]);

    const resetLaserDelayMs = useCallback(async () => {
        await settingsManager.updateLaserDelayMs(undefined);
    }, [settingsManager]);

    const onLaserKeepDelay = useCallback(async (value: boolean) => {
        await settingsManager.updateLaserKeepDelayAfterStop(value);
    }, [settingsManager]);

    const resetLaserKeepDelay = useCallback(async () => {
        await settingsManager.updateLaserKeepDelayAfterStop(undefined);
    }, [settingsManager]);

    return (
        <>
            <Setting
                slots={{
                    name: 'Laser delay',
                    desc: 'The delay for the laser tool in milliseconds.',
                    control: (
                        <>
                            <Setting.Text
                                value={`${settings.tldrawOptions?.laserDelayMs ?? ''}`}
                                placeholder={`${defaultTldrawOptions.laserDelayMs}`}
                                onChange={onLaserDelayMsChange}
                            />
                            <Setting.ExtraButton
                                icon={'reset'}
                                tooltip={'reset'}
                                onClick={resetLaserDelayMs}
                            />
                        </>
                    )
                }}
            />
            <Setting
                slots={{
                    name: 'Laser keep delay after stop',
                    desc: 'Keep the laser delay lingering after stopping the laser tool.',
                    control: (
                        <>
                            <Setting.Toggle
                                value={!!settings.tldrawOptions?.laserKeepDelayAfterStop}
                                onChange={onLaserKeepDelay}
                            />
                            <Setting.ExtraButton
                                icon={'reset'}
                                tooltip={'reset'}
                                onClick={resetLaserKeepDelay}
                            />
                        </>
                    )
                }}
            />
        </>
    )
}

function ClipboardOptionsGroup() {
    const settingsManager = useSettingsManager();
    const settings = useUserPluginSettings(settingsManager);
    const onPasteAtCursor = useCallback(async (value: boolean) => {
        await settingsManager.updatePasteAtCursor(value);
    }, [settingsManager]);

    const resetPasteAtCursor = useCallback(async () => {
        await settingsManager.updatePasteAtCursor(undefined);
    }, [settingsManager]);
    return (
        <>
            <Setting
                slots={{
                    name: 'Paste at cursor',
                    desc: (
                        <>
                            This can be accessed in the editor by navigating the menu:<br />
                            <code>
                                {'Menu > Preferences > Paste at cursor'}
                            </code>
                        </>
                    ),
                    control: (
                        <>
                            <Setting.Toggle
                                value={!!settings.clipboard?.pasteAtCursor}
                                onChange={onPasteAtCursor}
                            />
                            <Setting.ExtraButton
                                icon={'reset'}
                                tooltip={'reset'}
                                onClick={resetPasteAtCursor}
                            />
                        </>
                    )
                }}
            />
        </>
    )
}

export default function TldrawEditorOptions() {
    return (
        <>
            <h2>Clipboard options</h2>
            <Setting.Container>
                <ClipboardOptionsGroup />
            </Setting.Container>
            <h2>Pointer options</h2>
            <Setting.Container>
                <TldrawEditorOptionsGroup />
            </Setting.Container>
            <h2>Camera options</h2>
            <Setting.Container>
                <CameraOptionsSettings />
            </Setting.Container>
        </>
    );
}
