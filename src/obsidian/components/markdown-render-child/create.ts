import { TFile } from "obsidian";
import TldrawPlugin from "src/main";
import { TldrawMarkdownRenderChild } from "./tldraw-markdown-render-child";
import { MarkdownEmbed } from "src/obsidian/markdown-embed";

export default function createEmbedTldraw({
    file, internalEmbedDiv, plugin,
}: {
    file: TFile,
    internalEmbedDiv: HTMLElement,
    plugin: TldrawPlugin,
}) {
    const component = new TldrawMarkdownRenderChild(
        new MarkdownEmbed(internalEmbedDiv),
        plugin,
        {
            tFile: file,
            refreshTimeoutDelay: 500,
        }
    );

    return {
        component,
        preload: () => component.loadRoot()
    };
}
