/*
 * File:        src/lib/temperature-ui.ts
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
export function getTemperatureIconColorClass(
  temperatureFahrenheit: number | null | undefined,
): string {
  if (temperatureFahrenheit === null || temperatureFahrenheit === undefined) {
    return "text-[#9ca3af]";
  }

  if (temperatureFahrenheit < 0) return "text-purple-500";
  if (temperatureFahrenheit <= 32) return "text-blue-500";
  if (temperatureFahrenheit <= 50) return "text-sky-400";
  if (temperatureFahrenheit <= 65) return "text-cyan-300";
  if (temperatureFahrenheit <= 80) return "text-amber-300";
  if (temperatureFahrenheit <= 95) return "text-orange-400";
  return "text-red-500";
}
