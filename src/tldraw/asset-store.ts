import { CachedMetadata, Notice, TFile } from "obsidian";
import TldrawPlugin from "src/main";
import { TldrawFileListener } from "src/obsidian/plugin/TldrawFileListenerMap";
import { createAttachmentFilepath } from "src/utils/utils";
import { TLAsset, TLAssetContext, TLAssetStore } from "tldraw";
import { TldrawStoreIndexedDB } from "./indexeddb-store";

const blockRefAssetPrefix = 'obsidian.blockref.';
type BlockRefAssetId = `${typeof blockRefAssetPrefix}${string}`;

/**
 * Use a markdown file as an assets proxy for {@linkcode TLAssetStore}
 */
export class ObsidianMarkdownFileTLAssetStoreProxy {
    /**
     * <block reference id, asset base64 URI string>
     * 
     * We utilize a base64 data URI string here instead of a non-data URI because the TldrawImage component will display an image error without it.
    */
    readonly #resolvedAssetDataCache = new Map<BlockRefAssetId, string>();
    readonly #metadataListener: TldrawFileListener;

    #cachedMetadata: CachedMetadata | null;

    constructor(
        private readonly plugin: TldrawPlugin,
        /**
         * The markdown file 
         */
        private readonly tFile: TFile,
        private readonly onContentsChanged?: (fileContents: string, assetId: BlockRefAssetId, assetFile: TFile) => void
    ) {
        this.#cachedMetadata = this.plugin.app.metadataCache.getFileCache(tFile);
        this.#metadataListener = this.plugin.tldrawFileMetadataListeners.addListener(tFile, () => {
            this.#cachedMetadata = this.plugin.app.metadataCache.getFileCache(tFile);
        });
    }

    dispose() {
        this.#metadataListener.remove();
        // We want to avoid memory leaks: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static#memory_management
        for (const objectURL of this.#resolvedAssetDataCache.values()) {
            URL.revokeObjectURL(objectURL);
        }
    }

    get cachedMetadata() {
        if (!this.#cachedMetadata) {
            throw new Error(`${ObsidianMarkdownFileTLAssetStoreProxy.name}: Cached metadata is unavailable for ${this.tFile.path}`);
        }
        return this.#cachedMetadata;
    }

    /**
     * Store an asset as a link in the markdown file
     * @param file The asset file to store a reference to in the markdown file.
     */
    async storeAsset(asset: TLAsset, file: File) {
        const blockRefId = window.crypto.randomUUID();
        const objectName = `${blockRefId}-${file.name}`.replace(/\W/g, '-')
        const ext = file.type.split('/').at(1);

        const {
            filename,
            folder
        } = await createAttachmentFilepath(
            this.plugin.app.fileManager,
            !ext ? objectName : `${objectName}.${ext}`, this.tFile,
        );

        const assetFile = await this.plugin.app.vault.createBinary(`${folder}/${filename}`,
            await file.arrayBuffer()
        );

        const internalLink = this.plugin.app.fileManager.generateMarkdownLink(assetFile, this.tFile.path);
        const linkBlock = `${internalLink}\n^${blockRefId}`;
        const assetSrc = `${blockRefAssetPrefix}${blockRefId}` as const;
        await this.plugin.app.vault.process(this.tFile, (data) => {
            const { start, end } = this.cachedMetadata.frontmatterPosition ?? {
                start: { offset: 0 }, end: { offset: 0 }
            };

            const frontmatter = data.slice(start.offset, end.offset)
            const rest = data.slice(end.offset);
            const contents = `${frontmatter}\n${linkBlock}\n${rest}`;
            this.onContentsChanged?.(contents, assetSrc, assetFile);
            return contents;
        });

        const assetDataUri = URL.createObjectURL(file);
        this.#resolvedAssetDataCache.set(assetSrc, assetDataUri);
        return assetSrc;
    }

    async getAsset(blockRefAssetId: BlockRefAssetId): Promise<ArrayBuffer | null> {
        const blocks = this.cachedMetadata.blocks;
        if (!blocks) return null;

        const id = blockRefAssetId.slice(blockRefAssetPrefix.length)
        const assetBlock = blocks[id];
        if (!assetBlock) {
            new Notice(`Asset block not found: ${id}`);
            return null;
        }

        const assetBlockContents = (await this.plugin.app.vault.cachedRead(this.tFile))
            .substring(assetBlock.position.start.offset, assetBlock.position.end.offset);
        const insideBrackets = /\[\[(.*?)\]\]/;
        const link = assetBlockContents.match(insideBrackets)?.at(1);

        if (!link) {
            new Notice(`Asset block does not reference a link: ${id}`);
            return null;
        }

        const assetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(link, this.tFile.path);

        if (!assetFile) {
            new Notice(`Asset block link did not reference a known file: ${id} (${link})`);
            return null;
        }

        return this.plugin.app.vault.readBinary(assetFile);
    }

    /**
     * Get the asset from the cache, or read it and cache it if the asset exists
     * @param blockRefAssetId 
     */
    async getCached(blockRefAssetId: BlockRefAssetId) {
        const cachedAsset = this.#resolvedAssetDataCache.get(blockRefAssetId);
        if (cachedAsset) return cachedAsset;
        const assetData = await this.getAsset(blockRefAssetId);
        if (!assetData) return null;
        const assetFileBlob = new Blob(
            [assetData],
            {
                type: assetData.slice(0, 4).toString() === '<svg'
                    ? 'image/svg+xml' : undefined
            }
        );
        const assetUri = URL.createObjectURL(assetFileBlob);
        this.#resolvedAssetDataCache.set(blockRefAssetId, assetUri);
        return assetUri;
    }

    async getAll(): Promise<BlockRefAssetId[]> {
        return Object.values(this.cachedMetadata.blocks ?? {}).map(
            (e) => `${blockRefAssetPrefix}${e.id}` as const
        );
    }
}

