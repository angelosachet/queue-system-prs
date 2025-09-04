import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import * as net from 'net';

// Use global Prisma instance if available, otherwise create new one
let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if ((global as any).prisma) return (global as any).prisma;
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
};

export interface CarConfiguration {
  id: string;
  name: string;
  model: string;
  category: string;
  maxSpeed: number;
  power: number;
  weight: number;
  drivetrain: string;
}

export interface TrackConfiguration {
  id: string;
  name: string;
  country: string;
  length: number;
  corners: number;
  category: string;
  pitBoxes: number;
}

export interface SessionConfiguration {
  sessionType: 'practice' | 'qualifying' | 'race';
  timeLimit?: number; // minutes
  lapLimit?: number;
  maxPlayers: number;
  allowedAids: {
    abs: boolean;
    tractionControl: boolean;
    stabilityControl: boolean;
    autoClutch: boolean;
    autoBlip: boolean;
  };
  weather: {
    ambient: number;
    road: number;
    windSpeed: number;
    windDirection: number;
  };
  timeOfDay: {
    hour: number;
    minute: number;
    timeMultiplier: number;
  };
}

export interface PCConfiguration {
  pcIp: string;
  port: number;
  name: string;
  maxConcurrentSessions: number;
  status: 'online' | 'offline' | 'maintenance';
  lastPing?: Date;
  version?: string;
}

export class ConfigurationService extends EventEmitter {
  private defaultCars: CarConfiguration[] = [
    {
      id: 'bmw_m3_e30',
      name: 'BMW M3 E30',
      model: 'bmw_m3_e30',
      category: 'street',
      maxSpeed: 240,
      power: 200,
      weight: 1200,
      drivetrain: 'rwd'
    },
    {
      id: 'ferrari_458',
      name: 'Ferrari 458 Italia',
      model: 'ferrari_458',
      category: 'supercar',
      maxSpeed: 325,
      power: 570,
      weight: 1380,
      drivetrain: 'rwd'
    },
    {
      id: 'porsche_911_gt3_rs',
      name: 'Porsche 911 GT3 RS',
      model: 'porsche_911_gt3_rs',
      category: 'track',
      maxSpeed: 310,
      power: 520,
      weight: 1420,
      drivetrain: 'rwd'
    }
  ];

  private defaultTracks: TrackConfiguration[] = [
    {
      id: 'spa',
      name: 'Circuit de Spa-Francorchamps',
      country: 'Belgium',
      length: 7004,
      corners: 19,
      category: 'circuit',
      pitBoxes: 40
    },
    {
      id: 'monza',
      name: 'Autodromo Nazionale Monza',
      country: 'Italy',
      length: 5793,
      corners: 11,
      category: 'circuit',
      pitBoxes: 30
    },
    {
      id: 'nurburgring_gp',
      name: 'Nürburgring GP',
      country: 'Germany',
      length: 5148,
      corners: 15,
      category: 'circuit',
      pitBoxes: 32
    }
  ];

  private defaultSessionConfig: SessionConfiguration = {
    sessionType: 'practice',
    timeLimit: 10,
    maxPlayers: 24,
    allowedAids: {
      abs: true,
      tractionControl: true,
      stabilityControl: true,
      autoClutch: true,
      autoBlip: true
    },
    weather: {
      ambient: 26,
      road: 30,
      windSpeed: 0,
      windDirection: 0
    },
    timeOfDay: {
      hour: 14,
      minute: 0,
      timeMultiplier: 1
    }
  };

  constructor() {
    super();
  }

  /**
   * Get available car configurations
   */
  getAvailableCars(): CarConfiguration[] {
    return [...this.defaultCars];
  }

  /**
   * Get available track configurations
   */
  getAvailableTracks(): TrackConfiguration[] {
    return [...this.defaultTracks];
  }

  /**
   * Get car configuration by ID
   */
  getCarById(carId: string): CarConfiguration | null {
    return this.defaultCars.find(car => car.id === carId) || null;
  }

  /**
   * Get track configuration by ID
   */
  getTrackById(trackId: string): TrackConfiguration | null {
    return this.defaultTracks.find(track => track.id === trackId) || null;
  }

  /**
   * Get default session configuration
   */
  getDefaultSessionConfig(): SessionConfiguration {
    return { ...this.defaultSessionConfig };
  }

  /**
   * Create custom session configuration
   */
  createSessionConfig(overrides: Partial<SessionConfiguration>): SessionConfiguration {
    return {
      ...this.defaultSessionConfig,
      ...overrides,
      allowedAids: {
        ...this.defaultSessionConfig.allowedAids,
        ...(overrides.allowedAids || {})
      },
      weather: {
        ...this.defaultSessionConfig.weather,
        ...(overrides.weather || {})
      },
      timeOfDay: {
        ...this.defaultSessionConfig.timeOfDay,
        ...(overrides.timeOfDay || {})
      }
    };
  }

  /**
   * Validate PC IP address format
   */
  validatePcIp(pcIp: string): boolean {
    // Basic IP address format validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ipRegex.test(pcIp)) {
      return false;
    }

    // Check for reserved IP ranges
    const parts = pcIp.split('.').map(Number);
    
    // Localhost
    if (parts[0] === 127) return true;
    
    // Private networks
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // Public IP (basic validation)
    if (parts[0] > 0 && parts[0] < 224 && parts[0] !== 127) return true;
    
