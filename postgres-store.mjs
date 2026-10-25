import {AsyncLocalStorage} from 'node:async_hooks';
import {readFileSync} from 'node:fs';
export function parameters(sql){let i=0;return sql.replace(/'(?:''|[^'])*'|\?/g,t=>t==='?'?'$'+(++i):t);}
export function storeFromPool(pool){
 const context=new AsyncLocalStorage();
 const query=(text,values=[])=>{const client=context.getStore()||pool;return client.query(parameters(text),values)};
 const prepare=text=>({get:async(...v)=>(await query(text,v)).rows[0],all:async(...v)=>(await query(text,v)).rows,run:(...v)=>query(text,v)});
 const transaction=async(fn,{snapshot=false}={})=>{const client=await pool.connect();try{await client.query(snapshot?'BEGIN ISOLATION LEVEL REPEATABLE READ':'BEGIN');await client.query('SELECT pg_advisory_xact_lock(83102941)');const result=await context.run(client,fn);await client.query('COMMIT');return result}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}};
 const initialize=seed=>transaction(async()=>{
 await query(`CREATE SCHEMA IF NOT EXISTS bautec;
 REVOKE ALL ON SCHEMA bautec FROM PUBLIC;
 CREATE TABLE IF NOT EXISTS bautec.users(id TEXT PRIMARY KEY,name TEXT NOT NULL,username TEXT UNIQUE NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,salt TEXT NOT NULL,password TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS bautec.sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES bautec.users(id),csrf TEXT NOT NULL,expires BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS bautec.state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS bautec.audit(id SERIAL PRIMARY KEY,at TEXT NOT NULL,user_id TEXT,user_name TEXT,username TEXT,role TEXT,action TEXT NOT NULL,details TEXT NOT NULL,ip TEXT);
 REVOKE ALL ON ALL TABLES IN SCHEMA bautec FROM PUBLIC;
 CREATE INDEX IF NOT EXISTS audit_user_idx ON bautec.audit(user_id,id);
 CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON bautec.sessions(expires);`);
 seed.audit=[];
 await query('INSERT INTO bautec.state VALUES(1,0,?) ON CONFLICT (id) DO NOTHING',[JSON.stringify(seed)]);
 await query('DELETE FROM bautec.sessions WHERE expires < ?',[Date.now()]);
 });
 return {prepare,transaction,initialize,close:()=>pool.end()};
}
export async function createStore(){
 if(!process.env.DATABASE_URL)throw Error('Falta DATABASE_URL.');
 const url=new URL(process.env.DATABASE_URL);
 // No permitir que los parámetros de la URI desactiven la validación TLS.
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert','uselibpqcompat'])url.searchParams.delete(key);
 const {Pool}=await import('pg');
 const ca=process.env.BAUTEC_DB_CA_FILE?readFileSync(process.env.BAUTEC_DB_CA_FILE,'utf8'):undefined;
 const pool=new Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},options:'-c search_path=bautec,pg_catalog',max:3,idleTimeoutMillis:30000,connectionTimeoutMillis:15000,statement_timeout:20000});
 pool.on('error',()=>console.error('Se interrumpió una conexión de datos.'));
 return storeFromPool(pool);
}
