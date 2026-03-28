import amqp from 'amqplib';
import config from "./index";
import logger from './logger';

/**
 * RabbitMQConnection class manages the connection to RabbitMQ using amqplib. It provides methods to connect, retrieve the channel, get the connection status, and close the connection.
 * - The connect method establishes a connection to RabbitMQ using the URL from the configuration. It also asserts the existence of the main queue and a corresponding dead-letter queue (DLQ) for handling failed messages. It sets up event listeners for connection closures and errors.
 * - The getChannel method returns the current channel instance, allowing other parts of the application to access it as needed.
 * - The getStatus method returns the current status of the RabbitMQ connection, indicating whether it is connected, closing, or disconnected.
 * - The close method gracefully closes the RabbitMQ connection and channel, logging the success or failure of the closure process.
 */
class RabbitMQConnection{
    constructor(){
        this.connection = null;
        this.channel = null;
        this.isConnecting = false;
    }

    /**
     * Establishes a connection to RabbitMQ. If a connection already exists, it returns the existing channel. If a connection is currently being established, it waits until the connection process is complete and then returns the channel. Otherwise, it creates a new connection using the URL from the configuration, asserts the existence of the main queue and a corresponding dead-letter queue (DLQ), and sets up event listeners for connection closures and errors. It logs the success or failure of the connection process.
     * @returns channel instance of RabbitMQ connection
     */
    async connect(){
         if (this.connection) {
            return this.connection;
         }

         if (this.isConnecting) {
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isConnecting) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100)
            });
            return this.channel;
         }

         try {
            this.isConnecting = true;

            logger.info("Connecting to RabbitMQ at ", config.rabbitmq.url);
            this.connection = await amqp.connect(config.rabbitmq.url);
            this.channel = await this.connection.createChannel();

            // Creating key | Queue name
            const dlqName = `${config.rabbitmq.queue}_dlq`; // api_hits | apit_hits.dlq

            // DL Queue
            await this.channel.assertQueue(dlqName, {
                durable: true,
            });

            // Normal Queue
            await this.channel.assertQueue(config.rabbitmq.queue, {
                durable: true,
                arguments: {
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": dlqName
                },
            });

            logger.info("Successfully connected to RabbitMQ and asserted queues.");

            this.connection.on("close", () => {
                logger.warn("RabbitMQ connection closed.");
                this.connection = null;
                this.channel = null;
            });

            this.connection.on("error", (err) => {
                logger.error("RabbitMQ connection error: ", err);
                this.connection = null;
                this.channel = null;
            });

            this.isConnecting = false;
            return this.channel;
         } catch (error) {
            this.isConnecting = false;
            logger.error("Failed to connect to RabbitMQ: ", error);
            throw error;
         }
    }

    /**
     * Returns the current channel instance, allowing other parts of the application to access it as needed.
     * @returns channel instance of RabbitMQ connection
     */
    getChannel(){
        return this.channel;
    }

    /**
     * Returns the current status of the RabbitMQ connection, indicating whether it is connected, closing, or disconnected. It checks the existence of the connection and channel instances and whether the connection is in the process of closing to determine the appropriate status.
     * @returns string status of RabbitMQ connection ("connected", "closing", or "disconnected")
     */
    getStatus(){
        if (!this.connection || !this.channel) return "disconnected";
        if (this.connection.closing) return "closing";
        return "connected";
    }

    /**
     * Closes the RabbitMQ connection and channel gracefully. If the channel exists, it closes the channel and sets the channel instance to null. If the connection exists, it closes the connection and sets the connection instance to null. It logs the success or failure of the closure process.
     */
    async close(){
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            logger.info("Successfully closed RabbitMQ connection.");
        } catch (error) {
            logger.error("Failed to close RabbitMQ connection: ", error);
        }
    }
}

export default new RabbitMQConnection();