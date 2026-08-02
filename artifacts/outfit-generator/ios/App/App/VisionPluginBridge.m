// VisionPluginBridge.m
// ObjC bridge — registers VisionPlugin with the Capacitor runtime.
// Add both VisionPlugin.swift and this file to the Xcode "Compile Sources" build phase.

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(VisionPlugin, "VisionPlugin",
    CAP_PLUGIN_METHOD(analyzeImage, CAPPluginReturnPromise);
)
