import { useState, useCallback } from "react"
import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { ask } from "@tauri-apps/plugin-dialog"

interface UpdaterState {
  checking: boolean
  downloading: boolean
  available: boolean
  version: string | null
  error: string | null
}

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    checking: false,
    downloading: false,
    available: false,
    version: null,
    error: null,
  })

  const checkForUpdate = useCallback(async (silent = false) => {
    setState(s => ({ ...s, checking: true, error: null }))
    try {
      const update = await check()
      if (!update) {
        setState({ checking: false, downloading: false, available: false, version: null, error: null })
        return false
      }

      setState(s => ({ ...s, checking: false, available: true, version: update.version }))

      const yes = await ask(
        `Hay una nueva versión disponible: ${update.version}\n\n${update.body ?? ""}\n\n¿Querés instalarla ahora?`,
        { title: "Actualización disponible", kind: "info", okLabel: "Instalar", cancelLabel: "Después" }
      )
      if (!yes) return true

      setState(s => ({ ...s, downloading: true }))
      await update.downloadAndInstall()
      await relaunch()
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error("[useUpdater]", msg)
      setState({ checking: false, downloading: false, available: false, version: null, error: msg })
      if (!silent) {
        await ask(`Error al chequear actualizaciones:\n${msg}`, { title: "Error", kind: "error", okLabel: "OK", cancelLabel: "" })
      }
      return false
    }
  }, [])

  return { ...state, checkForUpdate }
}
