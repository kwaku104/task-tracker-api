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

// Get task endpoint
app.get('/tasks/:id', function (req, res) {
    // const params = {
    //     TableName: "tasks-table1-dev",
    //     Key: {
    //         "id": req.params.id
    //     }
    // }

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
    const { id, text, day, reminder } = req.body;
    const params = {
        TableName: TASKS_TABLE,
        Key: {
            id: req.params.id,
        },
        UpdateExpression: 'set id = :id, text = :text, day = :day, reminder = :reminder',
        ExpressionAttributes: {
            ':id': id,
            ':text': text,
            ':day': day,
            ':reminder': reminder
        }
    }

    dynamoDb.update(params, (error) => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: 'Could not update task' });
        }
        res.status(200).json({ id, text, day, reminder });
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