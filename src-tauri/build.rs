fn main() {
    #[cfg(target_os = "macos")]
    cc::Build::new()
        .file("src/media_helper.m")
        .flag("-fobjc-arc")
        .compile("media_helper");

    tauri_build::build()
}