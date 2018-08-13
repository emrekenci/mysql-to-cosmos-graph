const mysql = require('mysql2');
const azureStorage = require('azure-storage');
const DocumentDb = require('documentdb').DocumentClient;
const Gremlin = require('gremlin');

var blobService = azureStorage.createBlobService();
var docDbClient = new DocumentDb(process.env.COSMOS_URI, { masterKey: process.env.COSMOS_PRIMARY_KEY });

var gremlinConfig = {
    "session": false,
    "ssl": true,
    "user": `/dbs/${process.env.COSMOS_GRAPH_DATABASE}/colls/${process.env.COSMOS_GRAPH_COLLECTION}`,
    "password": process.env.COSMOS_GRAPH_PRIMARY_KEY
}

const gremlinClient = Gremlin.createClient(443, process.env.COSMOS_GRAPH_ENDPOINT, gremlinConfig);

module.exports = async function (context, myTimer) {
    try {
        await configureBlobContainer();

        var lastProcessedId = await getLastProcessedId();

        var newTxes = await getNewTxesSinceId(lastProcessedId);

        if (newTxes.length === 0) {
            context.log("No new records since Id:" + lastProcessedId);
            return;
        }

        newTxes.forEach(async (tx) => {
            var addResult = await addEdge(tx.payerId, tx.payeeId, "paid", tx)
            context.log("Saved transaction: " + addResult[0].id);
        })

        lastProcessedId = newTxes[newTxes.length - 1].id;

        await updateLastProcessedId(lastProcessedId);

        context.log("Saved " + newTxes.length + " new records. Up to Id:" + lastProcessedId)
    } catch (error) {
        console.error(error)
    }
};

// Update the last processed id.
function updateLastProcessedId(id) {
    return new Promise((resolve, reject) => {
        blobService.createBlockBlobFromText(process.env.AZURE_STORAGE_CONTAINER_NAME, process.env.AZURE_STORAGE_BLOB_NAME, id.toString(), function (error, result, response) {
            if (error) {
                console.error("Cannot update state file. Error: " + error)
                reject(false);
            }

            console.log("Updated the last processed id to " + id);
            resolve(true);
        });
    });
}

// Get the last processed id
function getLastProcessedId() {
    return new Promise((resolve, reject) => {
        blobService.getBlobToText(process.env.AZURE_STORAGE_CONTAINER_NAME, process.env.AZURE_STORAGE_BLOB_NAME, function (error, text) {
            if (error) {
                console.error("Something went wrong while accessing the blob storage: " + error);
                reject()
            } else {
                var result = parseInt(text, 10);
                if (isNaN(result)) {
                    resolve(0);
                } else {
                    resolve(result);
                }
            }
        });
    });
}

// Establish a new connection and return the instance.
function getMySqlConnection() {
    return new Promise((resolve, reject) => {
        var config =
        {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: 3306,
            ssl: true
        };

        var result = new mysql.createConnection(config);

        result.connect((error) => {
            if (error) {
                console.error("Cannot connect to MySQL Db. Error: " + error);
                reject(error)
            }
            else {
                resolve(result);
            }
        });
    });
}

// Check if the container exists, create if it doesn't.
function configureBlobContainer() {
    return new Promise((resolve, reject) => {
        blobService.createContainerIfNotExists(process.env.AZURE_STORAGE_CONTAINER_NAME, {},
            function (error, result, response) {
                if (error) {
                    reject(error)
                }
                else {
                    // Container was created or it already existed.
                    resolve();
                }
            });
    })
}

// Get the new transactions in the DB with Id's bigger than the given id.
function getNewTxesSinceId(id) {
    return new Promise(async (resolve, reject) => {
        var dbConnection = await getMySqlConnection();
        dbConnection.query('select * from transactions where id > ' + id, (error, results, fields) => {
            if (error) {
                reject(error);
            }
            resolve(results);
        });
    });
}

// Insert the given object to cosmosDb. Returns the document from Cosmos.
function insertDocumentToCosmos(object) {
    return new Promise((resolve, reject) => {
        docDbClient.createDocument("dbs/" + process.env.COSMOS_DB + "/colls/" + process.env.COSMOS_COLLECTION + "/", object, (error, document) => {
            if (error) {
                reject(error);
            } else {
                resolve(document);
            }
        })
    });
}

// Drop the entire graph
function dropGraph() {
    return new Promise((resolve, reject) => {
        gremlinClient.execute('g.V().drop()', {}, (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(true)
        });
    });
}

// The properties of the given edge object are added as properties to the edge on the graph
// Ex: Emre sent money to Steven. Would be the edge. And the properties would be the date of
// the transaction, the amount etc.
function addEdge(fromId, toId, type, edgeObject) {
    return new Promise((resolve, reject) => {
        var query = "g.V('" + fromId + "').addE('" + type + "')";

        Object.keys(edgeObject).forEach(key => {
            query += ".property('" + key + "', '" + edgeObject[key] + "')"
        });

        query += ".to(g.V('" + toId + "'))";

        gremlinClient.execute(query, {}, (error, results) => {
            if (error) {
                reject(error);
            }
            resolve(results);
        });
    });
}

// Add a vertice to the graph. The oject must have an "id" property
function addVertice(object, type) {
    return new Promise((resolve, reject) => {
        var query = "g.addV('" + type + "')";

        if (!object.id) {
            console.error("A vertice must have an id property");
            return;
        }

        Object.keys(object).forEach(key => {
            query += ".property('" + key + "', '" + object[key] + "')"
        });

        gremlinClient.execute(query, {}, (error, results) => {
            if (error) {
                reject(error);
            }
            resolve(results);
        });
    });
}