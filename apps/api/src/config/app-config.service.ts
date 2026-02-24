import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  constructor() {
    this.validateOptionalString('DATABASE_URL');
    this.validateOptionalString('PERMISSIONS_FIXTURES_PATH');
    this.validateOptionalString('USER_PROFILE_MAP_PATH');
    this.validateOptionalString('PORT');
  }

  port(): number {
    const raw = process.env.PORT;
    if (!raw) {
      return 3000;
    }

    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      throw new Error(`Invalid PORT: ${raw}`);
    }

    return value;
  }

  databaseUrl(): string | undefined {
    return process.env.DATABASE_URL;
  }

  permissionsFixturesPath(): string | undefined {
    return process.env.PERMISSIONS_FIXTURES_PATH;
  }

  userProfileMapPath(): string | undefined {
    return process.env.USER_PROFILE_MAP_PATH;
  }

  private validateOptionalString(name: string): void {
    const value = process.env[name];
    if (value === undefined) {
      return;
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Invalid ${name}: expected non-empty string`);
    }
  }
}
