import { useCameraCapture } from "../model/camera-session";
import { CameraCaptureView } from "./camera-capture-view";
import type { CameraCaptureProps } from "../model/types";

export function CameraCapture(props: CameraCaptureProps) {
  const viewProps = useCameraCapture(props);

  return <CameraCaptureView {...viewProps} />;
}
