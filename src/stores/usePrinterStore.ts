import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import { Order } from "../types"

const FALLBACK_PORTS = ["COM3", "COM4", "COM5", "/dev/ttyUSB0", "/dev/ttyACM0", "/dev/tty.usbserial", "/dev/cu.usbserial", "/dev/cu.IMPTER19"]

interface PrinterState {
  ports: string[]
  selectedPort: string
  loadPorts: () => Promise<void>
  setSelectedPort: (port: string) => void
  printOrder: (order: Order, metodoPago?: string) => Promise<void>
}

export const usePrinterStore = create<PrinterState>((set, get) => ({
  ports: FALLBACK_PORTS,
  selectedPort: FALLBACK_PORTS[0],

  loadPorts: async () => {
    try {
      const ports = await invoke<string[]>("get_printer_ports")
      if (ports.length > 0) {
        set({ ports, selectedPort: ports[0] })
      }
    } catch {
      // keep fallback ports
    }
  },

  setSelectedPort: (selectedPort) => set({ selectedPort }),

  printOrder: async (order, metodoPago = "Efectivo") => {
    const { selectedPort, ports } = get()
    const portsToTry = selectedPort ? [selectedPort, ...ports.filter((p) => p !== selectedPort)] : ports

    for (const port of portsToTry) {
      try {
        await invoke("print_order", {
          numero: order.id,
          cliente: order.cliente,
          items: order.items,
          total: order.precio,
          zona: order.zona,
          hora: order.hora,
          metodoPago,
          port,
        })
        return
      } catch {
        continue
      }
    }
    throw new Error("No se pudo conectar a la impresora. Verifica el puerto.")
  },
}))
