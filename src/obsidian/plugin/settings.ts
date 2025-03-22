import { IconNames } from "src/types/tldraw";
import { TldrawPluginSettings } from "../TldrawSettingsTab";
import { iconTypes } from "../settings/constants";

type FontOverridesSettings = NonNullable<TldrawPluginSettings['fonts']>['overrides'];
type IconOverridesSettings = NonNullable<TldrawPluginSettings['icons']>['overrides'];

/**
 * Ensures undefined values are not kept.
 */
export function processFontOverrides(
    overrides: FontOverridesSettings,
    getResourcePath: (font: string) => string
): FontOverridesSettings {
    if (overrides === undefined) return undefined;
    const { draw, monospace, sansSerif, serif } = overrides;

    const processed: NonNullable<FontOverridesSettings> = {};

    if (draw !== undefined) {
        processed.tldraw_draw = getResourcePath(draw);
    }

    if (monospace !== undefined) {
        processed.tldraw_mono = getResourcePath(monospace);
    }

    if (sansSerif !== undefined) {
        processed.tldraw_sans = getResourcePath(sansSerif);
    }

    if (serif !== undefined) {
        processed.tldraw_serif = getResourcePath(serif);
    }

    return processed;
}

export function processIconOverrides(
    overrides: IconOverridesSettings,
    getResourcePath: (iconPath: string) => string
): IconOverridesSettings {
    if (overrides === undefined) return undefined;

    const processed: NonNullable<IconOverridesSettings> = {};

    for (const [iconName, override] of Object.entries(overrides)) {
        if (override === undefined) continue;
        processed[iconName as IconNames] = getResourcePath(override)
    }

    return processed;
}


function addIfDefined<T extends Record<string, unknown>>(object: T, key: keyof T, value: T[keyof T] | undefined) {
    if (value !== undefined) {
        object[key] = value;
    }
}

/**
 * If a value is null or length of 0, then it represents "update to default value".
 */
type OverridesSettingsUpdate<T> = {
    [k in keyof NonNullable<T>]: NonNullable<T>[k] | null
}

type FontOverridesSettingsUpdate = OverridesSettingsUpdate<FontOverridesSettings>;
type IconOverridesSettingsUpdate = OverridesSettingsUpdate<IconOverridesSettings>;

function getOverrideOrUndefinedForDefault<
    OverridesSettings extends Record<string, unknown>,
    Update extends OverridesSettingsUpdate<OverridesSettings>,
>(
    key: keyof NonNullable<OverridesSettings>,
    original: OverridesSettings | undefined,
    updates: Update,
) {
    return updates[key] === null
        ? undefined
        : updates[key] ?? original?.[key];
}

export function updateFontOverrides(
    original: FontOverridesSettings,
    updates: FontOverridesSettingsUpdate
): FontOverridesSettings {
    const object: NonNullable<FontOverridesSettings> = {};
    addIfDefined(object,
        'draw', getOverrideOrUndefinedForDefault('draw', original, updates),
    )
    addIfDefined(object,
        'sansSerif', getOverrideOrUndefinedForDefault('sansSerif', original, updates),
    )
    addIfDefined(object,
        'serif', getOverrideOrUndefinedForDefault('serif', original, updates),
    )
    addIfDefined(object,
        'monospace', getOverrideOrUndefinedForDefault('monospace', original, updates),
    )
    return object;
}

export function updateIconOverrides(
    original: IconOverridesSettings,
    updates: IconOverridesSettingsUpdate
): IconOverridesSettings {
    const object: NonNullable<IconOverridesSettings> = {};

    for (const iconName of iconTypes) {
        addIfDefined(object,
            iconName, getOverrideOrUndefinedForDefault(iconName, original, updates),
        )
    }

    return object;
}
