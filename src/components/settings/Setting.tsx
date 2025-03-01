import { DropdownComponent, Setting as ObsidianSetting } from "obsidian";
import React, { ContextType, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SettingContext, SettingSlotContext } from "src/contexts/setting-context";

export default function Setting({
    children,
    containerEl,
    className = '',
    disabled = false,
    slots: {
        info: infoSlot,
        name: nameSlot,
        desc: descSlot,
        control: controlSlot,
    } = {},
    tooltip = '',
}: {
    children?: ReactNode,
    className?: Parameters<ObsidianSetting['setClass']>[0],
    containerEl: HTMLElement,
    disabled?: Parameters<ObsidianSetting['setDisabled']>[0],
    slots?: {
        control?: ReactNode,
        info?: ReactNode,
        name?: ReactNode,
        desc?: ReactNode,
    }
    tooltip?: Parameters<ObsidianSetting['setTooltip']>[0] | {
        options?: Parameters<ObsidianSetting['setTooltip']>[1]
        tooltip: Parameters<ObsidianSetting['setTooltip']>[0],
    },
}) {
    const setting = useMemo(() => new ObsidianSetting(containerEl), [containerEl]);

    useEffect(() => {
        const args = typeof tooltip === 'string'
            ? [tooltip, undefined] as const
            : [tooltip.tooltip, tooltip.options] as const
            ;
        setting.setTooltip(...args);
    }, [setting, tooltip]);

    useEffect(() => {
        if (className) setting.setClass(className);
    }, [setting, className]);

    useEffect(() => {
        setting.setDisabled(disabled);
    }, [setting, disabled]);

    const settingSlotsContext = useMemo(
        () => ({
            control: {
                setting,
                slotEl: setting.controlEl
            },
            desc: {
                setting,
                slotEl: setting.descEl
            },
            info: {
                setting,
                slotEl: setting.infoEl
            },
            name: {
                setting,
                slotEl: setting.nameEl
            },
            setting: {
                setting,
                slotEl: setting.settingEl
            },
        }) satisfies Record<string, ContextType<typeof SettingSlotContext>>, [setting]
    );
    return (
        <SettingContext.Provider value={setting}>
            <SettingSlotContext.Provider value={settingSlotsContext.control}>
                {createPortal(controlSlot, settingSlotsContext.control.slotEl)}
            </SettingSlotContext.Provider>
            <SettingSlotContext.Provider value={settingSlotsContext.desc}>
                {createPortal(descSlot, settingSlotsContext.desc.slotEl)}
            </SettingSlotContext.Provider>
            <SettingSlotContext.Provider value={settingSlotsContext.info}>
                {createPortal(infoSlot, settingSlotsContext.info.slotEl)}
            </SettingSlotContext.Provider>
            <SettingSlotContext.Provider value={settingSlotsContext.name}>
                {createPortal(nameSlot, settingSlotsContext.name.slotEl)}
            </SettingSlotContext.Provider>
            <SettingSlotContext.Provider value={settingSlotsContext.setting}>
                {createPortal(children, settingSlotsContext.setting.slotEl)}
            </SettingSlotContext.Provider>
        </SettingContext.Provider>
    )
}

Setting.Dropdown = function Dropdown({
    children, options, onChange, value,
}: {
    children?: ReactNode,
    options?: Parameters<DropdownComponent['addOptions']>[0],
    onChange?: Parameters<DropdownComponent['onChange']>[0]
    value?: string,
}) {
    const settingSlot = useContext(SettingSlotContext);
    const [dropdown, setDropdown] = useState<DropdownComponent>();

    useEffect(() => {
        if (!settingSlot) return;
        const dropdown = new DropdownComponent(settingSlot.slotEl);
        if (options) dropdown.addOptions(options);
        setDropdown(dropdown);
        return () => {
            setDropdown(undefined);
            dropdown.selectEl.remove();
        };
    }, [settingSlot, options]);

    useEffect(() => {
        if (!dropdown) return;
        if (onChange) dropdown.onChange(onChange);
        if (value) dropdown.setValue(value);
    }, [dropdown, onChange, value]);

    return !dropdown ? undefined : (
        <>
            {createPortal(children, dropdown.selectEl)}
        </>
    );
}