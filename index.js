const mysql = require('mysql2/promise');

exports.handler = async (event) => {
    // Access environment variables
    const dbHost = process.env.DB_HOST;
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbName = process.env.DB_NAME;

    // Check if the required environment variables are defined
    if (!dbHost || !dbUser || !dbPassword || !dbName) {
        console.error("Required environment variables are not set");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Required environment variables are not set" }),
        };
    }

    let connection;
    try {
        // Create a connection to the database
        connection = await mysql.createConnection({
            host: dbHost,
            user: dbUser,
            password: dbPassword,
            database: dbName,
            port: "3306",
        });

        console.log('Connected to MySQL database!');

        // Parse the body (API Gateway may send it as a string)
        let body = event.body;
        if (typeof body === "string") {
            body = JSON.parse(body);
        }

        // Check if body is defined and has the required properties
        if (!body || !body.device_id || !body.status) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "device_id and status are required fields." }),
            };
        }

        // Extract data from the parsed body
        const { device_id, status, user_id, location } = body;

        // Check if the device_id already exists in the table
        const checkQuery = `SELECT COUNT(*) as count FROM ArmDisarmSystem WHERE device_id = ?`;
        const [checkResults] = await connection.execute(checkQuery, [device_id]);
        const deviceExists = checkResults[0].count > 0;

        let query;
        let values;

        if (deviceExists) {
            // If device_id exists, update the record
            query = `UPDATE ArmDisarmSystem SET status = ?, user_id = ?, location = ? WHERE device_id = ?`;
            values = [status, user_id || null, location || null, device_id];
            console.log('Updating existing record for device_id:', device_id);
        } else {
            // If device_id doesn't exist, insert a new record
            query = `INSERT INTO ArmDisarmSystem (device_id, status, user_id, location) VALUES (?, ?, ?, ?)`;
            values = [device_id, status, user_id || null, location || null];
            console.log('Inserting new record for device_id:', device_id);
        }

        const [results] = await connection.execute(query, values);
        console.log(deviceExists ? 'Record updated successfully:' : 'Record inserted successfully:', results);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: deviceExists ? "Record updated successfully" : "Record inserted successfully",
                results,
            }),
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "An error occurred", error: error.message }),
        };
    } finally {
        if (connection) {
            await connection.end();
            console.log('Connection closed.');
        }
    }
};
