export interface InspectionResultData {
  classification: "fresh" | "not fresh" | "spoiled" | "acceptable" | "warning";
  confidence_score: number;
  flagged_deviations: string[];
  explanation: string;
}

export class InspectionResult {
  readonly classification: string;
  readonly confidence_score: number;
  readonly flagged_deviations: string[];
  readonly explanation: string;

  constructor(data: InspectionResultData) {
    this.classification = data.classification;
    this.confidence_score = data.confidence_score;
    this.flagged_deviations = data.flagged_deviations;
    this.explanation = data.explanation;
  }

  toJSON(): InspectionResultData {
    return {
      classification: this.classification as InspectionResultData["classification"],
      confidence_score: this.confidence_score,
      flagged_deviations: this.flagged_deviations,
      explanation: this.explanation,
    };
  }
}