/**
 * Prohibits modifications to the markdown file.
 */
export class ObsidianReadOnlyMarkdownFileTLAssetStoreProxy extends ObsidianMarkdownFileTLAssetStoreProxy {
    storeAsset(asset: TLAsset, file: File): Promise<never> {
        throw new Error(`${ObsidianReadOnlyMarkdownFileTLAssetStoreProxy.name}: Storing assets is prohibited in read-only mode.`)
    }
}

/**
 * Replaces the default tldraw asset store with one that saves assets to the attachment folder.
 * 
 * See more:
 * 
 * https://tldraw.dev/examples/data/assets/hosted-images
 */
export class ObsidianTLAssetStore implements TLAssetStore {
    private db?: null | TldrawStoreIndexedDB;
    private readonly resolvedIDBCache = new Map<string, string>();

    constructor(
        /**
         * The persistence key which references a {@linkcode TLAssetStore} in the {@linkcode IDBDatabase}
         */
        public readonly persistenceKey: string,
        private readonly proxy: ObsidianMarkdownFileTLAssetStoreProxy,
    ) {
        this.upload = this.upload.bind(this);
        this.resolve = this.resolve.bind(this);
    }

    dispose() {
        this.proxy.dispose();
        // We want to avoid memory leaks: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static#memory_management
        for (const objectURL of this.resolvedIDBCache.values()) {
            URL.revokeObjectURL(objectURL);
        }
    }

    async upload(asset: TLAsset, file: File, _: AbortSignal): ReturnType<TLAssetStore['upload']> {
        const blockRefAssetId = await this.proxy.storeAsset(asset, file);
        return {
            src: `asset:${blockRefAssetId}`,
        };
    }

    async resolve(asset: TLAsset, ctx: TLAssetContext): Promise<null | string> {
        const assetSrc = asset.props.src;
        if (!assetSrc) return null;

        if (!assetSrc.startsWith('asset:')) return assetSrc;

        const assetId = assetSrc.split(':').at(1);

        if (!assetId) return null;

        if (!assetId.startsWith(blockRefAssetPrefix)) {
            return this.getFromIndexedDB(assetSrc as `asset:${string}`);
        }

        return this.proxy.getCached(assetId as BlockRefAssetId)
    }

    async getFromMarkdown(assetSrc: BlockRefAssetId) {
        return this.proxy.getCached(assetSrc);
    }

    async tryOpenDb() {
        if (this.db === null) {
            // Already tried
            return null;
        }
        return this.db = await TldrawStoreIndexedDB.open(this.persistenceKey);
    }

    async getFromIndexedDB(assetSrc: `asset:${string}`): Promise<string | null> {
        const cachedAssetUri = this.resolvedIDBCache.get(assetSrc);
        if (cachedAssetUri) return cachedAssetUri;
        const db = await this.tryOpenDb();
        if (!db) return null;
        const blob = await db.getAsset(assetSrc)
        if (!blob) return null;
        const assetUri = URL.createObjectURL(blob);
        this.resolvedIDBCache.set(assetSrc, assetUri);
        return assetUri;
    }

    async getAllFromIndexedDB(): Promise<`asset:${string}`[]> {
        const db = await this.tryOpenDb();
        if (!db) return [];
        await db.openDb();
        return db.getAllAssetSources();
    }

    async getAllFromMarkdownFile(): Promise<BlockRefAssetId[]> {
        return this.proxy.getAll();
    }
}
