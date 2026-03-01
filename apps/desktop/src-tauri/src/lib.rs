use std::{
    env,
    fs,
    io::{Error, ErrorKind},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
};

use serde::Deserialize;
use tauri::{path::BaseDirectory, Manager};

struct ApiChild(Mutex<Option<Child>>);

#[derive(Deserialize)]
struct BundledRuntimeManifest {
    #[serde(rename = "apiEntry")]
    api_entry: String,
    #[serde(rename = "configEntry")]
    config_entry: String,
    #[serde(rename = "nodeBinary")]
    node_binary: String,
}

fn manifest_resource_path(entry: &str) -> String {
    entry.replace('\\', "/")
}

fn should_manage_api() -> bool {
    env::var("ORGUMENTED_DESKTOP_MANAGED_API")
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

fn spawn_development_api_child() -> std::io::Result<Child> {
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

fn resolve_resource_path(
    app: &tauri::AppHandle,
    relative_path: &str,
) -> std::io::Result<PathBuf> {
    app.path()
        .resolve(relative_path, BaseDirectory::Resource)
        .map_err(|error| Error::new(ErrorKind::NotFound, error.to_string()))
}

fn bundled_runtime_manifest(app: &tauri::AppHandle) -> std::io::Result<BundledRuntimeManifest> {
    let manifest_path = resolve_resource_path(app, "runtime/manifest.json")?;
    let manifest_raw = fs::read_to_string(&manifest_path)?;
    serde_json::from_str::<BundledRuntimeManifest>(&manifest_raw).map_err(|error| {
        Error::new(
            ErrorKind::InvalidData,
            format!(
                "failed to parse packaged runtime manifest at {}: {}",
                manifest_path.display(),
                error
            ),
        )
    })
}

fn spawn_packaged_api_child(app: &tauri::AppHandle) -> std::io::Result<Child> {
    let manifest = bundled_runtime_manifest(app)?;
    let node_path = resolve_resource_path(
        app,
        &format!("runtime/node/{}", manifest_resource_path(&manifest.node_binary)),
    )?;
    let api_root = resolve_resource_path(app, "runtime/api")?;
    let config_path = resolve_resource_path(
        app,
        &format!("runtime/{}", manifest_resource_path(&manifest.config_entry)),
    )?;
    let api_entry = resolve_resource_path(
        app,
        &format!("runtime/{}", manifest_resource_path(&manifest.api_entry)),
    )?;
    if !api_entry.exists() {
        return Err(Error::new(
            ErrorKind::NotFound,
            format!("packaged api entry missing at {}", api_entry.display()),
        ));
    }
    if !config_path.exists() {
        return Err(Error::new(
            ErrorKind::NotFound,
            format!("packaged api config missing at {}", config_path.display()),
        ));
    }
    let relative_api_entry = api_entry.strip_prefix(&api_root).map_err(|_| {
        Error::new(
            ErrorKind::InvalidData,
            format!(
                "packaged api entry {} is not under runtime api root {}",
                api_entry.display(),
                api_root.display()
            ),
        )
    })?;

    let mut command = Command::new(node_path);
    command
        .arg(relative_api_entry)
        .current_dir(api_root)
        .env("ORGUMENTED_CONFIG_PATH", config_path)
        .env("PORT", desktop_api_port())
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    command.spawn()
}

fn spawn_api_child(app: &tauri::AppHandle) -> std::io::Result<Child> {
    if cfg!(debug_assertions) {
        spawn_development_api_child()
    } else {
        spawn_packaged_api_child(app)
    }
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
    let app = tauri::Builder::default()
        .manage(ApiChild(Mutex::new(None)))
        .setup(|app| {
            if should_manage_api() {
                let child = spawn_api_child(&app.handle())
                    .map_err(|error| -> Box<dyn std::error::Error> { Box::new(error) })?;
                let state = app.state::<ApiChild>();
                let mut child_slot = state
                    .0
                    .lock()
                    .expect("failed to lock desktop-managed api child state");
                *child_slot = Some(child);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building orgumented desktop");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            terminate_api_child(app_handle);
        }
    });
}
