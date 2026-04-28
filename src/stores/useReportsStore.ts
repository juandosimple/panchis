import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import { DailySales, ZoneSales } from "../types"

interface ReportsState {
  dailySales: DailySales[]
  zoneSales: ZoneSales[]
  totalSales: number
  loading: boolean
  loadReports: () => Promise<void>
}

export const useReportsStore = create<ReportsState>((set) => ({
  dailySales: [],
  zoneSales: [],
  totalSales: 0,
  loading: false,

  loadReports: async () => {
    set({ loading: true })
    try {
      const [dailySales, zoneSales, totalSales] = await Promise.all([
        invoke<DailySales[]>("get_daily_sales"),
        invoke<ZoneSales[]>("get_sales_by_zone"),
        invoke<number>("get_total_sales"),
      ])
      set({ dailySales, zoneSales, totalSales })
    } finally {
      set({ loading: false })
    }
  },
}))
