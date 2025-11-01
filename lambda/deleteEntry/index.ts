import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
  'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('event', JSON.stringify(event));
    const entryId = event.pathParameters?.entryId ?? (event as any).entryId;
    if (!entryId) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'entryId required' })
      };
    }

    const table = process.env.TABLE_NAME;
    if (!table) {
      console.error('Missing TABLE_NAME env var');
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal', detail: 'missing TABLE_NAME' }) };
    }

    const q = await ddb.send(new QueryCommand({
      TableName: table,
      KeyConditionExpression: 'EntryId = :e',
      ExpressionAttributeValues: { ':e': entryId },
      ProjectionExpression: 'EntryId, CreatedAt'
    }));

    const items = (q.Items ?? []) as Array<{ EntryId: string; CreatedAt: number }>;
    if (items.length === 0) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'not_found' }) };
    }

    await Promise.all(items.map(item =>
      ddb.send(new DeleteCommand({
        TableName: table,
        Key: { EntryId: item.EntryId, CreatedAt: item.CreatedAt }
      }))
    ));

    return { statusCode: 204, headers: CORS, body: '' };
  } catch (err: any) {
    console.error('delete error', err, err && err.stack);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal', message: err?.message }) };
  }
};