    return false;
  }

  /**
   * Test PC connectivity
   */
  async testPcConnectivity(pcIp: string, port: number = 9600, timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let isResolved = false;

      const cleanup = () => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
        }
      };

      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        if (!isResolved) {
          isResolved = true;
          socket.end();
          resolve(true);
        }
      });

      socket.on('timeout', () => {
        cleanup();
        resolve(false);
      });

      socket.on('error', () => {
        cleanup();
        resolve(false);
      });

      try {
        socket.connect(port, pcIp);
      } catch (error) {
        cleanup();
        resolve(false);
      }
    });
  }

  /**
   * Get PC configurations from database
   */
  async getPcConfigurations(): Promise<PCConfiguration[]> {
    try {
      const prisma = getPrismaClient();
      const simulators = await prisma.simulator.findMany({
        where: {
          pcIp: { not: null }
        }
      });

      return simulators
        .filter((sim: any) => sim.pcIp)
        .map((sim: any) => ({
          pcIp: sim.pcIp!,
          port: 9600, // Default AC port
          name: sim.name,
          maxConcurrentSessions: 1, // Default for AC
          status: sim.active ? 'online' : 'offline' as const
        }));
    } catch (error) {
      console.error('Error fetching PC configurations:', error);
      return [];
    }
  }

  /**
   * Validate simulator configuration
   */
  async validateSimulatorConfig(simulatorId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const prisma = getPrismaClient();
      const simulator = await prisma.simulator.findUnique({
        where: { id: simulatorId }
      });

      if (!simulator) {
        errors.push('Simulator not found');
        return { isValid: false, errors, warnings };
      }

      // Validate PC IP
      if (!simulator.pcIp) {
        warnings.push('No PC IP configured - AC Launcher integration will be disabled');
      } else {
        if (!this.validatePcIp(simulator.pcIp)) {
          errors.push(`Invalid PC IP format: ${simulator.pcIp}`);
        } else {
          // Test connectivity
          const isConnectable = await this.testPcConnectivity(simulator.pcIp);
          if (!isConnectable) {
            warnings.push(`Cannot connect to PC at ${simulator.pcIp}:9600`);
          }
        }
      }

      // Validate simulator is active
      if (!simulator.active) {
        warnings.push('Simulator is not active');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Get configuration for a specific session
   */
  async getSessionConfiguration(options: {
    carId?: string;
    trackId?: string;
    sessionType?: 'practice' | 'qualifying' | 'race';
    timeLimit?: number;
    lapLimit?: number;
  }): Promise<{
    car: CarConfiguration | null;
    track: TrackConfiguration | null;
    session: SessionConfiguration;
  }> {
    const car = options.carId ? this.getCarById(options.carId) : null;
    const track = options.trackId ? this.getTrackById(options.trackId) : null;
    
    const session = this.createSessionConfig({
      sessionType: options.sessionType,
      timeLimit: options.timeLimit,
      lapLimit: options.lapLimit
    });

    return { car, track, session };
  }

  /**
   * Validate session configuration
   */
  validateSessionConfiguration(config: Partial<SessionConfiguration>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.timeLimit && (config.timeLimit < 1 || config.timeLimit > 120)) {
      errors.push('Time limit must be between 1 and 120 minutes');
    }

    if (config.lapLimit && (config.lapLimit < 1 || config.lapLimit > 999)) {
      errors.push('Lap limit must be between 1 and 999 laps');
    }

    if (config.maxPlayers && (config.maxPlayers < 1 || config.maxPlayers > 32)) {
      errors.push('Max players must be between 1 and 32');
    }

    if (config.weather) {
      if (config.weather.ambient < -10 || config.weather.ambient > 50) {
        errors.push('Ambient temperature must be between -10°C and 50°C');
      }
      if (config.weather.road < -10 || config.weather.road > 60) {
        errors.push('Road temperature must be between -10°C and 60°C');
      }
      if (config.weather.windSpeed < 0 || config.weather.windSpeed > 40) {
        errors.push('Wind speed must be between 0 and 40 km/h');
      }
    }

    if (config.timeOfDay) {
      if (config.timeOfDay.hour < 0 || config.timeOfDay.hour > 23) {
        errors.push('Hour must be between 0 and 23');
      }
      if (config.timeOfDay.minute < 0 || config.timeOfDay.minute > 59) {
        errors.push('Minute must be between 0 and 59');
      }
      if (config.timeOfDay.timeMultiplier < 0 || config.timeOfDay.timeMultiplier > 100) {
        errors.push('Time multiplier must be between 0 and 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get system configuration summary
   */
  async getSystemConfigSummary(): Promise<{
    totalSimulators: number;
    activeSimulators: number;
    simulatorsWithPcIp: number;
    availableCars: number;
    availableTracks: number;
    pcConfigurations: PCConfiguration[];
  }> {
    try {
      const prisma = getPrismaClient();
      const simulators = await prisma.simulator.findMany();
      const pcConfigs = await this.getPcConfigurations();

      return {
        totalSimulators: simulators.length,
        activeSimulators: simulators.filter((s: any) => s.active).length,
        simulatorsWithPcIp: simulators.filter((s: any) => s.pcIp).length,
        availableCars: this.defaultCars.length,
        availableTracks: this.defaultTracks.length,
        pcConfigurations: pcConfigs
      };
    } catch (error) {
      console.error('Error getting system config summary:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const configurationService = new ConfigurationService();