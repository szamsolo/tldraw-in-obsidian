import UserSettingsManager from "src/obsidian/settings/UserSettingsManager";
import { Editor, ScribbleItem } from "tldraw"

export default function monkeyPatchEditorInstance(editor: Editor, userSettings: UserSettingsManager) {
    /**
     * The original {@linkcode editor.scribbles.stop} method hardcodes a maximum 200 millisecond
     * delay before any scribble disappears.
     * 
     * For our purposes, we allow only the laser color to ignore this delay.
     */
    editor.scribbles.stop = function stop(id: ScribbleItem['id']) {
        const item = this.scribbleItems.get(id)
        if (!item) throw Error(`Scribble with id ${id} not found`);
        if (!(
            item.scribble.color === 'laser'
            && userSettings.settings.tldrawOptions?.laserKeepDelayAfterStop
        )) {
            item.delayRemaining = Math.min(item.delayRemaining, 200)
        }
        item.scribble.state = 'stopping'
        return item
    };
}