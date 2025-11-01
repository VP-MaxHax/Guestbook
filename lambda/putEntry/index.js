const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,x-api-key' };

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { EntryId, Name, Message } = body;
    if (!EntryId || !Name || !Message) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'EntryId, Name and Message required' }) };
    }

    const item = { EntryId, CreatedAt: Date.now(), Name, Message };
    await ddb.send(new PutCommand({ TableName: process.env.TABLE_NAME, Item: item }));

    return { statusCode: 201, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('putEntry error', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal' }) };
  }
};