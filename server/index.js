const express=require('express'),cors=require('cors'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),tts=require('google-tts-api'),fs=require('fs'),path=require('path');
const SECRET=process.env.JWT_SECRET||'doi-secret-nay',F=path.join(__dirname,'data.json'),AD=path.join(__dirname,'audio');
fs.mkdirSync(AD,{recursive:true});
let db=fs.existsSync(F)?JSON.parse(fs.readFileSync(F)):{users:[],stories:[],chapters:[],log:{},seq:1};
const save=()=>fs.writeFileSync(F,JSON.stringify(db)),id=()=>db.seq++;
if(!db.users.length){db.users.push({id:id(),name:'admin',hash:bcrypt.hashSync(process.env.ADMIN_PASS||'admin123',8),role:'admin',exp:0,level:0});save()}

// ---- Tu luyện ----
const REALMS=['Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần','Luyện Hư','Hợp Thể','Đại Thừa','Độ Kiếp','Chân Tiên'];
const need=l=>Math.floor(100*Math.pow(l+1,1.4));
function addExp(u,n){u.exp+=n;while(u.exp>=need(u.level)){u.exp-=need(u.level);u.level++}}
const info=u=>({id:u.id,name:u.name,role:u.role,exp:u.exp,level:u.level,need:need(u.level),realm:REALMS[Math.min(Math.floor(u.level/9),9)]+' tầng '+(u.level%9+1)});
const EXP={read:10,listen:15}; // exp người đọc; tác giả nhận 1/2

// ---- Auth ----
const auth=roles=>(q,s,n)=>{try{const t=(q.headers.authorization||'').slice(7)||q.query.t;const p=jwt.verify(t,SECRET);q.u=db.users.find(x=>x.id==p.id);if(!q.u)throw 0;if(roles&&!roles.includes(q.u.role))return s.status(403).json({e:'Không đủ quyền'});n()}catch{s.status(401).json({e:'Chưa đăng nhập'})}};
const A=auth(),STAFF=['mod','admin'],canEdit=(u,s)=>s&&(s.authorId==u.id||STAFF.includes(u.role));
const app=express();app.use(cors(),express.json({limit:'5mb'}),express.static(path.join(__dirname,'../client/www')));

app.post('/api/register',(q,s)=>{const{name,pass}=q.body;if(!name||!pass||pass.length<6)return s.status(400).json({e:'Cần tên và mật khẩu ≥ 6 ký tự'});if(db.users.some(x=>x.name==name))return s.status(400).json({e:'Tên đã tồn tại'});const u={id:id(),name,hash:bcrypt.hashSync(pass,8),role:'user',exp:0,level:0};db.users.push(u);save();s.json({token:jwt.sign({id:u.id},SECRET)})});
app.post('/api/login',(q,s)=>{const u=db.users.find(x=>x.name==q.body.name);if(!u||!bcrypt.compareSync(q.body.pass||'',u.hash))return s.status(400).json({e:'Sai tài khoản hoặc mật khẩu'});s.json({token:jwt.sign({id:u.id},SECRET)})});
app.get('/api/me',A,(q,s)=>s.json(info(q.u)));
app.get('/api/rank',A,(q,s)=>s.json([...db.users].sort((a,b)=>b.level-a.level||b.exp-a.exp).slice(0,20).map(info)));

