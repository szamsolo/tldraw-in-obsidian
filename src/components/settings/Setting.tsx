import { ButtonComponent, DropdownComponent, ExtraButtonComponent, MomentFormatComponent, Setting as ObsidianSetting, TextComponent, ToggleComponent } from "obsidian";
import React, { ComponentPropsWithoutRef, ContextType, ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SettingContainerContext, SettingContext, SettingSlotContext } from "src/contexts/setting-context";

export default function Setting({
    children,
    containerEl,
    className = '',
    disabled = false,
    heading = false,
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
    /**
     * If `undefined` then the context value for {@linkcode SettingContainerContext} will be used.
     */
    containerEl?: HTMLElement,
    disabled?: Parameters<ObsidianSetting['setDisabled']>[0],
    heading?: boolean,
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
    const settingContainerEl = useContext(SettingContainerContext)
    const setting = useMemo(() => {
        const el = containerEl ?? settingContainerEl ?? (
            () => { throw new Error(`Expected the "${Setting.name}" component to be provided a container element.`) }
        )();
        const setting = new ObsidianSetting(el);
        if (heading) {
            setting.setHeading();
        }
        return setting;
    }, [containerEl, heading, settingContainerEl]);

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

Setting.Button = function Button({
    children, onClick, icon, tooltip
}: {
    children?: ReactNode,
    icon?: Parameters<ButtonComponent['setIcon']>[0],
    tooltip?: Parameters<ButtonComponent['setTooltip']>[0] | {
        tooltip: Parameters<ButtonComponent['setTooltip']>[0],
        options?: Parameters<ButtonComponent['setTooltip']>[1]
    },
    onClick?: Parameters<ButtonComponent['onClick']>[0]
}) {
    const settingSlot = useContext(SettingSlotContext);

    const button = useMemo(() => {
        if (!settingSlot) return;
        return new ButtonComponent(settingSlot.slotEl);
    }, [settingSlot]);

    useEffect(() => {
        if (!button) return;
        return () => {
            button.buttonEl.remove();
        };
    }, [button]);

    useEffect(() => {
        if (!button) return;
        if (onClick) button.onClick(onClick);
        if (icon !== undefined) button.setIcon(icon);
        if (typeof children === 'string') button.setButtonText(children);
        if (tooltip !== undefined) {
            const args = typeof tooltip === 'string'
                ? [tooltip, undefined] as const
                : [tooltip.tooltip, tooltip.options] as const
                ;
            button.setTooltip(...args);
        }
    }, [button, onClick, icon, children]);

    return !button ? undefined : (
        <>
            {createPortal(children, button.buttonEl)}
        </>
    );
}

Setting.Dropdown = function Dropdown({
    children, options, onChange, value, ...rest
}: {
    children?: ReactNode,
    disabled?: boolean,
    options?: Parameters<DropdownComponent['addOptions']>[0],
    onChange?: Parameters<DropdownComponent['onChange']>[0],
    value?: string,
}) {
    const settingSlot = useContext(SettingSlotContext);

    const dropdown = useMemo(() => {
        if (!settingSlot) return;
        const dropdown = new DropdownComponent(settingSlot.slotEl);
        if (options) dropdown.addOptions(options);
        return dropdown;
    }, [settingSlot, options]);

    useEffect(() => {
        if (!dropdown) return;
        return () => {
            dropdown.selectEl.remove();
        };
    }, [dropdown]);

    useEffect(() => {
        if (!dropdown) return;
        if (onChange) dropdown.onChange(onChange);
        if (value !== undefined) dropdown.setValue(value);
    }, [dropdown, onChange, value]);

    const disabled = useMemo(() => rest.disabled, [rest]);

    useEffect(() => {
        if ('disabled' in rest) {
            dropdown?.setDisabled(rest.disabled === undefined || rest.disabled);
        } else {
            dropdown?.setDisabled(false);
        }
    }, [dropdown, disabled]);

    return !dropdown ? undefined : (
        <>
            {createPortal(children, dropdown.selectEl)}
        </>
    );
}

Setting.ExtraButton = function ExtraButton({
    children, onClick, icon, tooltip, disabled
}: {
    children?: ReactNode,
    disabled?: Parameters<ExtraButtonComponent['setDisabled']>[0],
    icon?: Parameters<ExtraButtonComponent['setIcon']>[0],
    tooltip?: Parameters<ExtraButtonComponent['setTooltip']>[0] | {
        tooltip: Parameters<ExtraButtonComponent['setTooltip']>[0],
        options?: Parameters<ExtraButtonComponent['setTooltip']>[1]
    },
    onClick?: Parameters<ExtraButtonComponent['onClick']>[0]
}) {
    const settingSlot = useContext(SettingSlotContext);

    const extraButton = useMemo(() => {
        if (!settingSlot) return;
        return new ExtraButtonComponent(settingSlot.slotEl);
    }, [settingSlot]);

    useEffect(() => {
        if (!extraButton) return;
        return () => {
            extraButton.extraSettingsEl.remove();
        };
    }, [extraButton]);

    useLayoutEffect(() => {
        if (!extraButton) return;
        if (onClick) extraButton.onClick(onClick);
        if (icon !== undefined) extraButton.setIcon(icon);
        if (tooltip !== undefined) {
            const args = typeof tooltip === 'string'
                ? [tooltip, undefined] as const
                : [tooltip.tooltip, tooltip.options] as const
                ;
            extraButton.setTooltip(...args);
        }
        if (disabled) extraButton.setDisabled(disabled);
    }, [extraButton, onClick, icon, tooltip, disabled]);

    return !extraButton ? undefined : (
        <>
            {createPortal(children, extraButton.extraSettingsEl)}
        </>
    );
}

Setting.Container = function Container({
    children,
    ...otherContainerProps
}: {
    children: ReactNode | ((containerEl: HTMLElement) => ReactNode),
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>) {
    const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
    return (
        <div ref={setContentEl} {...otherContainerProps}>
            {!contentEl ? undefined : (
                <SettingContainerContext.Provider value={contentEl}>
                    {
                        typeof children === 'function'
                            ? children(contentEl)
                            : children
                    }
                </SettingContainerContext.Provider>
            )}
        </div>
    )
}

Setting.MomentFormat = function MomentFormat({
    children,
    placeholder,
    defaultFormat,
    onChange,
    value,
    sampleEl,
}: {
    children?: ReactNode,
    placeholder?: string,
    defaultFormat?: string,
    onChange?: Parameters<MomentFormatComponent['onChange']>[0]
    value?: string,
    sampleEl?: HTMLElement,
}) {
    const settingSlot = useContext(SettingSlotContext);

    const momentFormat = useMemo(() => {
        if (!settingSlot) return;
        return new MomentFormatComponent(settingSlot.slotEl);
    }, [settingSlot]);

    useEffect(() => {
        if (!momentFormat) return;
        return () => {
            momentFormat.inputEl.remove();
        };
    }, [momentFormat]);

    useEffect(() => {
        if (!momentFormat) return;
        if (onChange) momentFormat.onChange(onChange);
        if (value !== undefined) momentFormat.setValue(value);
        if (placeholder !== undefined) momentFormat.setPlaceholder(placeholder);
        if (defaultFormat !== undefined) momentFormat.setDefaultFormat(defaultFormat);
        if (sampleEl) momentFormat.setSampleEl(sampleEl);
    }, [momentFormat, onChange, value, placeholder, sampleEl]);

    return !momentFormat ? undefined : (
        <>
            {createPortal(children, momentFormat.inputEl)}
        </>
    );
}


Setting.Text = function Text({
    children, onChange, value, placeholder, readonly
}: {
    children?: ReactNode,
    placeholder?: string,
    onChange?: Parameters<TextComponent['onChange']>[0],
    value?: string,
    readonly?: boolean,
}) {
    const settingSlot = useContext(SettingSlotContext);

    const text = useMemo(() => {
        if (!settingSlot) return;
        return new TextComponent(settingSlot.slotEl);
    }, [settingSlot]);

    useEffect(() => {
        if (!text) return;
        return () => {
            text.inputEl.remove();
        };
    }, [text]);

    useEffect(() => {
        if (!text) return;
        if (onChange) text.onChange(onChange);
        text.setValue(value ?? '');
        if (placeholder !== undefined) text.setPlaceholder(placeholder);
        text.inputEl.readOnly = !!readonly;
    }, [text, onChange, value, placeholder, readonly]);

    return !text ? undefined : (
        <>
            {createPortal(children, text.inputEl)}
        </>
    );
}

Setting.Toggle = function Toggle({
    children, onChange, value
}: {
    children?: ReactNode,
    onChange?: Parameters<ToggleComponent['onChange']>[0]
    value?: boolean,
}) {
    const settingSlot = useContext(SettingSlotContext);

    const toggle = useMemo(() => {
        if (!settingSlot) return;
        return new ToggleComponent(settingSlot.slotEl);
    }, [settingSlot]);

    useEffect(() => {
        if (!toggle) return;
        return () => {
            toggle.toggleEl.remove();
        };
    }, [toggle]);

    useEffect(() => {
        if (!toggle) return;
        if (onChange) toggle.onChange(onChange);
        if (value !== undefined) toggle.setValue(value);
    }, [toggle, onChange, value]);

    return !toggle ? undefined : (
        <>
            {createPortal(children, toggle.toggleEl)}
        </>
    );
}
