export interface IpfsConfig {
    apiUrl: string;
    gatewayUrl: string;
    uploadFilename?: string;
}
export interface IpfsResult {
    cid: string;
    size: number;
}
export declare function uploadToIpfs(config: IpfsConfig, content: string): Promise<IpfsResult>;
export declare function fetchFromIpfs(config: IpfsConfig, cid: string): Promise<string>;
//# sourceMappingURL=ipfs.d.ts.map