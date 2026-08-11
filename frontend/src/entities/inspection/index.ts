export {
  FRESHNESS_CLASSIFICATIONS,
  MEAT_TYPES,
  type AnalysisResult,
  type ApiConfig,
  type FreshnessClassification,
  type Inspection,
  type InspectionDecisionSource,
  type InspectionInsert,
  type MeatType,
} from "./model/types";
export {
  PROTOCOL_SPOILED_REASON,
  buildProtocolSpoiledAnalysisResult,
  createEmptyPreScanForm,
  getInspectionDecisionSource,
  hasProtocolFailure,
  isPreScanChecklistComplete,
  toInspectionPreScanPayload,
  type InspectionPreScanChoice,
  type InspectionPreScanForm,
} from "./model/pre-scan";
export {
  formatCoordinateValue,
  formatInspectionCoordinateLabel,
  formatInspectionLocationLabel,
  getCoordinateStatusText,
  requestCurrentCoordinates,
  type CoordinateCaptureStatus,
  type InspectionCoordinates,
} from "./model/location";
