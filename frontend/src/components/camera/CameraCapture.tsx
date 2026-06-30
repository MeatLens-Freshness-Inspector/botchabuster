import { CameraCaptureView } from "./CameraCaptureView";
import { useCameraCapture } from "./useCameraCapture";
import type { CameraCaptureProps } from "./types";

export function CameraCapture(props: CameraCaptureProps) {
  const viewProps = useCameraCapture(props);

  return <CameraCaptureView {...viewProps} />;
}
