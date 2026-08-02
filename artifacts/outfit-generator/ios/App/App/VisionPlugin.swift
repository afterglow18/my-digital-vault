// VisionPlugin.swift
// Capacitor plugin exposing iOS Vision framework to the web layer.
// Runs VNClassifyImageRequest + VNRecognizeTextRequest on a background queue.
// Falls back silently to empty arrays on any error.

import Capacitor
import Vision
import UIKit

@objc(VisionPlugin)
public class VisionPlugin: CAPPlugin {

    @objc func analyzeImage(_ call: CAPPluginCall) {
        guard let dataUrl = call.getString("dataUrl") else {
            call.resolve(["labels": [], "text": []])
            return
        }

        // Strip "data:image/...;base64," prefix
        let parts = dataUrl.components(separatedBy: ",")
        guard parts.count == 2,
              let data = Data(base64Encoded: parts[1]),
              let uiImage = UIImage(data: data),
              let cgImage = uiImage.cgImage
        else {
            call.resolve(["labels": [], "text": []])
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            var labels: [String] = []
            var texts:  [String] = []

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            let group   = DispatchGroup()

            // ── Classification ───────────────────────────────────────────────
            let classifyReq = VNClassifyImageRequest()
            group.enter()
            DispatchQueue.global(qos: .userInitiated).async {
                defer { group.leave() }
                do {
                    try handler.perform([classifyReq])
                    if let results = classifyReq.results as? [VNClassificationObservation] {
                        labels = results
                            .filter { $0.confidence >= 0.3 }
                            .map    { $0.identifier }
                    }
                } catch { /* fall through */ }
            }

            // ── Text recognition ─────────────────────────────────────────────
            let textReq = VNRecognizeTextRequest()
            textReq.recognitionLevel = .accurate
            group.enter()
            DispatchQueue.global(qos: .userInitiated).async {
                defer { group.leave() }
                do {
                    let h2 = VNImageRequestHandler(cgImage: cgImage, options: [:])
                    try h2.perform([textReq])
                    if let results = textReq.results as? [VNRecognizedTextObservation] {
                        texts = results.compactMap { $0.topCandidates(1).first?.string }
                    }
                } catch { /* fall through */ }
            }

            group.wait()

            DispatchQueue.main.async {
                call.resolve(["labels": labels, "text": texts])
            }
        }
    }
}
