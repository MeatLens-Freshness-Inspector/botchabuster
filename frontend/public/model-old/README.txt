MobileNetV3 ONNX model placement

Put your trained ONNX file in one of these paths (first existing path is used):

1. frontend/public/model/meatlens_mobilenetv3small_cnn_only.onnx   (recommended)
2. frontend/public/models/mobilenetv3_meat/meatlens_mobilenetv3small_cnn_only.onnx
3. frontend/public/models/mobilenetv3_meat/model.onnx

Optional overrides:
- Set VITE_ONNX_MODEL_PATH to an absolute web path, e.g.
  VITE_ONNX_MODEL_PATH=/model/meatlens_mobilenetv3small_cnn_only.onnx
- Set VITE_MODEL_METADATA_PATH to an absolute metadata path if needed.
- Set VITE_ONNX_CLASS_LABELS only if your model output order differs.

Notes:
- Expected metadata label order is: fresh, not fresh, spoiled.
- The app applies metadata-driven preprocessing and defaults to MobileNetV3
  preprocessing if metadata cannot be loaded.
- If no ONNX file is found, the app falls back to rule-based classification.
