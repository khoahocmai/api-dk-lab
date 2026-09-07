/**
 * JSON Helper Utility
 * Hỗ trợ làm sạch trailing commas và chuẩn hóa JSON an toàn cho Request Body & Variables
 */

/**
 * Loại bỏ toàn bộ trailing commas trong chuỗi JSON mà không ảnh hưởng tới nội dung bên trong dấu ngoặc kép string
 */
export function sanitizeTrailingCommas(jsonStr: string): string {
  if (!jsonStr || typeof jsonStr !== 'string') return jsonStr

  let insideString = false
  let isEscaped = false
  let cleanResult = ''

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (char === '\\' && insideString) {
      isEscaped = !isEscaped
      cleanResult += char
      continue
    }

    if (char === '"' && !isEscaped) {
      insideString = !insideString
      cleanResult += char
      continue
    }

    isEscaped = false

    if (!insideString) {
      // Nếu là dấu phẩy, kiểm tra ký tự không phải khoảng trắng tiếp theo có phải là } hoặc ] không
      if (char === ',') {
        let nextIndex = i + 1
        while (nextIndex < jsonStr.length && (/\s/.test(jsonStr[nextIndex]) || jsonStr[nextIndex] === ',')) {
          nextIndex++
        }
        if (nextIndex < jsonStr.length && (jsonStr[nextIndex] === '}' || jsonStr[nextIndex] === ']')) {
          // Bỏ qua dấu phẩy thừa này
          continue
        }
      }
    }

    cleanResult += char
  }

  return cleanResult
}

/**
 * Parse JSON an toàn kể cả khi có trailing commas
 */
export function safeParseRelaxedJSON<T = any>(jsonStr: string, fallbackValue: T): T {
  try {
    const clean = sanitizeTrailingCommas(jsonStr)
    return JSON.parse(clean) as T
  } catch {
    return fallbackValue
  }
}

export interface FormatJsonResult {
  success: boolean
  formatted: string
  error?: string
}

/**
 * Chuẩn hóa và format JSON có thụt lề 2 spaces sau khi đã làm sạch trailing commas.
 * Trả về kết quả formatted hoặc thông báo lỗi cú pháp chi tiết nếu JSON vẫn không hợp lệ.
 */
export function formatAndPrettifyJson(jsonStr: string): FormatJsonResult {
  if (!jsonStr || !jsonStr.trim()) {
    return { success: true, formatted: jsonStr }
  }

  try {
    const clean = sanitizeTrailingCommas(jsonStr)
    const parsed = JSON.parse(clean)
    return { success: true, formatted: JSON.stringify(parsed, null, 2) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cú pháp JSON không hợp lệ'
    return { success: false, formatted: jsonStr, error: message }
  }
}
