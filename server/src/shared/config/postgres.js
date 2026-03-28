import pg from 'pg';
import config from "./index";
import logger from './logger';

const { Pool } = pg;

/**
 * PostgresConnection class manages the connection to PostgreSQL using a connection pool. It provides methods to get the pool instance, test the connection, execute queries, and close the pool.
 * - The getPool method initializes the connection pool if it doesn't already exist and returns the pool instance. It also sets up an error listener for the pool.
 * - The testConnection method tests the connection to PostgreSQL by executing a simple query to retrieve the current time. It logs the success or failure of the connection test.
 * - The query method executes a given SQL query with optional parameters and logs the execution time and number of rows returned. If an error occurs, it logs the error details.
 * - The close method gracefully closes the connection pool and logs the success of the closure process.
 */
class PostgresConnection{
    constructor(){
        this.pool = null;
    }

    /**
     * Initializes and returns the PostgreSQL connection pool. If the pool already exists, it returns the existing instance. Otherwise, it creates a new pool using the configuration parameters for host, port, database, user, and password. It also sets up an error listener for the pool to log any errors that occur.
     * @returns pool instance of PostgreSQL connection pool
     */
    async getPool(){
        if(!this.pool){
            this.pool = new Pool({
                host: config.postgres.host,
                port: config.postgres.port,
                database: config.postgres.database,
                user: config.postgres.user,
                password: config.postgres.password,
                max: 20, // max number of clients in the pool
                idleTimeoutMillis: 30000, // close idle clients after 30 seconds
                connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
            });
        }

        this.pool.on("error", err => {
            logger.error("PostgreSQL pool error: ", err);
        });

        logger.info("PostgreSQL pool created successfully.");
        return this.pool;
    }

    /**
     * Tests the connection to PostgreSQL by executing a simple query to retrieve the current time. It uses the getPool method to obtain the pool instance, executes the query, and logs the success or failure of the connection test along with the current time if successful.
     */
    async testConnection(){
        try {
            const pool = await this.getPool();
            const client = await pool.connect();
            const result =  await client.query("SELECT NOW()");
            client.release();

            logger.info("PostgreSQL connection test successful at ", result.rows[0].now);
        } catch (error) {
            logger.error("Failed to connect to PostgreSQL: ", error);
            throw error;
        }
    }

    /**
     * Executes a given SQL query with optional parameters and logs the execution time and number of rows returned. If an error occurs, it logs the error details.
     * @param {*} text SQL query text to be executed
     * @param {*} params Optional parameters for the SQL query, typically an array of values to be used in parameterized queries to prevent SQL injection.
     * @returns result of the executed query, including rows and rowCount, or throws an error if the query execution fails.
     */
    async query(text, params){
        const pool = await this.getPool();
        const start = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug("Executed query: ", {text, duration, rows: result.rowCount});
            return result;
        } catch (error) {
            logger.error("Error executing query: ", {text, error: error.message});
            throw error;
        }
    }

    /**
     * Closes the PostgreSQL connection pool gracefully. If the pool exists, it ends the pool and sets the pool instance to null. It also logs the success of the closure process.
     */
    async close(){
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            logger.info("PostgreSQL pool closed successfully.");
        }
    }
}

export default new PostgresConnection();