import { useState, useCallback } from "react"

interface DistanciaResult {
  distancia: string | null
  duracion: string | null
  loading: boolean
  error: string | null
}

interface UseDistanciaResult extends DistanciaResult {
  buscar: (destino: string) => Promise<void>
  reset: () => void
}

const geocodeCache = new Map<string, { lat: number; lon: number }>()

// Photon (komoot) — OSM-based geocoder with friendlier rate limits than Nominatim
async function geocodePhoton(
  query: string,
  bias?: { lat: number; lon: number; scale?: number }
): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = `photon:${query}|${bias?.lat ?? ""},${bias?.lon ?? ""}|${bias?.scale ?? ""}`
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!

  try {
    const params = new URLSearchParams({ q: query, limit: "1" })
    if (bias) {
      params.set("lat", bias.lat.toString())
      params.set("lon", bias.lon.toString())
      params.set("location_bias_scale", (bias.scale ?? 0.5).toString())
    }
    const res = await fetch(`https://photon.komoot.io/api/?${params}`)
    if (!res.ok) {
      console.warn(`[geocode] Photon HTTP ${res.status} for "${query}"`)
      return null
    }
    const data = await res.json()
    if (data.features?.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates
      const result = { lat, lon }
      geocodeCache.set(cacheKey, result)
      return result
    }
    return null
  } catch (e) {
    console.warn(`[geocode] Photon error for "${query}":`, e)
    return null
  }
}

function expandAbbreviations(address: string): string {
  return address
    .replace(/\bJuan B\b\.?/gi, "Juan Bautista")
    .replace(/\bJ\. B\.\b/gi, "Juan Bautista")
    .replace(/\bAv\b\.?/gi, "Avenida")
    .replace(/\bGral\b\.?/gi, "General")
    .replace(/\bPte\b\.?/gi, "Presidente")
    .replace(/\bDr\b\.?/gi, "Doctor")
}

export async function geocodeOrigin(address: string, ciudad: string): Promise<{ lat: number; lon: number } | null> {
  const expanded = expandAbbreviations(address)
  const attempts = [
    address,
    `${address}, ${ciudad}`,
    `${address}, Argentina`,
    expanded,
    `${expanded}, ${ciudad}`,
    `${expanded}, Argentina`,
  ]

  for (let i = 0; i < attempts.length; i++) {
    const r = await geocodePhoton(attempts[i])
    if (r) {
      console.log(`[useDistancia] origin geocoded on attempt #${i + 1} ("${attempts[i]}"):`, r)
      return r
    }
  }
  console.warn(`[useDistancia] origin geocoding failed for: "${address}"`)
  return null
}

function getCachedOrigin(address: string): { lat: number; lon: number } | null {
  const raw = localStorage.getItem("panchis_local_coords")
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { address: string; lat: number; lon: number }
    if (parsed.address === address) return { lat: parsed.lat, lon: parsed.lon }
  } catch {}
  return null
}

function setCachedOrigin(address: string, coords: { lat: number; lon: number }) {
  localStorage.setItem("panchis_local_coords", JSON.stringify({ address, ...coords }))
}

export function useDistancia(): UseDistanciaResult {
  const [result, setResult] = useState<DistanciaResult>({ distancia: null, duracion: null, loading: false, error: null })

  const reset = useCallback(() => {
    setResult({ distancia: null, duracion: null, loading: false, error: null })
  }, [])

  const buscar = useCallback(async (destino: string) => {
    if (!destino || destino.trim().length < 3) {
      setResult({ distancia: null, duracion: null, loading: false, error: "Ingresá una dirección" })
      return
    }

    setResult({ distancia: null, duracion: null, loading: true, error: null })

    const localAddress = localStorage.getItem("panchis_local_address")
    if (!localAddress) {
      setResult({ distancia: null, duracion: null, loading: false, error: "Configurá tu dirección de origen en Configuración" })
      return
    }

    const ciudad = localStorage.getItem("panchis_ciudad") ?? "Buenos Aires"
    let origin = getCachedOrigin(localAddress)
    if (!origin) {
      origin = await geocodeOrigin(localAddress, ciudad)
      if (origin) setCachedOrigin(localAddress, origin)
    }
    if (!origin) {
      setResult({ distancia: null, duracion: null, loading: false, error: "No se encontró tu dirección de origen (revisá en Configuración)" })
      return
    }

    const commaIdx = localAddress.lastIndexOf(",")
    const originCity = commaIdx > 0 ? localAddress.slice(commaIdx + 1).trim() : ciudad
    const dest = destino.trim()

    // Search destination biased to origin (location_bias_scale=2 favors close results)
    const destAttempts = [
      `${dest}, ${originCity}`,
      `${dest}, ${ciudad}`,
      dest,
    ]

    let destination: { lat: number; lon: number } | null = null
    for (let i = 0; i < destAttempts.length; i++) {
      const r = await geocodePhoton(destAttempts[i], { ...origin, scale: 2 })
      if (r) {
        console.log(`[useDistancia] destination geocoded #${i + 1} ("${destAttempts[i]}"):`, r)
        destination = r
        break
      }
    }

    if (!destination) {
      setResult({ distancia: null, duracion: null, loading: false, error: "No se encontró la dirección ingresada" })
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
        const min = Math.round((route.duration / 60) * 0.75)
        setResult({ distancia: `${km} km`, duracion: `~${min} min`, loading: false, error: null })
      } else {
        setResult({ distancia: null, duracion: null, loading: false, error: "No se pudo calcular la ruta" })
      }
    } catch {
      setResult({ distancia: null, duracion: null, loading: false, error: "Error al calcular ruta" })
    }
  }, [])

  return { ...result, buscar, reset }
}
