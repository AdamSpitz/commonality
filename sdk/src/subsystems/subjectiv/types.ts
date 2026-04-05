export type DirectTrustMapping = Map<string, number>;
export type TransitiveTrustMapping = Map<string, number>;

export interface DirectTrustEntry {
  trustee: string;
  score: number;
}

export interface TrustComputationOptions {
  maxHops?: number;
  minScore?: number;
  directTrustCache?: Map<string, DirectTrustMapping>;
}
