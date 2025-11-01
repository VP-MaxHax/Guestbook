const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,x-api-key', 'Access-Control-Allow-Methods': 'DELETE,OPTIONS' };

exports.handler = async (event) => {
  try {
    console.log('event', JSON.stringify(event));
    const entryId = (event.pathParameters && event.pathParameters.entryId) || (event.entryId);
    if (!entryId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'entryId required' }) };
    }

    // Query for items with this partition key (EntryId)
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'EntryId = :e',
      ExpressionAttributeValues: { ':e': entryId },
      ProjectionExpression: 'EntryId, CreatedAt'
    }));

    const items = q.Items || [];
    if (items.length === 0) {
      // nothing to delete
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'not_found' }) };
    }

    // Delete all matching items (use Promise.all for concurrency)
    await Promise.all(items.map(item => {
      return ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key: { EntryId: item.EntryId, CreatedAt: item.CreatedAt }
      }));
    }));

    return { statusCode: 204, headers: CORS, body: '' };
  } catch (err) {
    console.error('delete error', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal' }) };
  }
};