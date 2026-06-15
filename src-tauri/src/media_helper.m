#import <WebKit/WebKit.h>

// Called from Rust's grant_media delegate method.
// Objective-C handles PAC-authenticated block invocation automatically;
// calling the block directly from Rust via transmute crashes on Apple Silicon
// because Rust emits `blr` but ARM64e requires `blraa` for signed function pointers.
void envello_grant_media_permission(void (^handler)(WKPermissionDecision)) {
    if (handler) {
        handler(WKPermissionDecisionGrant);
    }
}
