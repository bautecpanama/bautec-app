import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {createStore} from './postgres-store.mjs';
const tables=['users','state','audit'];
const columns={users:['id','name','username','role','active','salt','password','created'],state:['id','revision','payload'],audit:['id','at','user_id','user_name','username','role','action','details','ip']};
const [action,file]=process.argv.slice(2);
if(!['export','import-sqlite','restore'].includes(action)||!file)throw Error('Uso: node transfer.mjs export|import-sqlite|restore ARCHIVO');
const sql=await createStore();
try {
 await sql.initialize(JSON.parse(readFileSync(new URL('./Bautec-datos-iniciales.json',import.meta.url),'utf8')));
 if(action==='export'){
  const data=await sql.transaction(async()=>{const rows={};for(const t of tables)rows[t]=await sql.prepare('SELECT * FROM '+t).all();return {format:'bautec-private-v1',created:new Date().toISOString(),rows}},{snapshot:true});
  writeFileSync(file,JSON.stringify(data),{encoding:'utf8',mode:0o600,flag:'wx'});chmodSync(file,0o600);
  console.log('Respaldo privado creado; incluye usuarios e historial. No publicarlo.');
 }else{
  let rows;
  if(action==='import-sqlite'){
   const db=new DatabaseSync(file,{readOnly:true});
   try{db.exec('BEGIN');rows=Object.fromEntries(tables.map(t=>[t,db.prepare('SELECT * FROM '+t).all()]));db.exec('COMMIT')}finally{db.close()}
  }else{const backup=JSON.parse(readFileSync(file,'utf8'));if(backup.format!=='bautec-private-v1')throw Error('Formato inválido');rows=backup.rows}
  if(!tables.every(t=>Array.isArray(rows?.[t]))||rows.state.length!==1||rows.state[0].id!==1)throw Error('Respaldo incompleto');
  JSON.parse(rows.state[0].payload);
  await sql.transaction(async()=>{
   if(Number((await sql.prepare('SELECT count(*) AS n FROM users').get()).n)||Number((await sql.prepare('SELECT revision FROM state WHERE id=1').get()).revision)||Number((await sql.prepare('SELECT count(*) AS n FROM audit').get()).n))throw Error('El destino ya contiene datos: no se sobrescribe.');
   await sql.prepare('DELETE FROM state').run();
   for(const t of tables)for(const row of rows[t])await sql.prepare('INSERT INTO '+t+' ('+columns[t].join(',')+') VALUES ('+columns[t].map(()=>'?').join(',')+')').run(...columns[t].map(c=>row[c]??null));
   await sql.prepare("SELECT setval(pg_get_serial_sequence('bautec.audit','id'),GREATEST(COALESCE((SELECT MAX(id) FROM audit),0),1),(SELECT count(*)>0 FROM audit))").get();
  });
  console.log('Datos, usuarios e historial trasladados. Iniciar sesión de nuevo: no se trasladan sesiones.');
 }
}finally{await sql.close()}
