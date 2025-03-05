import React, { useCallback, useMemo } from "react";
import Setting from "./Setting";
import useUserPluginSettings from "src/hooks/useUserPluginSettings";
import useSettingsManager from "src/hooks/useSettingsManager";

export default function CameraOptionsSettings() {
    const settingsManager = useSettingsManager();
    const settings = useUserPluginSettings(settingsManager);

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
            <Setting
                slots={{
                    name: (
                        <>
                            Pan speed
                        </>
                    )
                }}
            />
            <Setting
                slots={{
                    name: (
                        <>
                            Zoom speed
                        </>
                    )
                }}
            />
            <Setting
                slots={{
                    name: (
                        <>
                            Zoom steps
                        </>
                    )
                }}
            />
            <Setting
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
