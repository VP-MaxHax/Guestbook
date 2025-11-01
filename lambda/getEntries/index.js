const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,x-api-key' };

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const entryId = params.entryId;
    const limit = params.limit ? parseInt(params.limit, 10) : 50;

    if (entryId) {
      const resp = await ddb.send(new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'EntryId = :e',
        ExpressionAttributeValues: { ':e': entryId },
        ScanIndexForward: false,
        Limit: limit
      }));
      return { statusCode: 200, headers: CORS, body: JSON.stringify(resp.Items || []) };
    } else {
      const resp = await ddb.send(new ScanCommand({ TableName: process.env.TABLE_NAME, Limit: 1000 }));
      const items = (resp.Items || []).sort((a, b) => (b.CreatedAt || 0) - (a.CreatedAt || 0)).slice(0, limit);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(items) };
    }
  } catch (err) {
    console.error('getEntries error', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal' }) };
  }
};