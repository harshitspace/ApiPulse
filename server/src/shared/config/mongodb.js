import mongoose from 'mongoose';
import config from './index';
import logger from './logger';

/**
 * MongoConnection class manages the connection to MongoDB using mongoose. It provides methods to connect, disconnect, and retrieve the current connection instance.
 * - The connect method establishes a connection to MongoDB using the URI and database name from the configuration. It also sets up event listeners for connection errors and disconnections.
 * - The disconnect method gracefully closes the MongoDB connection.
 * - The getConnection method returns the current connection instance, allowing other parts of the application to access it as needed.
 */
class MongoConnection{
    constructor(){
        this.connection = null;
    }

    /**
     * Establishes a connection to MongoDB. If a connection already exists, it returns the existing connection. Otherwise, it creates a new connection using the URI and database name from the configuration. It also sets up event listeners for connection errors and disconnections.
     * @returns connection instance of MongoDB
     */
    async connect(){
        try {
            if (this.connection) {
                logger.info("MongoDB connection already established.");
                return this.connection;
            }

            await mongoose.connect(config.mongo.uri, {
                dbName: config.mongo.dbName,
            });

            this.connection = mongoose.connection;
            logger.info("Successfully connected to MongoDB: ", config.mongo.uri);

            this.connection.on("error", err => {
                logger.error("MongoDB connection error: ", err);
            })

            this.connection.on("dissconnected", () => {
                logger.error("MongoDB connection lost.");
            });

            return this.connection;
        } catch (error) {
            logger.error("Failed to connect to MongoDB: ", error);
            throw error;
        }
    }

    /**
     * Closes the MongoDB connection gracefully. If a connection exists, it disconnects and sets the connection instance to null. Logs the success or failure of the disconnection process.
     */
    async disconnect(){
        try {
            if (this.connection) {
                await mongoose.disconnect();
                this.connection = null;
                logger.info("Successfully disconnected from MongoDB.");
            }
        } catch (error) {
            logger.error("Failed to disconnect from MongoDB: ", error);
            throw error;
        }
    }

    /**
     * Returns the current MongoDB connection instance. This allows other parts of the application to access the connection as needed.
     * @returns connection instance of MongoDB
     */
    getConnection(){
        return this.connection;
    }
}

export default MongoConnection;