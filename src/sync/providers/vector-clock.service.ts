import { Injectable } from "@nestjs/common"
import { VectorClock } from "../interfaces/sync.interface"

@Injectable()
export class VectorClockService {
  /**
   * Create a new vector clock for a device
   */
  createClock(deviceId: string): VectorClock {
    return { [deviceId]: 1 }
  }

  /**
   * Increment the vector clock for a specific device
   */
  increment(clock: VectorClock, deviceId: string): VectorClock {
    const newClock = { ...clock }
    newClock[deviceId] = (newClock[deviceId] || 0) + 1
    return newClock
  }

  /**
   * Merge two vector clocks, taking the maximum value for each device
   */
  merge(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged: VectorClock = { ...clock1 }

    for (const [deviceId, timestamp] of Object.entries(clock2)) {
      merged[deviceId] = Math.max(merged[deviceId] || 0, timestamp)
    }

    return merged
  }

  /**
   * Compare two vector clocks to determine their relationship
   */
  compare(clock1: VectorClock, clock2: VectorClock): "before" | "after" | "concurrent" | "equal" {
    const allDevices = new Set([...Object.keys(clock1), ...Object.keys(clock2)])

    let clock1Greater = false
    let clock2Greater = false

    for (const deviceId of allDevices) {
      const time1 = clock1[deviceId] || 0
      const time2 = clock2[deviceId] || 0

      if (time1 > time2) {
        clock1Greater = true
      } else if (time2 > time1) {
        clock2Greater = true
      }
    }

    if (clock1Greater && clock2Greater) {
      return "concurrent"
    } else if (clock1Greater) {
      return "after"
    } else if (clock2Greater) {
      return "before"
    } else {
      return "equal"
    }
  }

  /**
   * Check if clock1 happens before clock2
   */
  happensBefore(clock1: VectorClock, clock2: VectorClock): boolean {
    return this.compare(clock1, clock2) === "before"
  }

  /**
   * Check if two clocks are concurrent (conflicting)
   */
  areConcurrent(clock1: VectorClock, clock2: VectorClock): boolean {
    return this.compare(clock1, clock2) === "concurrent"
  }

  /**
   * Get the latest timestamp for a specific device
   */
  getDeviceTime(clock: VectorClock, deviceId: string): number {
    return clock[deviceId] || 0
  }

  /**
   * Create a clock that represents the current state after an operation
   */
  advance(clock: VectorClock, deviceId: string, operation: "create" | "update" | "delete"): VectorClock {
    return this.increment(clock, deviceId)
  }

  /**
   * Validate that a vector clock is well-formed
   */
  isValid(clock: VectorClock): boolean {
    if (!clock || typeof clock !== "object") {
      return false
    }

    for (const [deviceId, timestamp] of Object.entries(clock)) {
      if (typeof deviceId !== "string" || typeof timestamp !== "number" || timestamp < 0) {
        return false
      }
    }

    return true
  }

  /**
   * Convert vector clock to a string representation for storage/comparison
   */
  toString(clock: VectorClock): string {
    const sortedEntries = Object.entries(clock).sort(([a], [b]) => a.localeCompare(b))
    return JSON.stringify(sortedEntries)
  }

  /**
   * Parse a string representation back to a vector clock
   */
  fromString(clockString: string): VectorClock {
    try {
      const entries = JSON.parse(clockString)
      return Object.fromEntries(entries)
    } catch {
      return {}
    }
  }
}
