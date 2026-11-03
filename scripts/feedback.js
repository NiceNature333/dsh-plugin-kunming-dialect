import {Feedback} from '../src/feedback.js';
// Local administrator CLI: node scripts/feedback.js DB SCOPE list|review|delete [ID] [STATUS] [MEANING]
const [path,scope,action,id,status,meaning]=process.argv.slice(2);
if(!path||!scope||!['list','review','delete'].includes(action))throw Error('Usage: DB SCOPE list|review|delete [ID] [STATUS] [MEANING]');
const f=new Feedback(path);
try{console.log(JSON.stringify(action==='list'?f.list(scope):action==='delete'?f.delete(id,scope):f.review(id,scope,{status,meaning}),null,2));}finally{f.close();}
