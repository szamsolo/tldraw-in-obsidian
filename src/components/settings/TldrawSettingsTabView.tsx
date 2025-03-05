import React, { useMemo, useState } from "react";
import { SettingsManagerContext } from "src/contexts/setting-manager-context";
import UserSettingsManager from "src/obsidian/settings/UserSettingsManager";
import FileSettings from "./FileSettings";
import StartUpSettings from "./StartUpSettings";
import TldrawEditorOptions from "./TldrawEditorOptions";
import EmbedsSettings from "./EmbedsSettings";
import AssetsSettings from "./AssetsSettings";

const TABS = {
    'file': {
        label: 'File',
        Component: FileSettings,
    },
    'start-up': {
        label: 'Start up',
        Component: StartUpSettings,
    },
    'tldraw-editor-options': {
        label: 'Tldraw editor',
        Component: TldrawEditorOptions,
    },
    'embeds': {
        label: 'Embeds',
        Component: EmbedsSettings,
    },
    'assets': {
        label: 'Assets',
        Component: AssetsSettings,
    }
} satisfies Record<string, {
    label: string,
    Component: () => React.JSX.Element
}>

export default function TldrawSettingsTabView({
    settingsManager,
}: {
    settingsManager: UserSettingsManager,
}) {
    const tabs = useMemo(() => Object.entries(TABS), []);
    const [[activeTabKey, activeTab], setActiveTab] = useState(tabs[0]);
    return (
        <>
            <div className="ptl-settings-tab-header" style={{ marginBottom: '8px' }}>
                <div className="ptl-settings-tab-container">
                    {tabs.map(([key, tab]) => (
                        <div key={key} className="ptl-settings-tab-item" data-is-active={key === activeTabKey} onClick={() => setActiveTab([key, tab])}>
                            {tab.label}
                        </div>
                    ))}
                </div>
            </div>
            <SettingsManagerContext.Provider value={settingsManager}>
                {/* {tabs.map(([key, { label, Component }]) => (
                    <CollapsableSection key={key} heading={<h1>{label}</h1>}>
                        <Component />
                    </CollapsableSection>
                ))} */}
                <activeTab.Component />
            </SettingsManagerContext.Provider>
        </>
    );
}