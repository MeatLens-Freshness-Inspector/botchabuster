import { supabase } from "../integrations/supabase";

export interface AccessCode {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  times_used: number;
  created_at: string;
}

export class AccessCodeService {
  private static instance: AccessCodeService;

  private constructor() {}

  static getInstance(): AccessCodeService {
    if (!AccessCodeService.instance) {
      AccessCodeService.instance = new AccessCodeService();
    }
    return AccessCodeService.instance;
  }

  async getAll(): Promise<AccessCode[]> {
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch access codes: ${error.message}`);
    return (data as unknown as AccessCode[]) ?? [];
  }

  async validate(code: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("validate_access_code", { _code: code.trim() });
    if (error) throw new Error(`Failed to validate access code: ${error.message}`);
    return Boolean(data);
  }

  async create(code: string, description?: string, createdBy?: string): Promise<AccessCode> {
    const { data, error } = await (supabase
      .from("access_codes") as any)
      .insert({
        code: code.trim(),
        description: description || null,
        is_active: true,
        created_by: createdBy || null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create access code: ${error.message}`);
    return data as unknown as AccessCode;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("access_codes")
      .delete()
      .eq("id", id);
    if (error) throw new Error(`Failed to delete access code: ${error.message}`);
  }

  async toggleActive(id: string, isActive: boolean): Promise<AccessCode> {
    const { data, error } = await (supabase
      .from("access_codes") as any)
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to toggle access code: ${error.message}`);
    return data as unknown as AccessCode;
  }
}

export const accessCodeService = AccessCodeService.getInstance();
