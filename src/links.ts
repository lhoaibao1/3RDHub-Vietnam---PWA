import { Linking } from "react-native"
import * as WebBrowser from "expo-web-browser"
import { API_URL } from "./api"
import { t } from "./theme"

export const ZALO_SUPPORT = "https://zalo.me/g/thba8hjdrcuut4hl6rue"
/** Mở trang web của hệ thống ngay trong app (Điều khoản, Chính sách…). */
export const openPage = (path: string) =>
  WebBrowser.openBrowserAsync(`${API_URL}${path}`, { controlsColor: t.navy, presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => Linking.openURL(`${API_URL}${path}`))
export const openTerms = () => openPage("/terms")
export const openPrivacy = () => openPage("/privacy")
