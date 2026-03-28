import winston from 'winston';
import config from './index';

/**
 * Logger configuration using winston. Logs are written to files in production and to the console in development.
 * - In production, logs are saved to "logs/error.log" for errors and "logs/combined.log" for all logs.
 * - In development, logs are output to the console with colorization for easier debugging.
 */
const logger = winston.createLogger({
    level: config.node_env === "production" ? "info" : "debug",

    format: winston.format.combine(
        winston.format.timestamp({format: "YYYY-MM-DD HH:MM:SS"}),
        winston.format.errors({stack: true}),
        winston.format.splat(),
        winston.format.json()
    ),

    defaultMeta: {
        service: "api-pulse",
    },

    transports: [
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
        }),
        new winston.transports.File({
            filename: "logs/combined.log",
        }),
    ]
})

if (config.node_env !== "production") {
    logger.add(new winston.transports.Console({
        format: winston.combine(
            winston.format.colorize(),
            winston.format.simple(),
        )
    }))
}

export default logger