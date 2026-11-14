import { useEffect, useRef, useState } from "react"
import { Animated, Easing, StyleSheet, View } from "react-native"
import { useIsFetching } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { t } from "./theme"

/** Thanh tải mảnh màu cam ở mép trên, chỉ hiện khi mạng chậm (đang tải quá 350 ms). */
export function FetchBar() {
  const busy = useIsFetching() > 0
  const insets = useSafeAreaInsets()
  const [show, setShow] = useState(false)
  const x = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!busy) { setShow(false); return }
    const id = setTimeout(() => setShow(true), 350)
    return () => clearTimeout(id)
  }, [busy])
  useEffect(() => {
    if (!show) return
    x.setValue(0)
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [show, x])
  if (!show) return null
  return (
    <View pointerEvents="none" style={[s.track, { top: insets.top }]}>
      <Animated.View style={[s.bar, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-160, 420] }) }] }]} />
    </View>
  )
}
const s = StyleSheet.create({
  track: { position: "absolute", left: 0, right: 0, height: 3, overflow: "hidden", zIndex: 50 },
  bar: { width: 160, height: 3, borderRadius: 2, backgroundColor: t.gold },
})
