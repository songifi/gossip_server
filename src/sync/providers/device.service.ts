import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { DeviceEntity } from "../entities/device.entity"
import { Device } from "../interfaces/sync.interface"
import { VectorClockService } from "./vector-clock.service"
import * as crypto from "crypto"
import { RegisterDeviceDto, UpdateDeviceDto } from "../dto/create-sync.dto"

@Injectable()
export class DeviceService {
  constructor(
    private vectorClockService: VectorClockService,
    @InjectRepository(DeviceEntity)
    private deviceRepository: Repository<DeviceEntity>,
  ) {}

  async registerDevice(userId: string, registerDto: RegisterDeviceDto): Promise<Device> {
    // Check if device already exists
    const existingDevice = await this.deviceRepository.findOne({
      where: { fingerprint: registerDto.fingerprint, userId },
    })

    if (existingDevice) {
      // Update existing device
      existingDevice.deviceName = registerDto.deviceName
      existingDevice.platform = registerDto.platform
      existingDevice.userAgent = registerDto.userAgent
      existingDevice.pushToken = registerDto.pushToken
      existingDevice.capabilities = registerDto.capabilities
      existingDevice.isActive = true
      existingDevice.lastSeenAt = new Date()

      const updated = await this.deviceRepository.save(existingDevice)
      return this.mapEntityToDevice(updated)
    }

    // Create new device
    const deviceEntity = this.deviceRepository.create({
      userId,
      fingerprint: registerDto.fingerprint,
      deviceName: registerDto.deviceName,
      deviceType: registerDto.deviceType,
      platform: registerDto.platform,
      userAgent: registerDto.userAgent,
      pushToken: registerDto.pushToken,
      capabilities: registerDto.capabilities,
      isActive: true,
      lastSeenAt: new Date(),
      syncSettings: {
        enableAutoSync: true,
        syncThreads: true,
        syncNotifications: true,
        syncOnlyWhenCharging: false,
        syncOnlyOnWifi: false,
        maxOfflineMessages: 1000,
      },
    })

    const saved = await this.deviceRepository.save(deviceEntity)
    return this.mapEntityToDevice(saved)
  }

  async updateDevice(deviceId: string, userId: string, updateDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, userId },
    })

    if (!device) {
      throw new NotFoundException("Device not found")
    }

    if (updateDto.deviceName !== undefined) {
      device.deviceName = updateDto.deviceName
    }

    if (updateDto.isActive !== undefined) {
      device.isActive = updateDto.isActive
    }

    if (updateDto.pushToken !== undefined) {
      device.pushToken = updateDto.pushToken
    }

    if (updateDto.syncSettings) {
      device.syncSettings = { ...device.syncSettings, ...updateDto.syncSettings }
    }

    device.lastSeenAt = new Date()

    const updated = await this.deviceRepository.save(device)
    return this.mapEntityToDevice(updated)
  }

  async getDevice(deviceId: string, userId: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, userId },
    })

    if (!device) {
      throw new NotFoundException("Device not found")
    }

    return this.mapEntityToDevice(device)
  }

  async getUserDevices(userId: string): Promise<Device[]> {
    const devices = await this.deviceRepository.find({
      where: { userId },
      order: { lastSeenAt: "DESC" },
    })

    return devices.map((device) => this.mapEntityToDevice(device))
  }

  async deactivateDevice(deviceId: string, userId: string): Promise<void> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, userId },
    })

    if (!device) {
      throw new NotFoundException("Device not found")
    }

    device.isActive = false
    await this.deviceRepository.save(device)
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    await this.deviceRepository.update(deviceId, {
      lastSeenAt: new Date(),
    })
  }

  async generateDeviceFingerprint(userAgent: string, additionalData?: any): Promise<string> {
    const data = {
      userAgent,
      timestamp: Date.now(),
      random: Math.random(),
      ...additionalData,
    }

    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex")
  }

  async validateDeviceAccess(deviceId: string, userId: string): Promise<boolean> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, userId, isActive: true },
    })

    return !!device
  }

  async getActiveDevicesForUser(userId: string): Promise<Device[]> {
    const devices = await this.deviceRepository.find({
      where: { userId, isActive: true },
      order: { lastSeenAt: "DESC" },
    })

    return devices.map((device) => this.mapEntityToDevice(device))
  }

  async cleanupInactiveDevices(inactiveDays = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays)

    const result = await this.deviceRepository.update(
      {
        lastSeenAt: { $lt: cutoffDate } as any,
        isActive: true,
      },
      { isActive: false },
    )

    return result.affected || 0
  }

  private mapEntityToDevice(entity: DeviceEntity): Device {
    return {
      id: entity.id,
      userId: entity.userId,
      fingerprint: entity.fingerprint,
      deviceName: entity.deviceName,
      deviceType: entity.deviceType,
      platform: entity.platform,
      userAgent: entity.userAgent,
      isActive: entity.isActive,
      lastSeenAt: entity.lastSeenAt,
      pushToken: entity.pushToken,
      capabilities: entity.capabilities,
      syncSettings: entity.syncSettings,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
