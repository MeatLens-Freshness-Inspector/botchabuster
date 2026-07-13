# Model Ensemble Formula

Scope: use `MobileNetV3-small seed123/model2` and `ResNet50` only.

## Formula

The two models do not share the same label space, so the ensemble should be done at the score level instead of hard voting on classes.

1. Run each model with its own preprocessing contract.
   - `MobileNetV3-small seed123/model2` keeps the current ROI/segmented-center-crop path.
   - `ResNet50` keeps its own ResNet preprocessing path.

2. Convert each model output into an ordinal freshness score in the range `[0, 1]`.

   MobileNetV3-small:

   ```text
   s_m = 1.00 * P(fresh) + 0.50 * P(not fresh) + 0.00 * P(spoiled)
   ```

   ResNet50:

   ```text
   s_r = 1.00 * P(fresh) + 0.67 * P(acceptable) + 0.33 * P(warning) + 0.00 * P(spoiled)
   ```

3. Blend the two scores with fixed weights:

   ```text
   S = 0.85 * s_m + 0.15 * s_r
   ```

4. Map the final score back to a label:

   ```text
   S >= 0.80 -> fresh
   0.60 <= S < 0.80 -> acceptable
   0.40 <= S < 0.60 -> warning
   0.20 <= S < 0.40 -> not fresh
   S < 0.20 -> spoiled
   ```

## Why this formula

- The models were trained with different output vocabularies, so weighted score fusion is more stable than hard voting.
- Freshness is an ordered problem, so an ordinal score preserves the distance between classes better than a simple class vote.
- The MobileNetV3-small seed123/model2 branch gets the dominant weight because the ResNet50 branch is the less reliable one here.
- ResNet50 still contributes, but only as a smaller correction signal instead of a near-equal vote.
- The existing low-confidence warning behavior can still sit on top of this ensemble, so uncertain cases remain conservative.

## Practical Note

This is a provisional ensemble for the currently available `ResNet50` and `MobileNetV3-small seed123/model2` artifacts. It stays off by default and should be enabled only when the ensemble path is being evaluated. If a `MobileNetV2` artifact is added later, the weights and score mapping should be re-fit instead of copied over unchanged.
