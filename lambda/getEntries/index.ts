import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key'
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const params = event.queryStringParameters ?? {};
    const entryId = params.entryId;
    const limit = params.limit ? Number.parseInt(params.limit, 10) : 50;

    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      console.error('Missing TABLE_NAME env var');
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal' }) };
    }

    if (entryId) {
      const resp = await ddb.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'EntryId = :e',
        ExpressionAttributeValues: { ':e': entryId },
        ScanIndexForward: false,
        Limit: limit
      }));
      return { statusCode: 200, headers: CORS, body: JSON.stringify(resp.Items ?? []) };
    } else {
      const resp = await ddb.send(new ScanCommand({ TableName: tableName, Limit: 1000 }));
      const items = (resp.Items ?? [])
        .slice()
        .sort((a: any, b: any) => (Number(b?.CreatedAt ?? 0) - Number(a?.CreatedAt ?? 0)))
        .slice(0, limit);
      return { statusCode: 200, headers: CORS, body: JSON.stringify(items) };
    }
  } catch (err: any) {
    console.error('getEntries error', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal' }) };
  }
};