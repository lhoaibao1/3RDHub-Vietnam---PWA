import { StyleSheet, View } from "react-native"
import Svg, { Circle, Line } from "react-native-svg"

// Nền đầu tab Tôi (owner, 2026-11-15): logo 3RDHub chìm + mô hình mạng lưới (network) — một nút trung tâm (HUB) nối ra
// các tầng publisher. Toạ độ theo khung 400 x 300, kéo giãn theo bề rộng màn hình.
const HUB: [number, number] = [200, 118]
const L1: [number, number][] = [[92, 62], [318, 58], [58, 168], [346, 172], [132, 232], [276, 236]]
const L2: [number, number, number][] = [[24, 28, 0], [150, 14, 0], [262, 12, 1], [384, 22, 1], [8, 118, 2], [14, 232, 2], [392, 112, 3], [388, 244, 3], [70, 284, 4], [190, 290, 4], [226, 288, 5], [336, 286, 5]]
const CROSS: [number, number][] = [[0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [0, 1]]

export function NetworkBg() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        {CROSS.map(([a, b], i) => <Line key={`c${i}`} x1={L1[a][0]} y1={L1[a][1]} x2={L1[b][0]} y2={L1[b][1]} stroke="#fff" strokeOpacity={0.1} strokeWidth={1} strokeDasharray="3 5" />)}
        {L2.map(([x, y, p], i) => <Line key={`o${i}`} x1={x} y1={y} x2={L1[p][0]} y2={L1[p][1]} stroke="#fff" strokeOpacity={0.14} strokeWidth={1} />)}
        {L1.map(([x, y], i) => <Line key={`l${i}`} x1={HUB[0]} y1={HUB[1]} x2={x} y2={y} stroke={i % 2 ? "#FF6A2B" : "#fff"} strokeOpacity={i % 2 ? 0.45 : 0.28} strokeWidth={1.4} />)}
        {L2.map(([x, y], i) => <Circle key={`n${i}`} cx={x} cy={y} r={3} fill="#fff" fillOpacity={0.3} />)}
        {L1.map(([x, y], i) => (
          <Circle key={`m${i}`} cx={x} cy={y} r={6} fill={i % 2 ? "#FF6A2B" : "#fff"} fillOpacity={i % 2 ? 0.75 : 0.5} stroke="#fff" strokeOpacity={0.25} strokeWidth={5} />
        ))}
        <Circle cx={HUB[0]} cy={HUB[1]} r={74} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={1} />
        <Circle cx={HUB[0]} cy={HUB[1]} r={104} fill="none" stroke="#fff" strokeOpacity={0.07} strokeWidth={1} strokeDasharray="2 6" />
      </Svg>
    </View>
  )
}
