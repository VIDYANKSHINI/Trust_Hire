import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

// In-memory fallback stores when Supabase is not yet configured
const memStore = {
  nonces: new Map<string, { address: string; message: string; expires_at: string }>(),
  briefs: new Map<string, { job_id: number; client: string; brief_enc: string; public_summary: string }>(),
  applications: new Map<string, {
    job_id: number;
    applicant: string;
    pitch_enc: string;
    skills: string[];
    match_score: number | null;
    match_detail: any | null;
    provider: string | null;
    created_at: string;
  }>(),
  deliverables: new Map<string, { job_id: number; freelancer: string; content_enc: string; hash: string }>(),
  verdicts: new Map<string, { job_id: number; provider: string; confidence_bps: number; pass: boolean }>(),
};

export function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    if (!supabaseInstance) {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: false },
      });
    }
    return { client: supabaseInstance, isMock: false };
  }

  return { client: null, isMock: true, memStore };
}

// Typed database query helpers
export const db = {
  // Nonces
  async setNonce(address: string, message: string, expiresAt: Date) {
    const { client, memStore: mem } = getDb();
    const addr = address.toLowerCase();
    if (client) {
      const { error } = await client
        .from("nonces")
        .upsert({ address: addr, message, expires_at: expiresAt.toISOString() });
      if (error) throw error;
    } else {
      mem!.nonces.set(addr, { address: addr, message, expires_at: expiresAt.toISOString() });
    }
  },

  async getNonce(address: string) {
    const { client, memStore: mem } = getDb();
    const addr = address.toLowerCase();
    if (client) {
      const { data, error } = await client
        .from("nonces")
        .select("*")
        .eq("address", addr)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      return mem!.nonces.get(addr) || null;
    }
  },

  async deleteNonce(address: string) {
    const { client, memStore: mem } = getDb();
    const addr = address.toLowerCase();
    if (client) {
      await client.from("nonces").delete().eq("address", addr);
    } else {
      mem!.nonces.delete(addr);
    }
  },

  // Briefs
  async getBrief(jobId: number) {
    const { client, memStore: mem } = getDb();
    if (client) {
      const { data, error } = await client
        .from("briefs")
        .select("*")
        .eq("job_id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      return mem!.briefs.get(String(jobId)) || null;
    }
  },

  async insertBrief(jobId: number, clientAddress: string, briefEnc: string, publicSummary: string) {
    const { client, memStore: mem } = getDb();
    const cAddr = clientAddress.toLowerCase();
    if (client) {
      const { error } = await client
        .from("briefs")
        .insert({
          job_id: jobId,
          client: cAddr,
          brief_enc: briefEnc,
          public_summary: publicSummary,
        });
      if (error) throw error;
    } else {
      if (mem!.briefs.has(String(jobId))) {
        throw new Error("Brief already exists for job " + jobId);
      }
      mem!.briefs.set(String(jobId), {
        job_id: jobId,
        client: cAddr,
        brief_enc: briefEnc,
        public_summary: publicSummary,
      });
    }
  },

  // Applications
  async upsertApplication(
    jobId: number,
    applicant: string,
    pitchEnc: string,
    skills: string[]
  ) {
    const { client, memStore: mem } = getDb();
    const appAddr = applicant.toLowerCase();
    if (client) {
      const { error } = await client
        .from("applications")
        .upsert({
          job_id: jobId,
          applicant: appAddr,
          pitch_enc: pitchEnc,
          skills,
        });
      if (error) throw error;
    } else {
      const key = `${jobId}:${appAddr}`;
      const existing = mem!.applications.get(key);
      mem!.applications.set(key, {
        job_id: jobId,
        applicant: appAddr,
        pitch_enc: pitchEnc,
        skills,
        match_score: existing?.match_score ?? null,
        match_detail: existing?.match_detail ?? null,
        provider: existing?.provider ?? null,
        created_at: existing?.created_at ?? new Date().toISOString(),
      });
    }
  },

  async getApplications(jobId: number) {
    const { client, memStore: mem } = getDb();
    if (client) {
      const { data, error } = await client
        .from("applications")
        .select("*")
        .eq("job_id", jobId);
      if (error) throw error;
      return data || [];
    } else {
      const res: any[] = [];
      for (const [key, app] of mem!.applications.entries()) {
        if (app.job_id === jobId) {
          res.push(app);
        }
      }
      return res;
    }
  },

  async updateApplicationScore(
    jobId: number,
    applicant: string,
    matchScore: number | null,
    matchDetail: any | null,
    provider: string | null
  ) {
    const { client, memStore: mem } = getDb();
    const appAddr = applicant.toLowerCase();
    if (client) {
      const { error } = await client
        .from("applications")
        .update({
          match_score: matchScore,
          match_detail: matchDetail,
          provider,
        })
        .match({ job_id: jobId, applicant: appAddr });
      if (error) throw error;
    } else {
      const key = `${jobId}:${appAddr}`;
      const app = mem!.applications.get(key);
      if (app) {
        app.match_score = matchScore;
        app.match_detail = matchDetail;
        app.provider = provider;
      }
    }
  },

  // Deliverables
  async getDeliverable(jobId: number) {
    const { client, memStore: mem } = getDb();
    if (client) {
      const { data, error } = await client
        .from("deliverables")
        .select("*")
        .eq("job_id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      return mem!.deliverables.get(String(jobId)) || null;
    }
  },

  async upsertDeliverable(
    jobId: number,
    freelancer: string,
    contentEnc: string,
    hash: string
  ) {
    const { client, memStore: mem } = getDb();
    const flAddr = freelancer.toLowerCase();
    if (client) {
      const { error } = await client
        .from("deliverables")
        .upsert({
          job_id: jobId,
          freelancer: flAddr,
          content_enc: contentEnc,
          hash,
        });
      if (error) throw error;
    } else {
      mem!.deliverables.set(String(jobId), {
        job_id: jobId,
        freelancer: flAddr,
        content_enc: contentEnc,
        hash,
      });
    }
  },

  // Verdicts
  async getVerdict(jobId: number) {
    const { client, memStore: mem } = getDb();
    if (client) {
      const { data, error } = await client
        .from("verdicts")
        .select("*")
        .eq("job_id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      return mem!.verdicts.get(String(jobId)) || null;
    }
  },

  async upsertVerdict(
    jobId: number,
    provider: string,
    confidenceBps: number,
    pass: boolean
  ) {
    const { client, memStore: mem } = getDb();
    if (client) {
      const { error } = await client
        .from("verdicts")
        .upsert({
          job_id: jobId,
          provider,
          confidence_bps: confidenceBps,
          pass,
        });
      if (error) throw error;
    } else {
      mem!.verdicts.set(String(jobId), {
        job_id: jobId,
        provider,
        confidence_bps: confidenceBps,
        pass,
      });
    }
  },
};
