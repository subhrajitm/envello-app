// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

// ── macOS: grant WKWebView media-capture permission ────────────────────────────────────────────
//
// WRY already attaches its own WKUIDelegate to the WKWebView.  Replacing it would
// break WRY's context-menu / drag-drop handling and crash the app.
//
// Instead we ADD our requestMediaCapturePermission implementation directly to
// WRY's existing delegate class at runtime (safe to do after a class is registered).
// class_addMethod returns false and is a no-op if the method already exists.
#[cfg(target_os = "macos")]
mod macos_media {
    use std::ffi::{c_char, c_void};

    type Id  = *mut c_void;
    type Sel = *mut c_void;

    #[link(name = "objc", kind = "dylib")]
    extern "C" {
        fn sel_registerName(name: *const c_char) -> Sel;
        fn object_getClass(obj: Id) -> Id;
        fn class_addMethod(cls: Id, name: Sel, imp: unsafe extern "C" fn(), types: *const c_char) -> bool;
        fn objc_getProtocol(name: *const c_char) -> Id;
        fn class_addProtocol(cls: Id, protocol: Id) -> bool;
        fn objc_msgSend(receiver: Id, sel: Sel, ...) -> Id;
    }

    // ObjC helper — defined in src/media_helper.m, compiled via build.rs.
    // Calling the block from ObjC lets the compiler emit the correct PAC-authenticated
    // `blraa` branch on Apple Silicon instead of Rust's plain `blr`, which would
    // trigger a Pointer Authentication fault and crash the app.
    extern "C" {
        fn envello_grant_media_permission(handler: Id);
    }

    /// Called by WKWebView when the page requests microphone / speech-recognition access.
    unsafe extern "C" fn grant_media(
        _: Id, _: Sel,
        _: Id,      // WKWebView*
        _: Id,      // WKSecurityOrigin*
        _: Id,      // WKFrameInfo*
        _: usize,   // WKMediaCaptureType (NSUInteger)
        handler: Id // void (^)(WKPermissionDecision)
    ) {
        if handler.is_null() { return; }
        envello_grant_media_permission(handler);
    }

    pub fn patch_delegate(window: &tauri::WebviewWindow) {
        // Type encoding for the selector:
        //   v  = void (return)   @  = self (id)   :  = SEL
        //   @  = WKWebView*      @  = WKSecurityOrigin*   @  = WKFrameInfo*
        //   Q  = WKMediaCaptureType (NSUInteger = u64)    @  = handler block (id)
        const TYPES: &[u8] = b"v@:@@@Q@\0";
        const SEL_NAME: &[u8] =
            b"webView:requestMediaCapturePermissionForOrigin:initiatedByFrame:type:decisionHandler:\0";

        let _ = window.with_webview(|webview| unsafe {
            let wv = webview.inner() as Id;
            if wv.is_null() { return; }

            // ── Step 1: get WRY's existing UIDelegate (must not replace it) ──
            let sel_delegate: Sel = sel_registerName(b"UIDelegate\0".as_ptr() as _);
            let get_delegate: unsafe extern "C" fn(Id, Sel) -> Id =
                std::mem::transmute(objc_msgSend as unsafe extern "C" fn(Id, Sel, ...) -> Id);
            let delegate = get_delegate(wv, sel_delegate);
            if delegate.is_null() { return; }

            // ── Step 2: inject our method into the delegate's class ──
            // class_addMethod is a no-op (returns false) if the method already exists.
            let cls = object_getClass(delegate);
            if cls.is_null() { return; }

            let media_sel: Sel = sel_registerName(SEL_NAME.as_ptr() as _);
            class_addMethod(
                cls,
                media_sel,
                std::mem::transmute(
                    grant_media as unsafe extern "C" fn(Id, Sel, Id, Id, Id, usize, Id),
                ),
                TYPES.as_ptr() as _,
            );

            // Ensure the class formally conforms to WKUIDelegate so WKWebView
            // routes the permission call to our newly added method.
            let proto = objc_getProtocol(b"WKUIDelegate\0".as_ptr() as _);
            if !proto.is_null() {
                class_addProtocol(cls, proto);
            }
        });
    }
}

fn main() {
    tauri::Builder::default()
        // ── Reliability ──────────────────────────────────────────────────────
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        // ── Core plugins ─────────────────────────────────────────────────────
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // ── New capabilities ─────────────────────────────────────────────────
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_stronghold::Builder::new(|password| {
            // Derive a 32-byte vault key from the password using Argon2id.
            // The password is the user's Supabase UID — unique per user, never leaves the device.
            use argon2::{Argon2, Params, Algorithm, Version};
            let params = Params::new(65536, 3, 1, Some(32))
                .expect("Valid Argon2 params");
            let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
            let mut key = vec![0u8; 32];
            // Static salt scoped to the app — acceptable since the password is already
            // a random UUID (Supabase UID) rather than a user-typed password.
            argon2.hash_password_into(password.as_bytes(), b"envello-vault-v1", &mut key)
                .expect("Argon2 key derivation failed");
            key
        }).build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_os::init())
        // ── App setup ────────────────────────────────────────────────────────
        .setup(|app| {
            // Inject the media-capture grant into WRY's existing WKUIDelegate.
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                macos_media::patch_delegate(&window);
            }

            // System tray
            let show_item = MenuItem::with_id(app, "show", "Open Envello", true, None::<&str>)?;
            let new_note_item =
                MenuItem::with_id(app, "new-note", "New Note", true, None::<&str>)?;
            let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Envello", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &new_note_item, &separator, &quit_item])?;

            TrayIconBuilder::new()
                .tooltip("Envello")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "new-note" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("tray://new-note", ());
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
