fn main() {
    #[cfg(target_os = "macos")]
    {
        cc::Build::new()
            .file("src/media_helper.m")
            .flag("-fobjc-arc")
            .compile("media_helper");

        // Sign the dev binary with entitlements after each build so macOS TCC
        // grants microphone/speech-recognition access instead of crashing.
        // Only runs when cargo is invoked (not during bundle packaging where
        // Tauri applies its own signing with a real identity).
        sign_dev_binary_macos();
    }

    tauri_build::build()
}

#[cfg(target_os = "macos")]
fn sign_dev_binary_macos() {
    use std::path::PathBuf;

    // OUT_DIR is  …/target/<profile>/build/<crate>/out  — walk up to target/<profile>
    let out_dir = std::env::var("OUT_DIR").unwrap_or_default();
    let profile = std::env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());

    // Resolve target dir: go from OUT_DIR up until we find target/<profile>
    let binary = PathBuf::from(&out_dir)
        .ancestors()
        .find(|p| p.ends_with(&profile))
        .map(|p| p.join("envello"));

    let Some(binary) = binary else { return };
    if !binary.exists() { return }

    // Entitlements file lives at the crate root (next to Cargo.toml / build.rs)
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
    let entitlements = PathBuf::from(&manifest_dir).join("entitlements.plist");
    if !entitlements.exists() { return }

    let status = std::process::Command::new("codesign")
        .args([
            "--force",
            "--sign", "-",
            "--entitlements", entitlements.to_str().unwrap(),
            binary.to_str().unwrap(),
        ])
        .status();

    if let Ok(s) = status {
        if !s.success() {
            eprintln!("cargo:warning=codesign failed for dev binary — mic may crash");
        }
    }
}