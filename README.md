# kortex

Dynamic resolution switching based on the active process.

## Description

kortex is a utility that monitors your active windows and automatically adjusts your monitor's resolution and refresh rate based on pre-defined profiles. This is particularly useful for gamers who want specific settings for different games without manual switching.

## How it works

The application consists of a Rust-based backend (Tauri) that monitors process changes using the **`SetWinEventHook`** Windows API. By listening for the `EVENT_SYSTEM_FOREGROUND` event, kortex can instantly detect when you switch focus between windows without the overhead of constant polling.

When a recognized process (e.g., a specific game EXE) becomes the active window, kortex applies the resolution and refresh rate settings you've configured for that profile. When you tab out or close the process, it reverts to your default desktop settings after a configurable delay.

## Screenshots

![Res](https://i.nuuls.com/uv_fI.png)
*Manage resolution profiles for your games.*

![Mouse Lock](https://i.nuuls.com/qcstH.png)
*Configure mouse lock behavior.*

![Manual](https://i.nuuls.com/_PUcI.png)
*Manual resolution change.*

![Settings](https://i.nuuls.com/zwc57.png)
*Basic settings.*

## Build Yourself

To build kortex from source, ensure you have [Rust](https://rustup.rs/) and [Bun](https://bun.sh/) installed.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/teyd/kortex.git
    cd kortex
    ```

2.  **Install dependencies**:
    ```bash
    bun install
    ```

3.  **Run in development**:
    ```bash
    bun tauri dev
    ```

4.  **Build the portable executable**:
    ```bash
    bun tauri build
    ```

## License

This project is licensed under the [MIT License](LICENSE).
