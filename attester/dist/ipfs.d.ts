export interface IpfsResult {
    cid: string;
    size: number;
}
export declare function uploadToIpfs(content: string): Promise<IpfsResult>;
export declare function fetchFromIpfs(cid: string): Promise<string>;
//# sourceMappingURL=ipfs.d.ts.map