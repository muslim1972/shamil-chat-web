import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * دالة مساعدة لدمج كلاسات Tailwind CSS بشكل احترافي
 * تحل مشاكل التعارض بين الكلاسات وتسهل بناء المكونات التفاعلية
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
