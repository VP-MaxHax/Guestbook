import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class GuestbookStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'GuestbookTable', {
      partitionKey: { name: 'EntryId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'CreatedAt', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, 'GuestbookTableName', { value: table.tableName });

    const putEntryFn = new lambda.Function(this, 'PutEntryFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'putEntry')),
      environment: { TABLE_NAME: table.tableName },
    });
    table.grantWriteData(putEntryFn);

    const getEntriesFn = new lambda.Function(this, 'GetEntriesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'getEntries')),
      environment: { TABLE_NAME: table.tableName },
    });
    table.grantReadData(getEntriesFn);

    const api = new apigateway.RestApi(this, 'GuestbookApi', {
      restApiName: 'GuestbookApi',
      deployOptions: { stageName: 'prod' },
      defaultMethodOptions: { apiKeyRequired: true },
    });

    const entries = api.root.addResource('entries');
    entries.addMethod('GET', new apigateway.LambdaIntegration(getEntriesFn));
    entries.addMethod('POST', new apigateway.LambdaIntegration(putEntryFn));

    const deleteEntryFn = new lambda.Function(this, 'DeleteEntryFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'deleteEntry')),
      environment: { TABLE_NAME: table.tableName },
    });
   table.grantReadWriteData(deleteEntryFn);

   const entryResource = entries.addResource('{entryId}');
   entryResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteEntryFn));

    const apiKey = new apigateway.ApiKey(this, 'GuestbookApiKey', { apiKeyName: 'GuestbookApiKey' });
    const usagePlan = new apigateway.UsagePlan(this, 'GuestbookUsagePlan', {
      name: 'GuestbookUsagePlan',
      throttle: { rateLimit: 10, burstLimit: 2 },
    });
    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({ stage: api.deploymentStage });

    new cdk.CfnOutput(this, 'GuestbookApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'GuestbookApiKeyId', { value: apiKey.keyId });
  }
}
