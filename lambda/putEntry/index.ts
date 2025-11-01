import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
};

interface Body {
  EntryId?: string;
  Name?: string;
  Message?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body: Body = event.body ? JSON.parse(event.body) : {};
    const { EntryId, Name, Message } = body;

    if (!EntryId || !Name || !Message) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'EntryId, Name and Message required' }),
      };
    }

    const table = process.env.TABLE_NAME;
    if (!table) {
      console.error('Missing TABLE_NAME env var');
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal' }) };
    }

    const item = { EntryId, CreatedAt: Date.now(), Name, Message };
    await ddb.send(new PutCommand({ TableName: table, Item: item }));

    return { statusCode: 201, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('putEntry error', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'internal' }) };
  }
};