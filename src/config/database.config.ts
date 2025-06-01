import { DataSource } from "typeorm"
import { ConfigService } from "@nestjs/config"
import { config } from "dotenv"

config()

const configService = new ConfigService()

export default new DataSource({
  type: "postgres",
  host: configService.get("DB_HOST", "localhost"),
  port: configService.get("DB_PORT", 5432),
  username: configService.get("DB_USERNAME", "nestuser"),
  password: configService.get("DB_PASSWORD", "nestpassword"),
  database: configService.get("DB_NAME", "nestdb"),
  entities: ["src/**/*.entity{.ts,.js}"],
  migrations: ["src/migrations/*{.ts,.js}"],
  synchronize: configService.get("NODE_ENV") !== "production",
  logging: configService.get("NODE_ENV") === "development",
})
