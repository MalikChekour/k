export type Claim = {
  id: string; type: string; statement: string; severity?: string | null; population?: string | null;
  status: string; reviewed_by?: string | null; source: string; url: string; quote: string;
};
export type Plant = { id: string; fr: string; latin: string; part: string; claims: Claim[] };
