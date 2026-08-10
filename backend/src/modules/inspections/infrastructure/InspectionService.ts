import { supabase } from "../../../integrations/supabase";
import type { Inspection, InspectionInsert } from "../../../types/inspection";
import type {
  DeveloperDatasetFilters,
  DeveloperDatasetListResponse,
  InAppClassBreakdown,
  InAppMeatTypeBreakdown,
  InAppModelMetrics,
} from "../../../types/developerDashboard";
import { mergeInspectionCoordinates } from "../../../types/inspectionCoordinates";
import { mergeInspectionPreScanFields } from "../../../types/inspectionPreScan";

export type InspectionScope = "mine" | "all";

type CreateInspectionResult = {
  inspection: Inspection;
  created: boolean;
};

type SupabaseWriteError = {
  code?: string | null;
  message: string;
};

type InspectionInsertPayload = {
  user_id: string;
  client_submission_id: string;
  meat_type: InspectionInsert["meat_type"];
  classification: InspectionInsert["classification"];
  manual_classification?: InspectionInsert["manual_classification"];
  confidence_score: number;
  captured_at?: string;
  flagged_deviations?: string[];
  explanation?: string | null;
  image_url?: string | null;
  location?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  stall_number?: string | null;
  meat_inspection_certificate_proof?: string | null;
  meat_expiry_date?: string | null;
  storage_correct?: boolean | null;
  light_color_correct?: boolean | null;
  light_color_observed?: string | null;
  area_clean?: boolean | null;
  inspection_decision_source?: InspectionInsert["inspection_decision_source"];
  protocol_spoiled_reason?: string | null;
  regulatory_compliance?: boolean | null;
  inspector_notes?: string | null;
};

const INSPECTION_COLUMNS = "id, user_id, meat_type, classification, manual_classification, confidence_score, flagged_deviations, explanation, image_url, location, location_latitude, location_longitude, stall_number, meat_inspection_certificate_proof, meat_expiry_date, storage_correct, light_color_correct, light_color_observed, area_clean, inspection_decision_source, protocol_spoiled_reason, regulatory_compliance, inspector_notes, client_submission_id, captured_at, created_at, updated_at";

export class InspectionService {
  private static instance: InspectionService;
  private readonly tableName = "inspections";

  private constructor() {}

  static getInstance(): InspectionService {
    if (!InspectionService.instance) {
      InspectionService.instance = new InspectionService();
    }
    return InspectionService.instance;
  }

  private shouldViewAll(scope: InspectionScope, isAdmin: boolean): boolean {
    return scope === "all" && isAdmin;
  }

  async getAll(limit = 50, offset = 0, userId: string, scope: InspectionScope = "mine", isAdmin = false): Promise<Inspection[]> {
    let query = supabase
      .from(this.tableName)
      .select(INSPECTION_COLUMNS);

    if (!this.shouldViewAll(scope, isAdmin)) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch inspections: ${error.message}`);
    return (data as unknown as Inspection[]) ?? [];
  }

  async getById(id: string, userId: string, scope: InspectionScope = "mine", isAdmin = false): Promise<Inspection | null> {
    let query = supabase
      .from(this.tableName)
      .select(INSPECTION_COLUMNS)
      .eq("id", id);

    if (!this.shouldViewAll(scope, isAdmin)) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw new Error(`Failed to fetch inspection: ${error.message}`);
    return data as unknown as Inspection | null;
  }

  async create(inspection: InspectionInsert, userId: string): Promise<CreateInspectionResult> {
    const clientSubmissionId = inspection.client_submission_id?.trim();
    if (!clientSubmissionId) {
      throw new Error("client_submission_id is required");
    }

    const existingInspection = await this.getByClientSubmissionId(clientSubmissionId, userId);
    if (existingInspection) {
      return { inspection: existingInspection, created: false };
    }

    const inspectionPayload = this.buildInsertPayload(inspection, userId, clientSubmissionId);

    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .insert(inspectionPayload)
      .select()
      .single();

    if (error) {
      if (this.isDuplicateClientSubmissionError(error)) {
        const duplicateInspection = await this.getByClientSubmissionId(clientSubmissionId, userId);
        if (duplicateInspection) {
          return { inspection: duplicateInspection, created: false };
        }
      }

      throw new Error(`Failed to create inspection: ${error.message}`);
    }

    return { inspection: data as unknown as Inspection, created: true };
  }

  async delete(id: string, userId: string, isAdmin = false): Promise<void> {
    let query = supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }

    const { error } = await query;

    if (error) throw new Error(`Failed to delete inspection: ${error.message}`);
  }

  async getStatistics(userId: string, scope?: InspectionScope, isAdmin?: boolean): Promise<{
    total: number;
    byClassification: Record<string, number>;
  }> {
    let query = supabase
      .from(this.tableName)
      .select("classification")
      .limit(10_000);

    if (!this.shouldViewAll(scope ?? "mine", isAdmin ?? false)) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch statistics: ${error.message}`);

