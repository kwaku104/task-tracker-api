const serverless = require('serverless-http');
const express = require('express');
const app = express();
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');

const TASKS_TABLE = process.env.TASKS_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

app.use(bodyParser.json({ strict: false }));

app.get('/', function (req, res) {
    res.send('Hello World!')
})

// Get all tasks
app.get('/tasks', function (req, res) {
    const params = {
        TableName: TASKS_TABLE
        // ProjectExpression: "#id, #text, #day, #reminder",
        // ExpressionAttributeNames: {
        //     "#id": "id",
        //     "#text": "text",
        //     "#day": "day",
        //     "#reminder": "reminder"
        // }
    };

    let tasksList = [];
    dynamoDb.scan(params, onScan);

    function onScan(error, result) {
        if (error) {
            console.log(error)
            return res.status(400).json({ error: `Could not get tasks: ${error}` });
        }
        result.Items.forEach(function (task) {
            tasksList.push(task);

            if (typeof result.LastEvaluatedKey != "undefined") {
                console.log("Scanning for more...");
                params.ExclusiveStartKey = result.LastEvaluatedKey;
                dynamoDb.scan(params, onScan);
            }
        })

        res.status(200).json(tasksList);
    }
})

// Get task endpoint
app.get('/tasks/:id', function (req, res) {
    var params = {}
    params.TableName = TASKS_TABLE;
    var key = { id: req.params.id };
    params.Key = key;

    dynamoDb.get(params, (error, result) => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: `Could not get task: ${error}` });
        }
        if (result.Item) {
            const { id, text, day, reminder } = result.Item;
            res.status(200).json({ id, text, day, reminder })
        } else {
            res.status(404).json({ error: "task not found" });
        }
    });
})

// Create task endpoint
app.post('/tasks', function (req, res) {
    const { id, text, day, reminder } = req.body;
    if (typeof id !== 'string') {
        res.status(400).json({ error: '"id" must be a string' });
    } else if (typeof text !== 'string') {
        res.status(400).json({ error: '"text" must be a string' });
    } else if (typeof day !== 'string') {
        res.status(400).json({ error: '"day" must be a string' });
    } else if (typeof reminder == null) {
        res.status(400).json({ error: '"reminder" must be boolean' });
    }

    const params = {
        TableName: TASKS_TABLE,
        Item: {
            id: id,
            text: text,
            day: day,
            reminder: reminder
        },
    };

    dynamoDb.put(params, (error) => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: 'Could not create task' });
        }
        res.json({ id, text, day, reminder });
    });
})

// Update Task Reminder
app.put('/tasks/:id', function (req, res) {
    const { text, day, reminder } = req.body;
    const params = {
        TableName: TASKS_TABLE,
        Key: {
            id: req.params.id,
        },
        UpdateExpression: "set #text = :t, #day = :d, #reminder = :r",
        ExpressionAttributeNames: {
            "#text": "text",
            "#day": "day",
            "#reminder": "reminder"
        },
        ExpressionAttributeValues: {
            ":t": text,
            ":d": day,
            ":r": reminder
        }
    }

    dynamoDb.update(params, (error, result) => {
        if (error) {
            console.log(error);
            return res.status(400).json({ error: `Could not update task: ${error}` });
        }
        res.status(200).json(req.body);
    });
})

// Delete task endpoint
app.delete('/tasks/:id', function (req, res) {
    const params = {
        TableName: TASKS_TABLE,
        Key: {
            id: req.params.id,
        },
    }

    dynamoDb.delete(params, (error, result) => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: 'Could not delete task' });
        } else {
            res.status(200).json({ "result": "Item Deleted Successfully" })
        }
    });
})

module.exports.handler = serverless(app);