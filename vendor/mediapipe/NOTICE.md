# MediaPipe Tasks Vision (vendored)

- `vision_bundle.mjs`, `wasm/vision_wasm_internal.{js,wasm}`: @mediapipe/tasks-vision 0.10.14, https://www.npmjs.com/package/@mediapipe/tasks-vision (Apache License 2.0).
- `deeplab_v3.tflite`: MediaPipe DeepLab v3 image segmenter, https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite (Apache License 2.0).

Used by `studio/public/replace.js` to find people in video frames. It runs in the browser; nothing is sent anywhere.
- `pose_landmarker_full.task`: MediaPipe Pose Landmarker (full), https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task (Apache License 2.0). Used by `studio/public/exercise.js` to copy a clip's body movement onto Munaza.
