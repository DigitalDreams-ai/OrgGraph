use std::{
    env,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
};

use tauri::Manager;

struct ApiChild(Mutex<Option<Child>>);

fn should_manage_api() -> bool {
    cfg!(debug_assertions)
        && env::var("ORGUMENTED_DESKTOP_MANAGED_API")
            .map(|value| value != "0")
            .unwrap_or(true)
}

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../.."))
}

fn desktop_api_port() -> String {
    env::var("ORGUMENTED_DESKTOP_API_PORT").unwrap_or_else(|_| "3100".to_string())
}

fn build_windows_path() -> Option<String> {
    let mut entries = env::var_os("PATH")
        .map(|value| env::split_paths(&value).collect::<Vec<_>>())
        .unwrap_or_default();

    if let Some(app_data) = env::var_os("APPDATA") {
        entries.insert(0, PathBuf::from(app_data).join("npm"));
    }
    if let Some(user_profile) = env::var_os("USERPROFILE") {
        entries.insert(0, PathBuf::from(&user_profile).join(".local").join("bin"));
        entries.insert(0, PathBuf::from(user_profile).join(".cargo").join("bin"));
    }

    env::join_paths(entries)
        .ok()
        .and_then(|value| value.into_string().ok())
}

fn spawn_api_child() -> std::io::Result<Child> {
    let mut command = if cfg!(target_os = "windows") {
        let mut command = Command::new("cmd.exe");
        command.args(["/d", "/s", "/c", "pnpm.cmd", "--filter", "api", "start"]);
        command
    } else {
        let mut command = Command::new("pnpm");
        command.args(["--filter", "api", "start"]);
        command
    };

    command
        .current_dir(workspace_root())
        .env("PORT", desktop_api_port())
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    if cfg!(target_os = "windows") {
        if let Some(path) = build_windows_path() {
            command.env("PATH", path);
        }
        command.env(
            "ComSpec",
            env::var("ComSpec").unwrap_or_else(|_| "C:\\Windows\\System32\\cmd.exe".to_string()),
        );
        command.env(
            "SystemRoot",
            env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string()),
        );
    }

    command.spawn()
}

fn terminate_api_child(app: &tauri::AppHandle) {
    let state = app.state::<ApiChild>();
    let mut child_slot = state
        .0
        .lock()
        .expect("failed to lock desktop-managed api child state");
    if let Some(child) = child_slot.as_mut() {
        let _ = child.kill();
    }
    *child_slot = None;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let api_child = if should_manage_api() {
        Some(spawn_api_child().expect("failed to launch desktop-managed api child"))
    } else {
        None
    };

    let app = tauri::Builder::default()
        .manage(ApiChild(Mutex::new(api_child)))
        .build(tauri::generate_context!())
        .expect("error while building orgumented desktop");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            terminate_api_child(app_handle);
        }
    });
}
