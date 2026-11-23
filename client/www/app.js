const $=s=>document.querySelector(s),M=$('#m');
let API=localStorage.api||'',T=localStorage.t||'',U=null,cur=null,timer=null;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function api(p,method='GET',body){const r=await fetch(API+'/api'+p,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+T},body:body&&JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.e||'Lỗi '+r.status);return j}
const go=f=>f().catch(e=>alert(e.message));
const toast=t=>{const d=document.createElement('div');d.textContent=t;d.style='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#7c3aed;padding:10px 16px;border-radius:20px;z-index:9';document.body.append(d);setTimeout(()=>d.remove(),2500)};
const staff=()=>U&&['mod','admin'].includes(U.role),canPost=()=>U&&['author','mod','admin'].includes(U.role);

async function home(){clearTimeout(timer);try{U=T?await api('/me'):null}catch{U=null}
 $('#nav').innerHTML=U?`<button onclick="go(me)">${esc(U.name)} · ${esc(U.realm)}</button>`:'';
 if(!U)return login();const s=await api('/stories');
 M.innerHTML=`<div class="row"><button onclick="go(rank)">🏆 BXH</button>${canPost()?'<button onclick="newStory()">✍️ Đăng truyện</button>':''}${staff()?'<button onclick="go(users)">👥 Quản lý</button>':''}</div>`+
 s.map(x=>`<div class="card" onclick="go(()=>story(${x.id}))"><b>${esc(x.title)}</b><br><small>${esc(x.author)} · ${x.n} chương</small><p>${esc(x.desc)}</p></div>`).join('')}
function login(){M.innerHTML=`<div class="card"><input id="sv" placeholder="Địa chỉ server (để trống nếu cùng domain)" value="${esc(API)}"><input id="un" placeholder="Tên đăng nhập"><input id="pw" type="password" placeholder="Mật khẩu"><div class="row"><button onclick="auth('login')">Đăng nhập</button><button onclick="auth('register')">Đăng ký</button></div></div>`}
async function auth(k){API=$('#sv').value.trim().replace(/\/$/,'');localStorage.api=API;try{const r=await api('/'+k,'POST',{name:$('#un').value,pass:$('#pw').value});T=localStorage.t=r.token;home()}catch(e){alert(e.message)}}
async function story(id){clearTimeout(timer);const s=await api('/stories/'+id);
 M.innerHTML=`<button onclick="home()">←</button><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p>
 <div class="card row"><button onclick="dl()">⬇️ Tải audio các chương đã chọn (gộp)</button><label><input type="checkbox" onchange="document.querySelectorAll('.ck').forEach(c=>c.checked=this.checked)"> Chọn tất cả</label>${s.can?`<button onclick="del('stories',${id},0)">Xoá truyện</button>`:''}</div>
 ${s.chapters.map(c=>`<div class="card row"><input type="checkbox" class="ck" value="${c.id}"><span style="flex:1" onclick="go(()=>read(${c.id}))">${esc(c.title)}</span>${s.can?`<button onclick="del('chapters',${c.id},${id})">Xoá</button>`:''}</div>`).join('')}
 ${s.can?`<div class="card"><input id="ct" placeholder="Tên chương"><textarea id="cc" rows="8" placeholder="Nội dung"></textarea><button onclick="addCh(${id})">Đăng chương</button></div>`:''}`}
function dl(){const ids=[...document.querySelectorAll('.ck:checked')].map(c=>c.value).join(',');if(!ids)return alert('Hãy chọn chương');toast('Đang tạo audio, chương dài có thể lâu…');window.open(`${API}/api/audio?ids=${ids}&dl=1&t=${T}`,'_blank')}
async function read(id){clearTimeout(timer);const c=await api('/chapters/'+id);cur=c;
 M.innerHTML=`<div class="row"><button onclick="go(()=>story(${c.storyId}))">← Mục lục</button><select onchange="$('#text').style.fontSize=this.value"><option>16px</option><option>19px</option><option>23px</option></select></div>
 <h3>${esc(c.title)}</h3><audio id="au" controls preload="none" style="width:100%" src="${API}/api/audio?ids=${id}&t=${T}"></audio><div id="text">${esc(c.content)}</div>
 <div class="row">${c.prev?`<button onclick="go(()=>read(${c.prev}))">← Trước</button>`:''}${c.next?`<button onclick="go(()=>read(${c.next}))">Sau →</button>`:''}</div>`;
 timer=setTimeout(()=>prog('read'),20000); let sent=0;
 $('#au').ontimeupdate=e=>{if(!sent&&e.target.currentTime>30){sent=1;prog('listen')}}}
async function prog(t){const r=await api('/progress','POST',{chapterId:cur.id,type:t}).catch(()=>0);if(r&&r.gain){U=r.user;toast(`+${r.gain} exp tu vi`)}}
async function me(){U=await api('/me');M.innerHTML=`<button onclick="home()">←</button><div class="card"><h3>${esc(U.name)} <small>(${U.role})</small></h3><p>${esc(U.realm)}</p><div class="bar"><i style="width:${U.exp/U.need*100}%"></i></div><small>${U.exp}/${U.need} exp</small></div><button onclick="T='';localStorage.t='';home()">Đăng xuất</button>`}
async function rank(){const r=await api('/rank');M.innerHTML='<button onclick="home()">←</button>'+r.map((x,i)=>`<div class="card">#${i+1} ${esc(x.name)} — ${esc(x.realm)}</div>`).join('')}
function newStory(){M.innerHTML=`<button onclick="home()">←</button><div class="card"><input id="st" placeholder="Tên truyện"><textarea id="sd" rows="4" placeholder="Giới thiệu"></textarea><button onclick="go(mk)">Tạo truyện</button></div>`}
async function mk(){const s=await api('/stories','POST',{title:$('#st').value,desc:$('#sd').value});story(s.id)}
async function addCh(id){await api(`/stories/${id}/chapters`,'POST',{title:$('#ct').value,content:$('#cc').value});toast('Đã đăng chương');story(id)}
async function del(k,i,sid){if(!confirm('Xoá?'))return;await api(`/${k}/${i}`,'DELETE');sid?story(sid):home()}
async function users(){const u=await api('/users');M.innerHTML='<button onclick="home()">←</button>'+u.map(x=>`<div class="card row">${esc(x.name)} · ${esc(x.realm)}<select onchange="go(()=>api('/users/${x.id}/role','PUT',{role:this.value}))">${['user','author','mod','admin'].map(r=>`<option ${r==x.role?'selected':''}>${r}</option>`).join('')}</select></div>`).join('')}
home();
