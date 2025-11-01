# Guestbook webapp

Simple guestbooks web app using aws lambda and aws dynamoDB to save guestbook entries. I made this app for OP technical assigment for the role of Quantitative Developer.

## Installation instructions

1. Clone/unzip the repo to your device
2. run `npm install` in the project root
3. create a `.env` file to project root according to `example_env.txt`
4. Install and run local frontend.

    > `cd frontend`

    > `npm install`

    > `npm run dev`

    Frontend in hosted on http://localhost:5173/

5. Install and run proxy (required to avoid CORS errors)

    > `cd proxy`

    > `npm install`

    > `npm start`
6. Setup the aws services on project root
    > `cdk bootstrap aws://<ACCOUNT_ID>/eu-north-1` (Replace <ACCOUNT_ID> with you own id)

    > `cdk deploy`
7. Webapp should now be running on http://localhost:5173/ with active database access.

## Testing

To run automated tests first check that the `TABLE_NAME` in the `.env` file is set up correctly, then run `npm test` in project root.

## Helpful commands

Easy way to figure out enviromental variables is command

`aws cloudformation describe-stacks --stack-name GuestbookStack 
--region eu-north-1 --query "Stacks[0].Outputs" --output table`

It gives the guestbooks variables as output.
