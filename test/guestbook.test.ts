import dotenv from 'dotenv';
dotenv.config();
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

jest.setTimeout(30000);

describe('DynamoDB integration', () => {
  let docClient: DynamoDBDocumentClient;
  const table = (process.env.TABLE_NAME) as string;

  beforeAll(async () => {
    if (!table) throw new Error('Set TABLE_NAME env var before running tests');
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    const client = new DynamoDBClient(endpoint ? { endpoint, region: 'local' } : {});
    docClient = DynamoDBDocumentClient.from(client);

    // Verify table exists
    try {
      const adminClient = new DynamoDBClient(endpoint ? { endpoint, region: 'local' } : {});
      await adminClient.send(new DescribeTableCommand({ TableName: table }));
    } catch (err: any) {
      throw new Error(`DynamoDB table "${table}" not found or unreachable. Set TABLE_NAME and (for local) DYNAMODB_ENDPOINT. Original error: ${err && err.message}`);
    }
  });

  test('put -> get -> query -> delete lifecycle', async () => {
    const entryId = typeof randomUUID === 'function' ? randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const createdAt = Date.now();

    // put
    await docClient.send(new PutCommand({
      TableName: table,
      Item: { EntryId: entryId, CreatedAt: createdAt, Name: 'JestTest', Message: 'hello' }
    }));

    // get
    const got = await docClient.send(new GetCommand({
      TableName: table,
      Key: { EntryId: entryId, CreatedAt: createdAt }
    }));
    expect(got.Item).toBeDefined();
    expect(got.Item?.Name).toBe('JestTest');

    // query by EntryId
    const q = await docClient.send(new QueryCommand({
      TableName: table,
      KeyConditionExpression: 'EntryId = :e',
      ExpressionAttributeValues: { ':e': entryId }
    }));
    expect(Array.isArray(q.Items)).toBeTruthy();
    expect((q.Items || []).length).toBeGreaterThanOrEqual(1);

    // delete
    await docClient.send(new DeleteCommand({
      TableName: table,
      Key: { EntryId: entryId, CreatedAt: createdAt }
    }));

    // verify deletion
    const q2 = await docClient.send(new QueryCommand({
      TableName: table,
      KeyConditionExpression: 'EntryId = :e',
      ExpressionAttributeValues: { ':e': entryId }
    }));
    expect((q2.Items || []).length).toBe(0);
  });
});