// ---- Truyện / chương ----
app.get('/api/stories',A,(q,s)=>s.json(db.stories.map(x=>({...x,n:db.chapters.filter(c=>c.storyId==x.id).length}))));
app.get('/api/stories/:id',A,(q,s)=>{const x=db.stories.find(v=>v.id==q.params.id);if(!x)return s.status(404).json({e:'Không có truyện'});s.json({...x,can:canEdit(q.u,x),chapters:db.chapters.filter(c=>c.storyId==x.id).map(({id,title})=>({id,title}))})});
app.post('/api/stories',auth(['author',...STAFF]),(q,s)=>{if(!q.body.title)return s.status(400).json({e:'Thiếu tên truyện'});const x={id:id(),title:q.body.title,desc:q.body.desc||'',authorId:q.u.id,author:q.u.name};db.stories.push(x);save();s.json(x)});
app.post('/api/stories/:id/chapters',auth(['author',...STAFF]),(q,s)=>{const x=db.stories.find(v=>v.id==q.params.id);if(!canEdit(q.u,x))return s.status(403).json({e:'Không phải truyện của bạn'});if(!q.body.title||!q.body.content)return s.status(400).json({e:'Thiếu tên/nội dung'});const c={id:id(),storyId:x.id,title:q.body.title,content:q.body.content};db.chapters.push(c);save();s.json({id:c.id})});
app.get('/api/chapters/:id',A,(q,s)=>{const c=db.chapters.find(v=>v.id==q.params.id);if(!c)return s.status(404).json({e:'Không có chương'});const l=db.chapters.filter(v=>v.storyId==c.storyId),i=l.indexOf(c);s.json({...c,prev:l[i-1]?.id,next:l[i+1]?.id})});
app.delete('/api/stories/:id',A,(q,s)=>{const x=db.stories.find(v=>v.id==q.params.id);if(!canEdit(q.u,x))return s.status(403).json({e:'Không đủ quyền'});db.stories=db.stories.filter(v=>v!=x);db.chapters=db.chapters.filter(c=>c.storyId!=x.id);save();s.json({})});
app.delete('/api/chapters/:id',A,(q,s)=>{const c=db.chapters.find(v=>v.id==q.params.id),x=c&&db.stories.find(v=>v.id==c.storyId);if(!canEdit(q.u,x))return s.status(403).json({e:'Không đủ quyền'});db.chapters=db.chapters.filter(v=>v!=c);save();s.json({})});

// ---- Phân quyền ----
app.get('/api/users',auth(STAFF),(q,s)=>s.json(db.users.map(info)));
app.put('/api/users/:id/role',auth(STAFF),(q,s)=>{const u=db.users.find(v=>v.id==q.params.id),R=q.body.role,ok=q.u.role=='admin'?['user','author','mod','admin']:['user','author'];if(!u||!ok.includes(R)||!ok.includes(u.role))return s.status(403).json({e:'Không đủ quyền'});u.role=R;save();s.json({})});

// ---- Cộng exp (mỗi chương/loại/ngày 1 lần) ----
app.post('/api/progress',A,(q,s)=>{const{chapterId,type}=q.body,c=db.chapters.find(v=>v.id==chapterId);if(!c||!EXP[type])return s.status(400).json({e:'Sai dữ liệu'});
const k=`${q.u.id}:${chapterId}:${type}:${new Date().toISOString().slice(0,10)}`;if(db.log[k])return s.json({gain:0,user:info(q.u)});db.log[k]=1;
const g=EXP[type];addExp(q.u,g);const x=db.stories.find(v=>v.id==c.storyId),au=x&&db.users.find(u=>u.id==x.authorId);if(au&&au.id!=q.u.id)addExp(au,Math.ceil(g/2));save();s.json({gain:g,user:info(q.u)})});

// ---- Audio: giọng Google tạo ở server, cache theo chương, gộp nhiều chương ----
async function mp3(c){const f=path.join(AD,c.id+'.mp3');if(!fs.existsSync(f)){const urls=tts.getAllAudioUrls(c.title+'. '+c.content,{lang:'vi',splitPunct:',.?!;:'}),b=[];for(const u of urls){const r=await fetch(u.url);if(!r.ok)throw new Error('Google TTS '+r.status);b.push(Buffer.from(await r.arrayBuffer()))}fs.writeFileSync(f,Buffer.concat(b))}return f}
app.get('/api/audio',A,async(q,s)=>{try{const cs=String(q.query.ids||'').split(',').slice(0,50).map(i=>db.chapters.find(c=>c.id==i)).filter(Boolean);if(!cs.length)return s.status(404).json({e:'Không có chương'});
const files=[];for(const c of cs)files.push(await mp3(c));
if(q.query.dl)s.attachment(`audio-${cs.length}-chuong.mp3`);
if(files.length==1)return s.sendFile(files[0]);
s.type('audio/mpeg').send(Buffer.concat(files.map(f=>fs.readFileSync(f))))}catch(e){s.status(500).json({e:'Lỗi tạo audio: '+e.message})}});

app.listen(process.env.PORT||3000,()=>console.log('Server chạy cổng',process.env.PORT||3000));
