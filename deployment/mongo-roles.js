// Run with mongosh as a database administrator after scripts/migrate.js.
// Supply APP_DB_NAME (default async-standup-bot), APP_DB_USER and APP_DB_PASSWORD in the environment.
const database=db.getSiblingDB(process.env.APP_DB_NAME||'async-standup-bot');
const collections=['users','teams','standups','digests','notifications','sessions','actiontokens','mailjobs','passkeys','challenges','ratecounters'];
database.createRole({role:'standupApp',privileges:[...collections.map(collection=>({resource:{db:database.getName(),collection},actions:['find','insert','update','remove']})),{resource:{db:database.getName(),collection:'audits'},actions:['insert']}],roles:[]});
if(!process.env.APP_DB_USER||!process.env.APP_DB_PASSWORD)throw new Error('Set app credentials in the environment');
database.createUser({user:process.env.APP_DB_USER,pwd:process.env.APP_DB_PASSWORD,roles:[{role:'standupApp',db:database.getName()}]});
