import React, { useCallback, useMemo, useState } from "react";
import Setting from "./Setting";
import useUserPluginSettings from "src/hooks/useUserPluginSettings";
import UserSettingsManager from "src/obsidian/settings/UserSettingsManager";

export default function CameraOptionsSettings({
    settingsManager,
}: {
    settingsManager: UserSettingsManager,
}) {
    const settings = useUserPluginSettings(settingsManager);

    const [contentEl, setContentEl] = useState<HTMLElement | null>(null);

    const wheelBehaviorOptions = useMemo(() => ({
        none: 'None',
        pan: 'Pan',
        zoom: 'Zoom',
    }), []);

    const onWheelBehaviorChange = useCallback((value: string) => {
        if (value !== 'none' && value !== 'pan' && value !== 'zoom') {
            console.error('Unable to updated wheelBehavior, invalid value:', { value })
            return;
        }
        settingsManager.updateEditorWheelBehavior(value);
    }, [settingsManager]);

    return (
        <>
            <h2>Camera options</h2>
            <div ref={setContentEl}>
                {
                    !contentEl ? undefined : (
                        <>
                            <Setting containerEl={contentEl}
                                slots={{
                                    name: (
                                        <>
                                            Pan speed
                                        </>
                                    )
                                }}
                            />
                            <Setting containerEl={contentEl}
                                slots={{
                                    name: (
                                        <>
                                            Zoom speed
                                        </>
                                    )
                                }}
                            />
                            <Setting containerEl={contentEl}
                                slots={{
                                    name: (
                                        <>
                                            Zoom steps
                                        </>
                                    )
                                }}
                            />
                            <Setting containerEl={contentEl}
                                slots={{
                                    name: (
                                        <>
                                            Scrolling behavior
                                        </>
                                    ),
                                    desc: (
                                        <>
                                            How the scrolling input from the mouse wheel or the touchpad gesture should control the editor camera.
                                        </>
                                    ),
                                    control: (
                                        <>
                                            <Setting.Dropdown
                                                options={wheelBehaviorOptions}
                                                value={settings.cameraOptions?.wheelBehavior}
                                                onChange={onWheelBehaviorChange}
                                            />
                                        </>
                                    )
                                }}
                            />
                        </>
                    )
                }
            </div>
        </>
    )
}
