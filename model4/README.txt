Primary MobileNetV3Small final deployment model

ONNX asset used by the application's primary MobileNetV3 analysis selection.
Added September 18, 2026.

Input: 224x224 RGB image prepared with the processed HSV/LAB ROI pipeline.
Output labels, in order: fresh, not fresh, spoiled.
Validation set: 466 images; accuracy: 0.9077; macro F1: 0.8929.
Runtime: ONNX Runtime Web.
