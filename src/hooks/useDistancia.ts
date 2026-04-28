import { useState, useEffect, useRef } from "react"

interface DistanciaResult {
  distancia: string | null
  duracion: string | null
  loading: boolean
}

const geocodeCache = new Map<string, { lat: number; lon: number } | null>()

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { "Accept-Language": "es", "User-Agent": "Panchis POS App" } }
    )
    const data = await res.json()
    const result = data.length > 0 ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null
    geocodeCache.set(address, result)
    return result
  } catch {
    return null
  }
}

export function useDistancia(destino: string): DistanciaResult {
  const [result, setResult] = useState<DistanciaResult>({ distancia: null, duracion: null, loading: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!destino || destino.trim().length < 6) {
      setResult({ distancia: null, duracion: null, loading: false })
      return
    }

    setResult(prev => ({ ...prev, loading: true }))

    timerRef.current = setTimeout(async () => {
      const localAddress = localStorage.getItem("panchis_local_address")
      if (!localAddress) {
        setResult({ distancia: null, duracion: null, loading: false })
        return
      }

      const [origin, destination] = await Promise.all([
        geocode(localAddress),
        geocode(destino.trim()),
      ])

      if (!origin || !destination) {
        setResult({ distancia: null, duracion: null, loading: false })
        return
      }

      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`
        )
        const data = await res.json()
        if (data.routes?.length > 0) {
          const route = data.routes[0]
          const km = (route.distance / 1000).toFixed(1)
          const min = Math.round(route.duration / 60)
          setResult({ distancia: `${km} km`, duracion: `~${min} min`, loading: false })
        } else {
          setResult({ distancia: null, duracion: null, loading: false })
        }
      } catch {
        setResult({ distancia: null, duracion: null, loading: false })
      }
    }, 800)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [destino])

  return result
}
