import { useCallback } from 'react'

export function useFileToDataUrl(onLoad) {
  return useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onLoad(ev.target.result)
    reader.readAsDataURL(file)
  }, [onLoad])
}