    const records = (data ?? []) as unknown as { classification: string }[];
    const byClassification: Record<string, number> = {};
    for (const record of records) {
      byClassification[record.classification] = (byClassification[record.classification] || 0) + 1;
    }

    return { total: records.length, byClassification };
  }

  async getDeveloperDatasetPage(filters: DeveloperDatasetFilters): Promise<DeveloperDatasetListResponse> {
    const limit = Math.min(Math.max(Math.trunc(filters.limit || 50), 1), 10_000);
    const offset = Math.max(Math.trunc(filters.offset || 0), 0);

    let query = (supabase
      .from(this.tableName) as any)
      .select(INSPECTION_COLUMNS, { count: "exact" });

    if (filters.meatType?.trim()) {
      query = query.eq("meat_type", filters.meatType.trim());
    }

    if (filters.classification?.trim()) {
      query = query.eq("manual_classification", filters.classification.trim());
    }

    if (filters.inspector?.trim()) {
      query = query.eq("user_id", filters.inspector.trim());
    }

    if (filters.location?.trim()) {
      query = query.ilike("location", `%${filters.location.trim()}%`);
    }

    if (filters.hasImage === true) {
      query = query.not("image_url", "is", null);
    } else if (filters.hasImage === false) {
      query = query.is("image_url", null);
    }

    if (filters.dateFrom?.trim()) {
      query = query.gte("created_at", filters.dateFrom.trim());
    }

    if (filters.dateTo?.trim()) {
      query = query.lte("created_at", filters.dateTo.trim());
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch developer dataset: ${error.message}`);

    return {
      items: (data as unknown as Inspection[]) ?? [],
      total: count ?? 0,
      limit,
      offset,
    };
  }

  private async getByClientSubmissionId(clientSubmissionId: string, userId: string): Promise<Inspection | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(INSPECTION_COLUMNS)
      .eq("client_submission_id", clientSubmissionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch inspection by client submission ID: ${error.message}`);
    return data as unknown as Inspection | null;
  }

  private isDuplicateClientSubmissionError(error: SupabaseWriteError): boolean {
    return error.code === "23505" && error.message.includes("client_submission_id");
  }

  private buildInsertPayload(
    inspection: InspectionInsert,
    userId: string,
    clientSubmissionId: string,
  ): InspectionInsertPayload {
    let payload: InspectionInsertPayload = {
      user_id: userId,
      client_submission_id: clientSubmissionId,
      meat_type: inspection.meat_type,
      classification: inspection.classification,
      manual_classification: inspection.manual_classification ?? inspection.classification,
      confidence_score: inspection.confidence_score,
    };

    if (inspection.captured_at !== undefined) payload.captured_at = inspection.captured_at;
    if (inspection.flagged_deviations !== undefined) payload.flagged_deviations = inspection.flagged_deviations;
    if (inspection.explanation !== undefined) payload.explanation = inspection.explanation;
    if (inspection.image_url !== undefined) payload.image_url = inspection.image_url;
    if (inspection.location !== undefined) payload.location = inspection.location;
    if (inspection.inspector_notes !== undefined) payload.inspector_notes = inspection.inspector_notes;

    payload = mergeInspectionCoordinates(payload, {
      location_latitude: inspection.location_latitude,
      location_longitude: inspection.location_longitude,
    });

    // Compute regulatory_compliance from the three source boolean checks.
    // NULL when pre-scan was skipped; TRUE only when all three pass.
    const hasPreScan =
      inspection.storage_correct != null ||
      inspection.light_color_correct != null ||
      inspection.area_clean != null;
    payload.regulatory_compliance = hasPreScan
      ? (
          (inspection.storage_correct    === true) &&
          (inspection.light_color_correct === true) &&
          (inspection.area_clean          === true)
        )
      : null;

    return mergeInspectionPreScanFields(payload, {
      stall_number: inspection.stall_number,
      meat_inspection_certificate_proof: inspection.meat_inspection_certificate_proof,
      meat_expiry_date: inspection.meat_expiry_date,
      storage_correct: inspection.storage_correct,
      light_color_correct: inspection.light_color_correct,
      light_color_observed: inspection.light_color_observed,
      area_clean: inspection.area_clean,
      inspection_decision_source: inspection.inspection_decision_source,
      protocol_spoiled_reason: inspection.protocol_spoiled_reason,
    });
  }

  async updateManualClassification(
    inspectionId: string,
    manualClassification: Inspection["classification"],
  ): Promise<Inspection> {
    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .update({
        manual_classification: manualClassification,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inspectionId)
      .select(INSPECTION_COLUMNS)
      .single();

    if (error) {
      throw new Error(`Failed to update inspection: ${error.message}`);
    }

    return data as unknown as Inspection;
  }

  async getInAppModelMetrics(): Promise<InAppModelMetrics> {
    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .select("classification, manual_classification, meat_type")
      .range(0, 9_999);

    if (error) throw new Error(`Failed to fetch inspection records for in-app metrics: ${error.message}`);

    const records = (data ?? []) as unknown as Array<{
      classification: Inspection["classification"];
      manual_classification?: Inspection["classification"] | null;
      meat_type: string;
    }>;

    const normalizeClassification = (val: unknown): Inspection["classification"] | null => {
      if (!val || typeof val !== "string") return null;
      const norm = val.trim().toLowerCase();
      if (norm === "not fresh" || norm === "not_fresh" || norm === "notfresh") return "not fresh";
      if (norm === "spoiled") return "spoiled";
      if (norm === "acceptable") return "acceptable";
      if (norm === "warning") return "warning";
      if (norm === "fresh") return "fresh";
      return norm as Inspection["classification"];
    };

    const resolveGroundTruth = (record: {
      classification: Inspection["classification"];
      manual_classification?: Inspection["classification"] | null;
    }): Inspection["classification"] => {
      const normalizedManual = normalizeClassification(record.manual_classification);
      if (normalizedManual) return normalizedManual;
      return normalizeClassification(record.classification) || "fresh";
    };

    const totalEvaluated = records.length;
    let correctlyIdentified = 0;

    const ALL_CLASSES: Array<Inspection["classification"]> = ["fresh", "acceptable", "warning", "not fresh", "spoiled"];
    const meatTypeStats = new Map<string, { total: number; correct: number }>();

    for (const record of records) {
      const predicted = normalizeClassification(record.classification) || "fresh";
      const actual = resolveGroundTruth(record);
      const isCorrect = predicted === actual;

      if (isCorrect) {
        correctlyIdentified += 1;
      }

      const meatType = (record.meat_type || "unknown").trim().toLowerCase();
      const existing = meatTypeStats.get(meatType) ?? { total: 0, correct: 0 };
      existing.total += 1;
      if (isCorrect) existing.correct += 1;
      meatTypeStats.set(meatType, existing);
    }

    const incorrectlyIdentified = totalEvaluated - correctlyIdentified;
    const inAppAccuracy = totalEvaluated > 0 ? correctlyIdentified / totalEvaluated : 0;

    const classBreakdown: InAppClassBreakdown[] = ALL_CLASSES.map((cls) => {
      let modelIdentifiedCount = 0;
      let actualCount = 0;
      let tp = 0;
      let fp = 0;
      let fn = 0;
      let tn = 0;

      for (const record of records) {
        const predicted = normalizeClassification(record.classification) || "fresh";
        const actual = resolveGroundTruth(record);

        const isPredCls = predicted === cls;
        const isActualCls = actual === cls;

        if (isPredCls) modelIdentifiedCount += 1;
        if (isActualCls) actualCount += 1;

        if (isPredCls && isActualCls) tp += 1;
        else if (isPredCls && !isActualCls) fp += 1;
        else if (!isPredCls && isActualCls) fn += 1;
        else tn += 1;
      }

      const accuracy = totalEvaluated > 0 ? (tp + tn) / totalEvaluated : 0;
      const precision = tp + fp > 0 ? tp / (tp + fp) : (actualCount === 0 && modelIdentifiedCount === 0 ? 1 : 0);
      const recall = tp + fn > 0 ? tp / (tp + fn) : (actualCount === 0 ? 1 : 0);
      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      return {
        class: cls,
        modelIdentifiedCount,
        actualCount,
        tp,
        fp,
        fn,
        tn,
        accuracy,
        precision,
        recall,
        f1Score,
      };
    });

    const activeClasses = classBreakdown.filter((item) => item.actualCount > 0 || item.modelIdentifiedCount > 0);
    const classesToAverage = activeClasses.length > 0 ? activeClasses : classBreakdown;

    const sumPrecision = classesToAverage.reduce((acc, item) => acc + item.precision, 0);
    const sumRecall = classesToAverage.reduce((acc, item) => acc + item.recall, 0);

    const inAppPrecision = classesToAverage.length > 0 ? sumPrecision / classesToAverage.length : 1;
    const inAppRecall = classesToAverage.length > 0 ? sumRecall / classesToAverage.length : 1;
    const inAppF1Score =
      inAppPrecision + inAppRecall > 0
        ? (2 * inAppPrecision * inAppRecall) / (inAppPrecision + inAppRecall)
        : 0;

    const meatTypeBreakdown: InAppMeatTypeBreakdown[] = Array.from(meatTypeStats.entries()).map(
      ([meatType, stats]) => ({
        meatType,
        totalCount: stats.total,
        correctCount: stats.correct,
        accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      }),
    );

    return {
      totalEvaluated,
      correctlyIdentified,
      incorrectlyIdentified,
      inAppAccuracy,
      inAppPrecision,
      inAppRecall,
      inAppF1Score,
      classBreakdown,
      meatTypeBreakdown,
    };
  }
}

export const inspectionService = InspectionService.getInstance();
