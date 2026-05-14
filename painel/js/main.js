
const SBU='https://mfygixyrefykhfafisif.supabase.co';
const SBK='sb_publishable_vB_KaBk5UJqM7ofDELTV3w_RW6jUH6e';
const APP_VERSION='v1.2.0';

const sb=supabase.createClient(SBU,SBK,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
  realtime:{params:{eventsPerSecond:0}},
  global:{
    fetch:async(url,options={})=>{
      const plainOpts={method:options.method||'GET',body:options.body||undefined,
        headers:options.headers instanceof Headers?Object.fromEntries(options.headers.entries()):(options.headers||{})};
      return fetch(url,plainOpts);
    }
  }
});

// ─── GLOBALS ───
let D={notas:[],estoque:[],pedidos:[],clientes:[],consumo:[],prog:[],configs:{},crm_leads:[],crm_historico:[],crm_modelos:[]};
let estCat='todos',pedSt='todos',progSt='todos',notaCatF='todos';
let calYear,calMonth,calView=false;
let currentUser=null; // {id, email, cargo, nome, username, foto_url}

// ─── AUTH INIT ───
document.addEventListener('DOMContentLoaded',async()=>{
  checkSupabaseStatus();
  const {data:{session}}=await sb.auth.getSession();
  if(session){
    await onAuthSuccess(session.user);
  }
  // Enter on password field
  document.getElementById('lg-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
  document.getElementById('lg-email').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('lg-pass').focus();});
});

async function checkSupabaseStatus(){
  const badge=document.getElementById('lg-status-badge');
  const txt=document.getElementById('lg-status-txt');
  try{
    const{error}=await sb.from('clientes').select('id').limit(1);
    if(!error){badge.className='lg-status online';txt.textContent='Online';}
    else{badge.className='lg-status offline';txt.textContent='Offline';}
  }catch{badge.className='lg-status offline';txt.textContent='Offline';}
}

// ─── LOGIN ───
function showRecovery(){document.getElementById('lg-login').style.display='none';document.getElementById('lg-recovery').style.display='block';}
function showLogin(){document.getElementById('lg-recovery').style.display='none';document.getElementById('lg-login').style.display='block';document.getElementById('lg-rec-ok').classList.remove('show');document.getElementById('lg-rec-err').classList.remove('show');}
function togglePW(){const i=document.getElementById('lg-pass');const isText=i.type==='text';i.type=isText?'password':'text';document.getElementById('eye-icon').innerHTML=isText?'<circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>':'<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';}

function showLgErr(msg){const e=document.getElementById('lg-err');e.textContent=msg;e.classList.add('show');}
function hideLgErr(){document.getElementById('lg-err').classList.remove('show');}

async function doLogin(){
  const email=document.getElementById('lg-email').value.trim().toLowerCase();
  const pass=document.getElementById('lg-pass').value;
  hideLgErr();
  if(!email||!pass){showLgErr('Preencha e-mail e senha.');return;}
  // Validate domain
  const isAdmin=email==='mantalrodrigues@gmail.com';
  const isDarvig=email.endsWith('@darvigmolas.com.br');
  if(!isAdmin&&!isDarvig){showLgErr('Acesso permitido apenas para e-mails @darvigmolas.com.br.');return;}
  const btn=document.getElementById('lg-btn');
  btn.disabled=true;
  document.getElementById('lg-btn-label').innerHTML='<div class="lg-btn-spin"></div>';
  const{data,error}=await sb.auth.signInWithPassword({email,password:pass});
  btn.disabled=false;document.getElementById('lg-btn-label').textContent='Entrar';
  if(error){showLgErr(error.message==='Invalid login credentials'?'E-mail ou senha incorretos.':error.message);return;}
  await onAuthSuccess(data.user);
}

async function onAuthSuccess(user){
  // Load or create profile
  let{data:profile}=await sb.from('profiles').select('*').eq('id',user.id).single();
  if(!profile){
    // Auto-assign admin to mantalrodrigues@gmail.com
    const cargo=user.email==='mantalrodrigues@gmail.com'?'admin':'membro';
    const ini=user.email.split('@')[0];
    const{data:np}=await sb.from('profiles').insert({
      id:user.id,email:user.email,nome:ini,username:ini.replace(/[^a-z0-9]/gi,'').toLowerCase(),cargo,foto_url:null
    }).select().single();
    profile=np;
  }
  // Force admin for mantalrodrigues@gmail.com if not already
  if(user.email==='mantalrodrigues@gmail.com'&&profile&&profile.cargo!=='admin'&&profile.cargo!=='console'){
    await sb.from('profiles').update({cargo:'admin'}).eq('id',user.id);
    profile.cargo='admin';
  }
  currentUser={id:user.id,email:user.email,...(profile||{})};
  showApp();
}

async function doLogout(){
  await sb.auth.signOut();
  currentUser=null;
  document.getElementById('profile-dropdown').classList.remove('open');
  document.getElementById('main').style.display='none';
  document.getElementById('sb').style.display='none';
  document.getElementById('xbtn').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('lg-email').value='';
  document.getElementById('lg-pass').value='';
  hideLgErr();
}

async function doRecover(){
  const email=document.getElementById('lg-rec-email').value.trim().toLowerCase();
  const errEl=document.getElementById('lg-rec-err');const okEl=document.getElementById('lg-rec-ok');
  errEl.classList.remove('show');okEl.classList.remove('show');
  if(!email){errEl.textContent='Informe o e-mail.';errEl.classList.add('show');return;}
  const isAdmin=email==='mantalrodrigues@gmail.com';
  const isDarvig=email.endsWith('@darvigmolas.com.br');
  if(!isAdmin&&!isDarvig){errEl.textContent='Acesso permitido apenas para e-mails @darvigmolas.com.br.';errEl.classList.add('show');return;}
  const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});
  if(error){errEl.textContent=error.message;errEl.classList.add('show');}
  else{okEl.classList.add('show');}
}

// ─── SHOW APP ───
async function showApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('sb').style.display='flex';
  document.getElementById('main').style.display='flex';
  const xbtn=document.getElementById('xbtn');if(xbtn)xbtn.style.display='none';
  updateProfileUI();
  const now=new Date();
  calYear=now.getFullYear();calMonth=now.getMonth();
  document.getElementById('tdate').textContent=now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  setupSidebar();setupTabs();
  await loadAll();
  renderDash();
  genAIInsight();
  // Show users section if admin/console
  if(currentUser?.cargo==='admin'||currentUser?.cargo==='console'){
    document.getElementById('cfg-usuarios').style.display='block';
    loadUsuarios();
  }
  
  // Controle de Menu do CRM
  if(currentUser?.cargo==='admin'||currentUser?.cargo==='vendas'){
    const sblC = document.getElementById('sbl-comercial');
    const niC = document.getElementById('ni-crm');
    if(sblC) sblC.style.display='block';
    if(niC) niC.style.display='flex';
  } else {
    const sblC = document.getElementById('sbl-comercial');
    const niC = document.getElementById('ni-crm');
    if(sblC) sblC.style.display='none';
    if(niC) niC.style.display='none';
  }
  // Update system info
  const sEl=document.getElementById('cfg-status');
  if(sEl)sEl.innerHTML='<span style="color:var(--green);font-weight:500;">● Conectado</span>';
  sv('cfg-user-email',currentUser?.email||'—');
  sv('cfg-user-cargo',cargolabel(currentUser?.cargo||'membro'));
}

function cargolabel(c){return{membro:'Membro',admin:'Admin',console:'Console',vendas:'Comercial'}[c]||c;}
function cargoCls(c){return{membro:'p-membro',admin:'p-admin',console:'p-console',vendas:'p-admin'}[c]||'p-membro';}

function updateProfileUI(){
  if(!currentUser)return;
  const ini=getIni(currentUser.nome||currentUser.email);
  const foto=currentUser.foto_url;
  // Topbar chip
  const tbAv=document.getElementById('tb-avatar');
  tbAv.innerHTML=foto?`<img src="${foto}" alt="">`:`<span>${ini}</span>`;
  document.getElementById('tb-name').textContent=currentUser.nome||currentUser.email.split('@')[0];
  document.getElementById('tb-cargo').textContent=cargolabel(currentUser.cargo||'membro');
  // Dropdown
  const ddAv=document.getElementById('dd-avatar');
  ddAv.innerHTML=foto?`<img src="${foto}" alt="">`:`<span>${ini}</span>`;
  document.getElementById('dd-name').textContent=currentUser.nome||'—';
  document.getElementById('dd-email').textContent=currentUser.email;
  const cb=document.getElementById('dd-cargo-badge');
  cb.textContent=cargolabel(currentUser.cargo||'membro');
  cb.className='pd-cargo-badge '+cargoCls(currentUser.cargo);
}

function getIni(name){if(!name)return'?';return name.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('')||'?';}

function toggleProfileDropdown(){
  const dd=document.getElementById('profile-dropdown');
  dd.classList.toggle('open');
}
document.addEventListener('click',e=>{
  const chip=document.getElementById('profile-chip');
  const dd=document.getElementById('profile-dropdown');
  if(chip&&dd&&!chip.contains(e.target)&&!dd.contains(e.target)){dd.classList.remove('open');}
});

// ─── PERFIL ───
function abrirModalPerfil(){
  document.getElementById('profile-dropdown').classList.remove('open');
  if(!currentUser)return;
  sv('pf-nome',currentUser.nome||'');sv('pf-username',currentUser.username||'');
  sv('pf-email',currentUser.email||'');sv('pf-cargo-display',cargolabel(currentUser.cargo||'membro'));
  const big=document.getElementById('av-preview-big');
  if(currentUser.foto_url){big.innerHTML=`<img src="${currentUser.foto_url}" alt="">`;}
  else{big.textContent=getIni(currentUser.nome||currentUser.email);}
  big.style.background=currentUser.foto_url?'transparent':'var(--accent)';
  OM('mo-perfil');
}
function previewAvatar(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const big=document.getElementById('av-preview-big');
    big.innerHTML=`<img src="${e.target.result}" alt="">`;
    big.style.background='transparent';
  };reader.readAsDataURL(f);
}
async function savePerfil(){
  const nome=v('pf-nome'),username=v('pf-username');
  if(!nome){toast('Informe seu nome','err');return;}
  let fotoUrl=currentUser.foto_url;
  const file=document.getElementById('av-file').files[0];
  if(file){
    if(file.size>2*1024*1024){toast('Foto muito grande (máx 2MB)','err');return;}
    const ext=file.name.split('.').pop();
    const path=`avatars/${currentUser.id}.${ext}`;
    const{error:upe}=await sb.storage.from('perfis').upload(path,file,{upsert:true});
    if(!upe||upe.message?.includes('DataClone')){
      fotoUrl=sb.storage.from('perfis').getPublicUrl(path).data.publicUrl+'?t='+Date.now();
    }
  }
  const{error}=await sb.from('profiles').update({nome,username,foto_url:fotoUrl}).eq('id',currentUser.id);
  if(error&&!error.message?.includes('DataClone')){toast('Erro: '+error.message,'err');return;}
  currentUser={...currentUser,nome,username,foto_url:fotoUrl};
  updateProfileUI();CM('mo-perfil');toast('Perfil atualizado!');
}

// ─── GESTÃO DE USUÁRIOS ───
async function loadUsuarios(){
  const cont=document.getElementById('usuarios-list');
  if(!cont)return;
  cont.innerHTML='<div class="loading"><div class="spin"></div></div>';
  const{data,error}=await sb.from('profiles').select('*').order('nome');
  if(error||!data){cont.innerHTML='<div class="empty"><p>Erro ao carregar usuários</p></div>';return;}
  if(!data.length){cont.innerHTML='<div class="empty"><p>Nenhum usuário cadastrado ainda</p></div>';return;}
  cont.innerHTML=data.map(u=>{
    const ini=getIni(u.nome||u.email||'?');
    const canEdit=(currentUser?.cargo==='console')||(currentUser?.cargo==='admin'&&u.cargo!=='console');
    return`<div class="user-row">
      <div class="user-av">${u.foto_url?`<img src="${u.foto_url}" alt="">`:`<span>${ini}</span>`}</div>
      <div class="user-info">
        <div class="user-name">${u.nome||'—'} ${u.username?'<span style="color:var(--text3);font-size:11px;">@'+u.username+'</span>':''}</div>
        <div class="user-email">${u.email||'—'}</div>
      </div>
      <span class="pill ${cargoCls(u.cargo||'membro')}">${cargolabel(u.cargo||'membro')}</span>
      ${canEdit&&u.id!==currentUser?.id?`<button class="btn bsm bw" onclick="abrirEditCargo('${u.id}','${esc(u.nome||u.email||'')}','${u.cargo||'membro'}')">Cargo</button>`:''}
    </div>`;
  }).join('');
}

function abrirEditCargo(uid,nome,cargo){
  sv('ec-uid',uid);svt('ec-user-info',nome);sv('ec-cargo',cargo);OM('mo-edit-cargo');
}
async function salvarCargo(){
  const uid=v('ec-uid'),cargo=v('ec-cargo');
  // Console-only protection: only console can set/change console role
  if(cargo==='console'&&currentUser?.cargo!=='console'){toast('Apenas Console pode atribuir esse cargo','err');return;}
  const{error}=await sb.from('profiles').update({cargo}).eq('id',uid);
  if(error){toast('Erro: '+error.message,'err');return;}
  CM('mo-edit-cargo');toast('Cargo atualizado!');loadUsuarios();
}

// ─── SIDEBAR ───
function setupSidebar(){
  document.getElementById('tgbtn').onclick=()=>{document.getElementById('sb').classList.add('off');document.getElementById('main').classList.add('full');};
  document.getElementById('xbtn').onclick=()=>{document.getElementById('sb').classList.remove('off');document.getElementById('main').classList.remove('full');};
  document.querySelectorAll('.ni[data-page]').forEach(el=>{el.addEventListener('click',()=>showPage(el.dataset.page));});
}
function showPage(p){
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.querySelector(`.ni[data-page="${p}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  
  // Bloqueio de rota direta CRM
  if(p === 'crm' && (currentUser?.cargo!=='admin' && currentUser?.cargo!=='vendas')){
    p = 'dashboard';
  }
  
  document.getElementById('page-'+p)?.classList.add('active');
  const titles={dashboard:'Dashboard',programacao:'Programação de Produção',pedidos:'Pedidos',estoque:'Estoque Industrial',clientes:'Clientes',notas:'Notas Fiscais',configuracoes:'Configurações',crm:'CRM Comercial'};
  document.getElementById('page-title').textContent=titles[p]||p;
  if(p==='configuracoes'){
    if(currentUser?.cargo==='admin'||currentUser?.cargo==='console')loadUsuarios();
    document.getElementById('cfg-status').innerHTML='<span style="color:var(--green);font-weight:500;">● Conectado</span>';
    sv('cfg-user-email',currentUser?.email||'—');
    document.getElementById('cfg-user-cargo').textContent=cargolabel(currentUser?.cargo||'membro');
  }
}

function setupTabs(){
  document.querySelectorAll('#est-tabs .tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('#est-tabs .tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');estCat=t.dataset.cat;renderEst();}));
  document.querySelectorAll('#ped-tabs .tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('#ped-tabs .tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');pedSt=t.dataset.st;renderPedidos();}));
  document.querySelectorAll('#page-programacao .tabs .tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('#page-programacao .tabs .tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');progSt=t.dataset.ps;renderProg();}));
}

// ─── LOAD ALL ───
async function loadAll(){
  const promises = [
    sb.from('notas_fiscais').select('*').order('created_at',{ascending:false}),
    sb.from('estoque').select('*').order('created_at',{ascending:false}),
    sb.from('pedidos').select('*').order('created_at',{ascending:false}),
    sb.from('clientes').select('*').order('nome'),
    sb.from('consumo_material').select('*').order('created_at',{ascending:false}),
    sb.from('programacao').select('*').order('prazo_entrega'),
    sb.from('configuracoes').select('*')
  ];

  if(currentUser?.cargo==='admin'||currentUser?.cargo==='vendas'){
    promises.push(sb.from('crm_leads').select('*').order('created_at',{ascending:false}));
    promises.push(sb.from('crm_historico').select('*').order('data_contato',{ascending:false}));
    promises.push(sb.from('crm_modelos_mensagem').select('*').order('titulo'));
  }

  const res = await Promise.all(promises);
  
  D.notas=res[0].data||[];D.estoque=res[1].data||[];D.pedidos=res[2].data||[];
  D.clientes=res[3].data||[];D.consumo=res[4].data||[];D.prog=res[5].data||[];
  const cfgs=res[6].data||[];D.configs={};cfgs.forEach(c=>{D.configs[c.chave]=c.valor;});
  
  if(res[7]) D.crm_leads = res[7].data||[];
  if(res[8]) D.crm_historico = res[8].data||[];
  if(res[9]) D.crm_modelos = res[9].data||[];

  renderNotas();renderEst();renderPedidos();renderProg();renderCli();
  if(currentUser?.cargo==='admin'||currentUser?.cargo==='vendas'){
    if(typeof renderCRM === 'function') renderCRM();
  }
  populateDatalist();updateBadges();
}

function updateBadges(){
  const baixos=getMPBaixas();
  const be=document.getElementById('badge-est');
  if(baixos.length){be.textContent=baixos.length;be.style.display='flex';}else{be.style.display='none';}
  const urgentes=getProgUrgentes();
  const bp=document.getElementById('badge-prog');
  if(urgentes.length){bp.textContent=urgentes.length;bp.style.display='flex';}else{bp.style.display='none';}
}

// ─── CONFIGS ───
async function saveConfigs(){
  const pct=document.getElementById('cfg-pct').value||'20';
  const kg=document.getElementById('cfg-kg').value||'50';
  const prazo=document.getElementById('cfg-prazo').value||'30';
  await sb.from('configuracoes').upsert([{chave:'alerta_estoque_pct',valor:pct},{chave:'alerta_estoque_kg',valor:kg},{chave:'alerta_prazo_dias',valor:prazo}],{onConflict:'chave'});
  D.configs={alerta_estoque_pct:pct,alerta_estoque_kg:kg,alerta_prazo_dias:prazo};
  toast('Configurações salvas!');renderDash();updateBadges();
}
function loadConfigsUI(){
  sv('cfg-pct',D.configs.alerta_estoque_pct||'20');
  sv('cfg-kg',D.configs.alerta_estoque_kg||'50');
  sv('cfg-prazo',D.configs.alerta_prazo_dias||'30');
}

// ─── AI INSIGHT ───
async function genAIInsight(){
  const el=document.getElementById('ai-insight');if(!el)return;
  const wrap=document.getElementById('ai-insight-card');
  if(wrap)wrap.classList.add('thinking');
  el.innerHTML='<span class="ai-spin"></span> Analisando dados...';
  const mpBaixos=getMPBaixas();const urgentes=getProgUrgentes();
  const inativos=getInativosList(60);const consumoMensal=calcConsumoMensal();
  const ctx=`Você é um assistente de gestão industrial. Analise os dados a seguir e forneça um insight conciso (2-3 frases) e prático em português, focando no ponto mais crítico para o gestor agir hoje.

Dados:
- Pedidos em aberto: ${D.pedidos.filter(p=>p.status==='aberto').length}
- Itens em programação: ${D.prog.filter(p=>p.status!=='concluido').length}
- Matérias-primas com estoque baixo: ${mpBaixos.map(m=>m.material||m.fornecedor).join(', ')||'nenhuma'}
- Programações com prazo próximo: ${urgentes.length}
- Clientes inativos (+60 dias): ${inativos.length}
- Consumo médio de material último mês (kg): ${consumoMensal.toFixed(1)}
- Total matéria prima disponível (kg): ${D.estoque.filter(e=>e.categoria==='Matéria Prima').reduce((a,e)=>{const c=D.consumo.filter(x=>x.estoque_id===e.id).reduce((s,x)=>s+(x.peso_kg||0),0);return a+(e.peso_disponivel_kg||0)-c;},0).toFixed(1)}

Responda apenas com o insight, sem títulos ou listas.`;
  try{
    const { data, error } = await sb.functions.invoke('ai-insight', {
      body: { prompt: ctx }
    });
    if(error) throw error;
    el.textContent = data.insight || 'Dados insuficientes para análise.';
  }catch(e){
    console.error('Erro na IA:', e);
    el.textContent='Análise indisponível no momento.';
  }finally{
    if(wrap)wrap.classList.remove('thinking');
  }
}

// ─── MP HELPERS ───
function getSaldoMP(id){
  const mp=D.estoque.find(e=>e.id===id);if(!mp)return{saldo:0,total:0};
  const consumido=D.consumo.filter(c=>c.estoque_id===id).reduce((a,c)=>a+(c.peso_kg||0),0);
  const saldo=(mp.peso_disponivel_kg||0)-consumido;
  return{saldo,total:mp.peso_disponivel_kg||0,consumido};
}
function getMPBaixas(){
  const pct=parseFloat(D.configs.alerta_estoque_pct||20)/100;
  const kgLim=parseFloat(D.configs.alerta_estoque_kg||50);
  return D.estoque.filter(e=>e.categoria==='Matéria Prima').filter(e=>{
    const{saldo,total}=getSaldoMP(e.id);return saldo<(total*pct)||saldo<kgLim;
  });
}
function getProgUrgentes(){
  const dias=parseInt(D.configs.alerta_prazo_dias||30);const hoje=new Date();
  return D.prog.filter(p=>p.status!=='concluido').filter(p=>{
    if(!p.prazo_entrega)return false;
    return Math.ceil((new Date(p.prazo_entrega+' 00:00:00')-hoje)/86400000)<=dias;
  });
}
function getInativosList(dias){
  const hoje=new Date();
  return D.clientes.filter(c=>{
    const peds=D.pedidos.filter(p=>p.nome_empresa===c.nome);
    if(!peds.length)return true;
    const ultima=new Date(Math.max(...peds.map(p=>new Date(p.data_pedido||p.created_at))));
    return Math.floor((hoje-ultima)/86400000)>=dias;
  });
}
function calcConsumoMensal(){
  const umMesAtras=new Date();umMesAtras.setMonth(umMesAtras.getMonth()-1);
  return D.consumo.filter(c=>new Date(c.created_at)>=umMesAtras).reduce((a,c)=>a+(c.peso_kg||0),0);
}

// ─── DASHBOARD ───
function renderDash(){
  document.getElementById('m-ped').textContent=D.pedidos.filter(p=>p.status==='aberto').length;
  document.getElementById('m-prog').textContent=D.prog.filter(p=>p.status!=='concluido').length;
  document.getElementById('m-est').textContent=D.estoque.length;
  document.getElementById('m-cli').textContent=D.clientes.length;
  renderDashEstoqueAlerta();renderDashPrazos();renderDashUltimosPeds();renderDashEstChart();renderInativos();loadConfigsUI();
}
function renderDashEstoqueAlerta(){
  const baixos=getMPBaixas();const cont=document.getElementById('dash-mp-baixa');
  if(!baixos.length){cont.innerHTML='<div class="empty"><p style="display:flex;align-items:center;justify-content:center;gap:6px;"><i class="ph-fill ph-check-circle" style="color:var(--green)"></i> Todos os materiais dentro do limiar</p></div>';return;}
  cont.innerHTML=baixos.map(e=>{
    const{saldo,total}=getSaldoMP(e.id);const pct=total>0?Math.round((saldo/total)*100):0;
    const cor=pct<10?'var(--red)':pct<20?'var(--amber)':'var(--green)';
    return`<div class="alert-item" onclick="showPage('estoque')">
      <div><div style="font-size:13px;font-weight:500;">${e.material||'—'}<span style="font-size:11px;color:var(--text3);margin-left:6px;">${e.fornecedor||''}</span></div>
      <div class="pbar-wrap"><div class="pbar" style="width:${Math.max(pct,2)}%;background:${cor};"></div></div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">${saldo.toFixed(2)} kg restantes (${pct}%)</div></div>
      <span class="abadge ${pct<10?'a-crit':'a-warn'}">${pct<10?'Crítico':'Baixo'}</span>
    </div>`;
  }).join('');
}
function renderDashPrazos(){
  const urgentes=getProgUrgentes();const dias=D.configs.alerta_prazo_dias||30;
  document.getElementById('prazo-alerta-sub').textContent=`prazos em até ${dias} dias`;
  const cont=document.getElementById('dash-prazo-lista');
  if(!urgentes.length){cont.innerHTML='<div class="empty"><p style="display:flex;align-items:center;justify-content:center;gap:6px;"><i class="ph-fill ph-check-circle" style="color:var(--green)"></i> Nenhum prazo crítico no período</p></div>';return;}
  const hoje=new Date();
  cont.innerHTML=urgentes.slice(0,5).map(p=>{
    const diff=Math.ceil((new Date(p.prazo_entrega+' 00:00:00')-hoje)/86400000);
    const cls=diff<0?'a-crit':diff<7?'a-warn':'a-ok';
    const label=diff<0?`${Math.abs(diff)}d atrasado`:diff===0?'Hoje':`${diff}d`;
    return`<div class="alert-item" onclick="abrirDetProg('${p.id}')">
      <div><div style="font-size:13px;font-weight:500;">${p.nome_empresa}</div><div style="font-size:11px;color:var(--text3);">${p.denominacao||'—'} · ${fmtDate(p.prazo_entrega)}</div></div>
      <span class="abadge ${cls}">${label}</span>
    </div>`;
  }).join('');
}
function renderDashUltimosPeds(){
  const cont=document.getElementById('dash-peds');
  if(!D.pedidos.length){cont.innerHTML='<div class="empty"><p>Nenhum pedido</p></div>';return;}
  cont.innerHTML=D.pedidos.slice(0,5).map(p=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);">
      <div><div style="font-size:13px;font-weight:500;">${p.nome_empresa}</div><div style="font-size:11px;color:var(--text3);">OS: ${p.numero_os||'—'} · ${fmtDate(p.data_pedido)}</div></div>
      <span class="pill p-${p.status}">${slabel(p.status)}</span>
    </div>`).join('');
}
function renderDashEstChart(){
  const cats={'Molas':0,'Artefatos de Arame':0,'Matéria Prima':0};
  D.estoque.forEach(e=>{if(cats[e.categoria]!==undefined)cats[e.categoria]++;});
  const max=Math.max(...Object.values(cats),1);
  document.getElementById('dash-est-chart').innerHTML=Object.entries(cats).map(([cat,n])=>`
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px;">
      <div style="font-size:12px;color:var(--text2);width:130px;flex-shrink:0;">${cat}</div>
      <div style="flex:1;background:var(--bg3);border-radius:3px;height:18px;overflow:hidden;"><div style="height:100%;background:var(--accent);width:${Math.round((n/max)*100)}%;border-radius:3px;opacity:.85;"></div></div>
      <div style="font-size:11.5px;font-family:monospace;color:var(--text3);width:20px;text-align:right;">${n}</div>
    </div>`).join('');
}
function renderInativos(){
  const limiar=parseInt(document.getElementById('inativo-limiar').value)||60;
  const hoje=new Date();
  const lista=D.clientes.map(c=>{
    const peds=D.pedidos.filter(p=>p.nome_empresa===c.nome);
    if(!peds.length)return{c,dias:9999,ultima:null};
    const ultima=new Date(Math.max(...peds.map(p=>new Date(p.data_pedido||p.created_at))));
    return{c,dias:Math.floor((hoje-ultima)/86400000),ultima};
  }).filter(x=>x.dias>=limiar).sort((a,b)=>b.dias-a.dias);
  const cont=document.getElementById('dash-inativos');
  if(!lista.length){cont.innerHTML=`<div class="empty"><p style="display:flex;align-items:center;justify-content:center;gap:6px;"><i class="ph-fill ph-party-popper"></i> Todos os clientes pediram nos últimos ${limiar} dias</p></div>`;return;}
  cont.innerHTML=lista.map(({c,dias,ultima})=>{
    const cls=dias>180?'a-crit':dias>90?'a-warn':'a-ok';
    return`<div class="alert-item" onclick="abrirDetCli('${c.id}')">
      <div><div style="font-size:13px;font-weight:500;">${c.nome}</div><div style="font-size:11px;color:var(--text3);">${ultima?'Último: '+fmtDate(ultima.toISOString().slice(0,10)):'Sem pedidos'}</div></div>
      <span class="abadge ${cls}">${dias===9999?'Nunca':dias+'d'}</span>
    </div>`;
  }).join('');
}

// ─── NOTAS ───
function setNcat(el,cat){document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');notaCatF=cat;filterNotas();}
function filterNotas(){
  const q=(document.getElementById('search-nota')?.value||'').toLowerCase();
  let f=D.notas;
  if(notaCatF!=='todos')f=f.filter(n=>n.categoria===notaCatF);
  if(q)f=f.filter(n=>n.nome.toLowerCase().includes(q));
  const tb=document.getElementById('nota-tbody');
  if(!f.length){tb.innerHTML='<tr><td colspan="4"><div class="empty"><p>Nenhuma nota</p></div></td></tr>';return;}
  tb.innerHTML=f.map(n=>`<tr>
    <td style="font-weight:500;">${n.nome}</td>
    <td><span class="pill ${n.categoria==='fornecedor'?'p-forn':'p-cli'}">${n.categoria==='fornecedor'?'Fornecedor':'Cliente'}</span></td>
    <td style="color:var(--text3);">${fmtDT(n.created_at)}</td>
    <td><div style="display:flex;gap:5px;">
      ${n.arquivo_url?`<button class="btn bsm" onclick="prevPDF('${n.arquivo_url}','${esc(n.nome)}')">Ver</button>`:'<span style="font-size:11px;color:var(--text3)">Sem arquivo</span>'}
      <button class="btn bsm bd" onclick="delNota('${n.id}')">✕</button>
    </div></td>
  </tr>`).join('');
}
function renderNotas(){filterNotas();}
function abrirModalNota(){sv('nota-nome','');document.getElementById('nota-file').value='';svt('nota-fn','Nenhum arquivo');document.getElementById('nota-drop').classList.remove('has');OM('mo-nota');}
async function saveNota(){
  const nome=v('nota-nome'),cat=v('nota-cat');if(!nome){toast('Informe o nome','err');return;}
  let url=null;const file=document.getElementById('nota-file').files[0];
  if(file)url=await upFile(file,'notas-fiscais','notas/');
  await sb.from('notas_fiscais').insert({nome,categoria:cat,arquivo_url:url});
  toast('Nota salva!');CM('mo-nota');
  const{data}=await sb.from('notas_fiscais').select('*').order('created_at',{ascending:false});
  D.notas=data||[];renderNotas();
}
window.delNota=async function(id){
  event?.stopPropagation?.();if(!confirm('Excluir nota fiscal?'))return;
  await sb.from('notas_fiscais').delete().eq('id',id);
  D.notas=D.notas.filter(n=>n.id!==id);renderNotas();toast('Nota excluída');
}

// ─── ESTOQUE ───
function toggleEstForm(){
  const cat=v('est-cat');
  document.getElementById('ef-pad').style.display=cat==='Matéria Prima'?'none':'block';
  document.getElementById('ef-mp').style.display=cat==='Matéria Prima'?'block':'none';
}
function renderEst(){
  const cat=estCat;const mp=cat==='Matéria Prima';
  document.getElementById('est-thead').innerHTML=mp
    ?'<tr><th>Fornecedor</th><th>Material</th><th>Saldo / Disponível</th><th>Consumido</th><th>Previsto</th><th>Data</th><th>Ações</th></tr>'
    :'<tr><th>Categoria</th><th>Empresa</th><th>OS / Denominação</th><th>Material</th><th>Qtd</th><th>Peso (kg)</th><th>Data</th><th>Ações</th></tr>';
  const q=(document.getElementById('search-est')?.value||'').toLowerCase();
  let f=D.estoque;
  if(cat!=='todos')f=f.filter(e=>e.categoria===cat);
  if(q)f=f.filter(e=>[e.nome_empresa,e.numero_os,e.denominacao,e.material,e.fornecedor].join(' ').toLowerCase().includes(q));
  const tb=document.getElementById('est-tbody');
  if(!f.length){tb.innerHTML='<tr><td colspan="8"><div class="empty"><p>Nenhum item</p></div></td></tr>';return;}
  const pct=parseFloat(D.configs.alerta_estoque_pct||20)/100;const kgLim=parseFloat(D.configs.alerta_estoque_kg||50);
  if(mp){
    tb.innerHTML=f.map(e=>{
      const{saldo,total,consumido}=getSaldoMP(e.id);
      const pctV=total>0?Math.round((saldo/total)*100):0;const isBaixo=saldo<(total*pct)||saldo<kgLim;
      const cor=saldo<kgLim||pctV<10?'var(--red)':pctV<20?'var(--amber)':'var(--green)';
      const cons=D.consumo.filter(c=>c.estoque_id===e.id);
      const progItens=D.prog.filter(p=>p.estoque_material_id===e.id&&p.status!=='concluido');
      const previsto=progItens.reduce((a,p)=>a+(p.peso_material_usado_kg||0),0);
      return`<tr style="${isBaixo?'background:#fffbf0;':''}">
        <td style="font-weight:500;">${e.fornecedor||'—'}</td><td>${e.material||'—'}</td>
        <td><div style="font-family:monospace;font-size:13px;font-weight:500;color:${cor};">${saldo.toFixed(2)} kg</div>
          <div style="font-size:11px;color:var(--text3);">de ${total.toFixed(2)} kg</div>
          <div class="pbar-wrap"><div class="pbar" style="width:${Math.max(Math.min(pctV,100),1)}%;background:${cor};"></div></div>
          ${isBaixo?'<div style="font-size:10px;color:var(--red);font-weight:600;margin-top:3px;display:flex;align-items:center;gap:3px;"><i class="ph-fill ph-warning"></i> Estoque baixo</div>':''}</td>
        <td style="font-size:12px;">${cons.length?`<span style="font-size:11px;">${consumido.toFixed(2)} kg</span>`:'<span style="color:var(--text3);font-size:11px;">—</span>'}</td>
        <td style="font-size:12px;">${progItens.length?`<span style="font-size:11px;">${previsto.toFixed(2)} kg (${progItens.length}x)</span>`:'<span style="color:var(--text3);font-size:11px;">—</span>'}</td>
        <td style="color:var(--text3);">${fmtDate(e.data_entrada)}</td>
        <td><div style="display:flex;gap:3px;flex-wrap:wrap;">
          ${e.nota_fiscal_url?`<button class="btn bsm" onclick="prevPDF('${e.nota_fiscal_url}','NF')">NF</button>`:''}
          <button class="btn bsm" onclick="editEst('${e.id}')">Editar</button>
          <button class="btn bsm" onclick="abrirConsumoDet('${e.id}','${esc(e.material||'')}')">Consumo</button>
          <button class="btn bsm bd" onclick="delEst('${e.id}')">✕</button>
        </div></td>
      </tr>`;
    }).join('');
  } else {
    tb.innerHTML=f.map(e=>`<tr>
      <td><span class="pill ${catCls(e.categoria)}">${e.categoria}</span></td>
      <td style="font-weight:500;">${e.nome_empresa||'—'}</td>
      <td><div style="font-size:11px;color:var(--text3);">${e.numero_os||''}</div><div>${e.denominacao||'—'}</div></td>
      <td style="color:var(--text2);">${e.material||'—'}</td>
      <td style="font-family:monospace;">${(e.quantidade_pecas||0).toLocaleString('pt-BR')}</td>
      <td style="font-family:monospace;">${(e.peso_lote_kg||0).toFixed(2)} kg</td>
      <td style="color:var(--text3);">${fmtDate(e.data_entrada)}</td>
      <td><div style="display:flex;gap:3px;flex-wrap:wrap;">
        ${e.arquivo_os_url?`<button class="btn bsm bi" onclick="prevPDF('${e.arquivo_os_url}','OS')" title="Ver OS"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg></button>`:''}
        <button class="btn bsm" onclick="editEst('${e.id}')">Editar</button>
        <button class="btn bsm" onclick="abrirMov('${e.id}','${esc((e.nome_empresa||'')+' '+(e.numero_os||''))}')">Mov.</button>
        <button class="btn bsm" onclick="abrirHist('${e.id}')">Hist.</button>
        <button class="btn bsm bd" onclick="delEst('${e.id}')">✕</button>
      </div></td>
    </tr>`).join('');
  }
}
function filterEst(){renderEst();}
function abrirNovoEstoque(){
  document.getElementById('est-eid').value='';document.getElementById('est-mt').textContent='Novo Item de Estoque';
  document.getElementById('est-cat').value='';
  ['est-emp','est-os','est-nped','est-denom','est-mat','est-qtd','est-peso','mp-forn','mp-mat','mp-peso'].forEach(x=>sv(x,''));
  sv('est-data','');sv('mp-data','');
  document.getElementById('est-file').value='';document.getElementById('mp-file').value='';
  svt('est-fn','Nenhum arquivo');svt('mp-fn','Nenhum arquivo');
  document.getElementById('est-drop').classList.remove('has');document.getElementById('mp-drop').classList.remove('has');
  document.getElementById('mp-nfurl').value='';toggleEstForm();OM('mo-est');
}
function editEst(id){
  const e=D.estoque.find(x=>x.id===id);if(!e)return;
  document.getElementById('est-eid').value=id;document.getElementById('est-mt').textContent='Editar Item';
  sv('est-cat',e.categoria);toggleEstForm();
  if(e.categoria==='Matéria Prima'){
    sv('mp-forn',e.fornecedor);sv('mp-mat',e.material);sv('mp-peso',e.peso_disponivel_kg);sv('mp-data',e.data_entrada);
    if(e.nota_fiscal_url){document.getElementById('mp-nfurl').value=e.nota_fiscal_url;svt('mp-fn','NF salva');}
  } else {
    sv('est-emp',e.nome_empresa);sv('est-os',e.numero_os);sv('est-nped',e.numero_pedido);
    sv('est-denom',e.denominacao);sv('est-mat',e.material);sv('est-qtd',e.quantidade_pecas);sv('est-peso',e.peso_lote_kg);sv('est-data',e.data_entrada);
    if(e.arquivo_os_url){svt('est-fn','Arquivo salvo');document.getElementById('est-drop').classList.add('has');}
  }
  OM('mo-est');
}
async function saveEst(){
  const cat=v('est-cat');if(!cat){toast('Selecione a categoria','err');return;}
  const eid=v('est-eid');let error;let obj={categoria:cat};
  if(cat==='Matéria Prima'){
    const forn=v('mp-forn'),mat=v('mp-mat');if(!forn||!mat){toast('Informe fornecedor e material','err');return;}
    let nfUrl=eid?(D.estoque.find(x=>x.id===eid)?.nota_fiscal_url||null):null;
    const file=document.getElementById('mp-file').files[0];
    if(file){nfUrl=await upFile(file,'notas-fiscais','notas/');if(nfUrl)await sb.from('notas_fiscais').insert({nome:'NF Fornecedor — '+forn,categoria:'fornecedor',arquivo_url:nfUrl});}
    obj={...obj,fornecedor:forn,material:mat,peso_disponivel_kg:parseFloat(v('mp-peso'))||0,data_entrada:v('mp-data')||null,nota_fiscal_url:nfUrl,nome_empresa:'Darvig Molas',numero_os:'MAT-PRIMA',denominacao:mat,numero_pedido:null,arquivo_os_url:null,quantidade_pecas:0,peso_lote_kg:0};
  } else {
    const emp=v('est-emp'),os=v('est-os');if(!emp||!os){toast('Informe empresa e OS','err');return;}
    let osUrl=eid?(D.estoque.find(x=>x.id===eid)?.arquivo_os_url||null):null;
    const file=document.getElementById('est-file').files[0];if(file)osUrl=await upFile(file,'documentos-os','os/');
    obj={...obj,nome_empresa:emp,numero_os:os,arquivo_os_url:osUrl,numero_pedido:v('est-nped'),denominacao:v('est-denom'),material:v('est-mat'),quantidade_pecas:parseInt(v('est-qtd'))||0,peso_lote_kg:parseFloat(v('est-peso'))||0,data_entrada:v('est-data')||null,fornecedor:null,peso_disponivel_kg:null,nota_fiscal_url:null};
  }
  obj.nome_empresa=obj.nome_empresa||'Darvig Molas';
  if(eid){({error}=await sb.from('estoque').update(obj).eq('id',eid));}else{({error}=await sb.from('estoque').insert(obj));}
  if(error&&!error.message?.includes('DataClone')){toast('Erro: '+error.message,'err');return;}
  toast(eid?'Item atualizado!':'Item adicionado!');CM('mo-est');
  const[er,nr]=await Promise.all([sb.from('estoque').select('*').order('created_at',{ascending:false}),sb.from('notas_fiscais').select('*').order('created_at',{ascending:false})]);
  D.estoque=er.data||[];D.notas=nr.data||[];renderEst();renderNotas();renderDash();updateBadges();populateMPSelect();
}
window.delEst=async function(id){
  event?.stopPropagation?.();if(!confirm('Excluir item do estoque?'))return;
  await sb.from('estoque_historico').delete().eq('estoque_id',id);
  await sb.from('consumo_material').delete().eq('estoque_id',id);
  await sb.from('programacao').update({estoque_material_id:null}).eq('estoque_material_id',id);
  await sb.from('estoque').delete().eq('id',id);
  D.estoque=D.estoque.filter(e=>e.id!==id);D.consumo=D.consumo.filter(c=>c.estoque_id!==id);
  renderEst();renderDash();updateBadges();populateMPSelect();toast('Item excluído');
}
function abrirMov(id,label){sv('mov-id',id);svt('mov-t','Movimentação — '+label);sv('mov-qtd','');sv('mov-peso','');sv('mov-obs','');OM('mo-mov');}
async function saveMov(){
  const id=v('mov-id'),tipo=v('mov-tipo'),qtd=parseInt(v('mov-qtd'))||0,peso=parseFloat(v('mov-peso'))||0,obs=v('mov-obs');
  if(!qtd&&!peso){toast('Informe quantidade ou peso','err');return;}
  await sb.from('estoque_historico').insert({estoque_id:id,tipo,quantidade:qtd,peso_kg:peso,observacao:obs});
  toast('Movimentação registrada!');CM('mo-mov');
}
async function abrirHist(id){
  OM('mo-hist');document.getElementById('hist-list').innerHTML='<div class="loading"><div class="spin"></div></div>';
  const{data}=await sb.from('estoque_historico').select('*').eq('estoque_id',id).order('data',{ascending:false});
  if(!data||!data.length){document.getElementById('hist-list').innerHTML='<div class="empty"><p>Nenhuma movimentação</p></div>';return;}
  document.getElementById('hist-list').innerHTML=data.map(h=>`
    <div class="hi"><div class="hd" style="background:${h.tipo==='entrada'?'var(--green)':'var(--red)'}"></div>
    <div><div class="ha" style="display:flex;align-items:center;gap:4px;">${h.tipo==='entrada'?'<i class="ph-bold ph-arrow-up" style="color:var(--green)"></i> Entrada':'<i class="ph-bold ph-arrow-down" style="color:var(--red)"></i> Saída'} · ${(h.quantidade||0).toLocaleString('pt-BR')} pçs · ${(h.peso_kg||0).toFixed(2)} kg</div>
    <div class="hb">${fmtDT(h.data)}${h.observacao?' · '+h.observacao:''}</div></div></div>`).join('');
}
async function abrirConsumoDet(id,mat){
  svt('cons-t','Consumo — '+mat);OM('mo-cons');
  document.getElementById('cons-list').innerHTML='<div class="loading"><div class="spin"></div></div>';
  const{data}=await sb.from('consumo_material').select('*').eq('estoque_id',id).order('created_at',{ascending:false});
  const total=(data||[]).reduce((a,c)=>a+(c.peso_kg||0),0);
  if(!data||!data.length){document.getElementById('cons-list').innerHTML='<div class="empty"><p>Nenhum consumo</p></div>';return;}
  document.getElementById('cons-list').innerHTML=`<div style="background:var(--amber-l);border-radius:var(--rs);padding:9px 13px;margin-bottom:12px;font-size:13px;color:var(--amber);font-weight:500;">Total consumido: ${total.toFixed(2)} kg</div>`
    +data.map(c=>`<div class="hi"><div class="hd" style="background:var(--amber)"></div><div><div class="ha" style="display:flex;align-items:center;gap:4px;"><i class="ph-bold ph-package"></i> ${c.pedido_empresa||'—'} · OS: ${c.pedido_os||'—'} · ${(c.peso_kg||0).toFixed(2)} kg</div><div class="hb">${fmtDT(c.created_at)}</div></div></div>`).join('');
}

// ─── PEDIDOS ───
function populateMPSelect(){
  const mps=D.estoque.filter(e=>e.categoria==='Matéria Prima');
  const consMap={};D.consumo.forEach(c=>{consMap[c.estoque_id]=(consMap[c.estoque_id]||0)+(c.peso_kg||0);});
  const opts='<option value="">— Selecione —</option>'+mps.map(e=>{
    const saldo=(e.peso_disponivel_kg||0)-(consMap[e.id]||0);
    return`<option value="${e.id}" data-saldo="${saldo.toFixed(2)}">${e.material||'—'} · ${e.fornecedor||'—'} · ${saldo.toFixed(2)} kg</option>`;
  }).join('');
  ['ped-mpid','prog-mpid'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
}
function checkSaldo(prefix){
  const sel=document.getElementById(prefix+'-mpid');const opt=sel?.options[sel.selectedIndex];
  const inf=document.getElementById(prefix+'-saldo-info');const warnEl=document.getElementById(prefix+'-mp-warn');
  if(!opt||!opt.value){if(inf)inf.innerHTML='';return;}
  const saldo=parseFloat(opt.dataset.saldo)||0;const uso=parseFloat(v(prefix+'-mpkg'))||0;const rest=saldo-uso;
  const cor=rest<0?'var(--red)':rest<saldo*.15?'var(--amber)':'var(--green)';
  if(inf)inf.innerHTML=`<span style="color:${cor};font-weight:500;">Saldo: ${saldo.toFixed(2)} kg · Após uso: ${rest.toFixed(2)} kg</span>`;
  if(prefix==='prog'&&warnEl){
    const mpId=opt.value;const outros=D.prog.filter(p=>p.estoque_material_id===mpId&&p.status!=='concluido'&&p.id!==v('prog-eid'));
    if(outros.length){const tp=outros.reduce((a,p)=>a+(p.peso_material_usado_kg||0),0);warnEl.style.display='block';warnEl.innerHTML=`<div style="display:flex;align-items:center;gap:4px;"><i class="ph-fill ph-warning"></i> Material previsto em ${outros.length} item(s):</div> ${outros.map(p=>`<strong>${p.nome_empresa}</strong> (${(p.peso_material_usado_kg||0).toFixed(1)}kg)`).join(', ')} — total: <strong>${tp.toFixed(2)} kg</strong>`;}
    else{warnEl.style.display='none';}
  }
}
function calcPeso(prefix){const qtd=parseFloat(v(prefix+'-qtd'))||0,unit=parseFloat(v(prefix+'-punit'))||0;document.getElementById(prefix+'-ptotal').value=(qtd*unit).toFixed(2);}

function renderPedidos(){
  const q=(document.getElementById('search-ped')?.value||'').toLowerCase();
  let f=D.pedidos;if(pedSt!=='todos')f=f.filter(p=>p.status===pedSt);
  if(q)f=f.filter(p=>[p.nome_empresa,p.numero_os,p.numero_pedido,p.denominacao].join(' ').toLowerCase().includes(q));
  const tb=document.getElementById('ped-tbody');
  if(!f.length){tb.innerHTML='<tr><td colspan="9"><div class="empty"><p>Nenhum pedido</p></div></td></tr>';return;}
  tb.innerHTML=f.map(p=>{
    const tl=Array.isArray(p.timeline)?p.timeline:[];const etapaAtual=tl.filter(e=>e.status==='done').length;const pct=Math.round((etapaAtual/5)*100);
    return`<tr style="cursor:pointer;" onclick="abrirDetPedido('${p.id}')">
      <td style="font-weight:500;">${p.nome_empresa}<div style="font-size:10.5px;color:var(--text3);">${p.material||''}</div></td>
      <td onclick="event.stopPropagation()"><div style="font-size:11px;color:var(--text3);">OS: ${p.numero_os||'—'}</div>${p.numero_pedido?'<div style="font-size:11px;color:var(--text3);">Ped: '+p.numero_pedido+'</div>':''}</td>
      <td>${p.denominacao||'—'}</td>
      <td>${p.material_previsto?'<span style="font-size:12px;font-weight:500;">'+p.material_previsto+'</span><div style="font-size:10.5px;color:var(--amber);">'+(p.peso_material_usado_kg||0).toFixed(2)+' kg</div>':'<span style="font-size:11px;color:var(--text3)">—</span>'}</td>
      <td style="font-family:monospace;">${(p.quantidade_pecas||0).toLocaleString('pt-BR')}</td>
      <td style="font-family:monospace;">${(p.peso_total_estimado||0).toFixed(2)} kg</td>
      <td style="color:var(--text3);font-size:12px;">${fmtDate(p.data_pedido)}</td>
      <td onclick="event.stopPropagation()">
        <span class="pill p-${p.status}" style="cursor:pointer;" onclick="openStatusModal('${p.id}','${p.status}','pedido')">${slabel(p.status)}</span>
        <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
          <div style="flex:1;height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--green);border-radius:2px;"></div></div>
          <span style="font-size:9px;color:var(--text3);">${etapaAtual}/5</span>
        </div>
      </td>
      <td onclick="event.stopPropagation()"><div style="display:flex;gap:3px;flex-wrap:wrap;">
        ${p.arquivo_os_url?`<button class="btn bsm bi" onclick="prevPDF('${p.arquivo_os_url}','OS')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg></button>`:''}
        <button class="btn bsm" onclick="editPed('${p.id}')">Editar</button>
        <button class="btn bsm bd" onclick="delPed('${p.id}')">✕</button>
      </div></td>
    </tr>`;
  }).join('');
}
function filterPedidos(){renderPedidos();}
function abrirNovoPedido(){
  document.getElementById('ped-mt').textContent='Novo Pedido';sv('ped-eid','');
  ['ped-emp','ped-os','ped-nped','ped-denom','ped-mat','ped-qtd','ped-punit','ped-data','ped-prazo','ped-obs','ped-mpkg'].forEach(x=>sv(x,''));
  document.getElementById('ped-ptotal').value='';sv('ped-status','aberto');sv('ped-mpid','');
  document.getElementById('ped-saldo-info').innerHTML='';
  document.getElementById('ped-file').value='';svt('ped-fn','Nenhum arquivo');document.getElementById('ped-drop').classList.remove('has');
  populateMPSelect();OM('mo-ped');
}
function editPed(id){
  const p=D.pedidos.find(x=>x.id===id);if(!p)return;
  document.getElementById('ped-mt').textContent='Editar Pedido';sv('ped-eid',id);
  sv('ped-emp',p.nome_empresa);sv('ped-os',p.numero_os);sv('ped-nped',p.numero_pedido);
  sv('ped-denom',p.denominacao);sv('ped-mat',p.material);sv('ped-qtd',p.quantidade_pecas);
  sv('ped-punit',p.peso_unitario_estimado);document.getElementById('ped-ptotal').value=p.peso_total_estimado||'';
  sv('ped-data',p.data_pedido);sv('ped-obs',p.observacoes);sv('ped-status',p.status);sv('ped-mpkg',p.peso_material_usado_kg);
  if(p.arquivo_os_url){svt('ped-fn','Arquivo salvo');document.getElementById('ped-drop').classList.add('has');}
  else{svt('ped-fn','Nenhum arquivo');document.getElementById('ped-drop').classList.remove('has');}
  populateMPSelect();if(p.estoque_material_id){sv('ped-mpid',p.estoque_material_id);checkSaldo('ped');}
  OM('mo-ped');
}
async function savePedido(){
  const emp=v('ped-emp'),os=v('ped-os'),mpId=v('ped-mpid'),mpKg=parseFloat(v('ped-mpkg'))||0;
  if(!emp||!os){toast('Informe empresa e OS','err');return;}
  if(!mpId||!mpKg){toast('Selecione o material previsto e o peso','err');return;}
  const eid=v('ped-eid');const{saldo}=getSaldoMP(mpId);
  const antConsKg=eid?(D.consumo.find(c=>c.pedido_id===eid)?.peso_kg||0):0;
  if(mpKg>(saldo+antConsKg)&&!confirm(`Usando ${mpKg}kg mas saldo é ${(saldo+antConsKg).toFixed(2)}kg. Continuar?`))return;
  let osUrl=eid?D.pedidos.find(x=>x.id===eid)?.arquivo_os_url:null;
  const file=document.getElementById('ped-file').files[0];if(file)osUrl=await upFile(file,'documentos-os','os/');
  const mp=D.estoque.find(x=>x.id===mpId);
  const obj={nome_empresa:emp,numero_os:os,arquivo_os_url:osUrl,numero_pedido:v('ped-nped'),denominacao:v('ped-denom'),material:v('ped-mat'),
    material_previsto:mp?`${mp.material||''} (${mp.fornecedor||''})`:v('ped-mat'),
    estoque_material_id:mpId,peso_material_usado_kg:mpKg,
    quantidade_pecas:parseInt(v('ped-qtd'))||0,peso_unitario_estimado:parseFloat(v('ped-punit'))||0,
    peso_total_estimado:parseFloat(document.getElementById('ped-ptotal').value)||0,
    data_pedido:v('ped-data')||null,observacoes:v('ped-obs'),status:v('ped-status')};
  let error;
  if(eid){await sb.from('consumo_material').delete().eq('pedido_id',eid);({error}=await sb.from('pedidos').update(obj).eq('id',eid));}
  else{({error}=await sb.from('pedidos').insert(obj));}
  if(error&&!error.message?.includes('DataClone')){toast('Erro: '+error.message,'err');return;}
  const pedRes=eid||((await sb.from('pedidos').select('id').eq('numero_os',os).eq('nome_empresa',emp).order('created_at',{ascending:false}).limit(1)).data?.[0]?.id);
  if(pedRes)await sb.from('consumo_material').insert({estoque_id:mpId,pedido_id:pedRes,pedido_os:os,pedido_empresa:emp,peso_kg:mpKg});
  toast(eid?'Pedido atualizado!':'Pedido salvo!');CM('mo-ped');
  const[pr,cr]=await Promise.all([sb.from('pedidos').select('*').order('created_at',{ascending:false}),sb.from('consumo_material').select('*').order('created_at',{ascending:false})]);
  D.pedidos=pr.data||[];D.consumo=cr.data||[];renderPedidos();renderEst();renderDash();updateBadges();
}
window.delPed=async function(id){
  event?.stopPropagation?.();if(!confirm('Excluir pedido?'))return;
  await sb.from('consumo_material').delete().eq('pedido_id',id);
  await sb.from('pedidos').delete().eq('id',id);
  D.pedidos=D.pedidos.filter(p=>p.id!==id);D.consumo=D.consumo.filter(c=>c.pedido_id!==id);
  renderPedidos();renderEst();renderDash();updateBadges();toast('Pedido excluído');
}

// ─── STATUS ───
function openStatusModal(id,status,tipo){
  sv('status-id',id);sv('status-type',tipo);
  const opts=tipo==='pedido'
    ?'<option value="aberto">Aberto</option><option value="producao">Em Produção</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option>'
    :'<option value="programado">Programado</option><option value="em_producao">Em Produção</option><option value="concluido">Concluído</option><option value="atrasado">Atrasado</option>';
  document.getElementById('status-val').innerHTML=opts;sv('status-val',status);OM('mo-status');
}
async function updateStatus(){
  const id=v('status-id'),tipo=v('status-type'),status=v('status-val');
  const tbl=tipo==='pedido'?'pedidos':'programacao';
  await sb.from(tbl).update({status}).eq('id',id);
  toast('Status atualizado!');CM('mo-status');
  if(tipo==='pedido'){const{data}=await sb.from('pedidos').select('*').order('created_at',{ascending:false});D.pedidos=data||[];renderPedidos();}
  else{const{data}=await sb.from('programacao').select('*').order('prazo_entrega');D.prog=data||[];renderProg();}
  renderDash();updateBadges();
}

// ─── PROGRAMAÇÃO ───
function renderProg(){
  const q=(document.getElementById('search-prog')?.value||'').toLowerCase();
  let f=D.prog;if(progSt!=='todos')f=f.filter(p=>p.status===progSt);
  if(q)f=f.filter(p=>[p.nome_empresa,p.denominacao,p.material].join(' ').toLowerCase().includes(q));
  const board=document.getElementById('prog-board');
  if(!f.length){board.innerHTML='<div class="empty" style="grid-column:1/-1"><p>Nenhum item programado</p></div>';return;}
  const hoje=new Date();
  board.innerHTML=f.map(p=>{
    const diff=p.prazo_entrega?Math.ceil((new Date(p.prazo_entrega+' 00:00:00')-hoje)/86400000):null;
    const prazoCls=diff===null?'ok':diff<0?'overdue':diff<=7?'soon':'ok';
    const prazoLabel=diff===null?'—':diff<0?`${Math.abs(diff)}d atrasado`:diff===0?'Hoje':diff+'d restantes';
    const mp=p.estoque_material_id?D.estoque.find(e=>e.id===p.estoque_material_id):null;
    const{saldo}=mp?getSaldoMP(p.estoque_material_id):{saldo:0};
    return`<div class="prog-card ${p.prioridade||'normal'}" onclick="abrirDetProg('${p.id}')">
      <div class="pc-top">
        <div><div class="pc-empresa">${p.nome_empresa}</div><div class="pc-denom">${p.denominacao||'—'}</div></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <span class="pill p-${p.status}">${slabelProg(p.status)}</span>
          <span class="pill p-${p.prioridade||'normal'}">${(p.prioridade||'normal').charAt(0).toUpperCase()+(p.prioridade||'normal').slice(1)}</span>
        </div>
      </div>
      ${mp?`<div style="margin-top:8px;font-size:11px;padding:6px 8px;background:var(--bg2);border-radius:6px;">
        <span style="color:var(--text3);">Material: </span><strong>${mp.material||'—'}</strong>
        <span style="color:var(--text3);"> · usa </span><strong>${(p.peso_material_usado_kg||0).toFixed(2)} kg</strong>
        <span style="color:var(--text3);"> · saldo: </span><strong style="color:${saldo<(p.peso_material_usado_kg||0)?'var(--red)':'var(--green)'};">${saldo.toFixed(2)} kg</strong>
      </div>`:''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div class="pc-prazo ${prazoCls}" style="display:flex;align-items:center;gap:4px;"><i class="ph-bold ph-calendar-blank"></i> ${fmtDate(p.prazo_entrega)}</div>
        <span class="dias-badge" style="background:${diff===null?'var(--bg3)':diff<0?'var(--red-l)':diff<=7?'var(--amber-l)':'var(--green-l)'};color:${diff===null?'var(--text3)':diff<0?'var(--red)':diff<=7?'var(--amber)':'var(--green)'};">${prazoLabel}</span>
      </div>
    </div>`;
  }).join('');
}
function filterProg(){renderProg();}
function abrirNovaProg(){
  document.getElementById('prog-mt').textContent='Nova Programação';sv('prog-eid','');
  ['prog-emp','prog-denom','prog-mat','prog-qtd','prog-punit','prog-obs','prog-mpkg'].forEach(x=>sv(x,''));
  document.getElementById('prog-ptotal').value='';sv('prog-status','programado');sv('prog-prio','normal');sv('prog-prazo','');sv('prog-mpid','');
  document.getElementById('prog-saldo-info').innerHTML='';const w=document.getElementById('prog-mp-warn');if(w)w.style.display='none';
  document.getElementById('prog-file').value='';svt('prog-fn','Nenhum arquivo');document.getElementById('prog-drop').classList.remove('has');
  populateMPSelect();OM('mo-prog');
}
function editProg(id){
  const p=D.prog.find(x=>x.id===id);if(!p)return;
  document.getElementById('prog-mt').textContent='Editar Programação';sv('prog-eid',id);
  sv('prog-emp',p.nome_empresa);sv('prog-denom',p.denominacao);sv('prog-mat',p.material);
  sv('prog-qtd',p.quantidade_pecas);sv('prog-punit',p.peso_unitario_estimado);document.getElementById('prog-ptotal').value=p.peso_total_estimado||'';
  sv('prog-prazo',p.prazo_entrega);sv('prog-status',p.status);sv('prog-prio',p.prioridade||'normal');sv('prog-obs',p.observacoes);sv('prog-mpkg',p.peso_material_usado_kg);
  if(p.arquivo_os_url){svt('prog-fn','Arquivo salvo');document.getElementById('prog-drop').classList.add('has');}
  populateMPSelect();if(p.estoque_material_id){sv('prog-mpid',p.estoque_material_id);checkSaldo('prog');}
  CM('mo-prog-det');OM('mo-prog');
}
async function saveProg(){
  const emp=v('prog-emp'),prazo=v('prog-prazo');if(!emp||!prazo){toast('Informe empresa e prazo','err');return;}
  const eid=v('prog-eid');let osUrl=eid?D.prog.find(x=>x.id===eid)?.arquivo_os_url:null;
  const file=document.getElementById('prog-file').files[0];if(file)osUrl=await upFile(file,'documentos-os','os/');
  const mpId=v('prog-mpid');const mpKg=parseFloat(v('prog-mpkg'))||0;const mp=mpId?D.estoque.find(x=>x.id===mpId):null;
  const obj={nome_empresa:emp,denominacao:v('prog-denom'),material:v('prog-mat'),
    quantidade_pecas:parseInt(v('prog-qtd'))||0,peso_unitario_estimado:parseFloat(v('prog-punit'))||0,
    peso_total_estimado:parseFloat(document.getElementById('prog-ptotal').value)||0,
    material_previsto:mp?`${mp.material||''} (${mp.fornecedor||''})`:v('prog-mat'),
    estoque_material_id:mpId||null,peso_material_usado_kg:mpKg,
    prazo_entrega:prazo,status:v('prog-status'),prioridade:v('prog-prio'),observacoes:v('prog-obs'),arquivo_os_url:osUrl};
  let error;
  if(eid){({error}=await sb.from('programacao').update(obj).eq('id',eid));}else{({error}=await sb.from('programacao').insert(obj));}
  if(error&&!error.message?.includes('DataClone')){toast('Erro: '+error.message,'err');return;}
  toast(eid?'Atualizado!':'Programação salva!');CM('mo-prog');
  const{data}=await sb.from('programacao').select('*').order('prazo_entrega');D.prog=data||[];
  renderProg();renderDash();updateBadges();renderCal();genAIInsight();
}
window.delProg=async function(id){
  event?.stopPropagation?.();if(!confirm('Excluir programação?'))return;
  await sb.from('programacao').delete().eq('id',id);
  D.prog=D.prog.filter(p=>p.id!==id);CM('mo-prog-det');renderProg();renderDash();updateBadges();renderCal();toast('Programação excluída');
}
function abrirDetProg(id){
  const p=D.prog.find(x=>x.id===id);if(!p)return;
  svt('progdet-t',p.nome_empresa+' — '+fmtDate(p.prazo_entrega));
  const hoje=new Date();const diff=p.prazo_entrega?Math.ceil((new Date(p.prazo_entrega+' 00:00:00')-hoje)/86400000):null;
  const mp=p.estoque_material_id?D.estoque.find(e=>e.id===p.estoque_material_id):null;const{saldo}=mp?getSaldoMP(p.estoque_material_id):{saldo:0};
  document.getElementById('progdet-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
      <div><div style="font-size:10.5px;color:var(--text3);">EMPRESA</div><div style="font-size:13px;font-weight:500;">${p.nome_empresa}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">PRAZO</div><div style="font-size:13px;font-weight:600;color:${diff!==null&&diff<0?'var(--red)':diff!==null&&diff<=7?'var(--amber)':'var(--text)'};">${fmtDate(p.prazo_entrega)}${diff!==null?' ('+(diff<0?Math.abs(diff)+'d atrasado':diff+'d restantes')+')':''}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">DENOMINAÇÃO</div><div style="font-size:13px;">${p.denominacao||'—'}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">MATERIAL</div><div style="font-size:13px;">${p.material||'—'}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">STATUS</div><span class="pill p-${p.status}">${slabelProg(p.status)}</span></div>
      <div><div style="font-size:10.5px;color:var(--text3);">PRIORIDADE</div><span class="pill p-${p.prioridade||'normal'}">${p.prioridade||'Normal'}</span></div>
    </div>
    ${mp?`<div style="background:var(--amber-l);border:1px solid #fde68a;border-radius:var(--rs);padding:12px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:6px;display:flex;align-items:center;gap:4px;"><i class="ph-fill ph-lightning"></i> Material Previsto</div>
      <div style="font-size:13px;"><strong>${mp.material||'—'}</strong> · ${mp.fornecedor||'—'}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px;">Uso previsto: <strong>${(p.peso_material_usado_kg||0).toFixed(2)} kg</strong> · Saldo: <strong style="color:${saldo<(p.peso_material_usado_kg||0)?'var(--red)':'var(--green)'};">${saldo.toFixed(2)} kg</strong></div>
    </div>`:''}
    ${p.observacoes?`<div style="font-size:13px;color:var(--text2);background:var(--bg2);padding:10px;border-radius:var(--rs);">${p.observacoes}</div>`:''}
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;">
      <button class="btn bsm bd" onclick="delProg('${p.id}')">Excluir</button>
      <button class="btn bsm bw" onclick="openStatusModal('${p.id}','${p.status}','prog')">Status</button>
      ${p.arquivo_os_url?`<button class="btn bsm" onclick="prevPDF('${p.arquivo_os_url}','OS')">Ver OS</button>`:''}
      <button class="btn bsm bp" onclick="editProg('${p.id}')">Editar</button>
    </div>`;
  OM('mo-prog-det');
}

// ─── CALENDÁRIO ───
function toggleCalView(){
  calView=!calView;
  document.getElementById('prog-view-cards').style.display=calView?'none':'block';
  document.getElementById('prog-view-cal').style.display=calView?'block':'none';
  document.getElementById('btn-cal-view').innerHTML=calView?'<i class="ph-bold ph-list"></i> Lista':'<i class="ph-bold ph-calendar-blank"></i> Calendário';
  if(calView)renderCal();
}
function calPrev(){calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCal();}
function calNext(){calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCal();}
function renderCal(){
  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('cal-label').textContent=meses[calMonth]+' '+calYear;
  const days=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  document.getElementById('cal-heads').innerHTML=days.map(d=>`<div class="cal-head">${d}</div>`).join('');
  const primeiro=new Date(calYear,calMonth,1);const ultimo=new Date(calYear,calMonth+1,0);
  const hoje=new Date();hoje.setHours(0,0,0,0);let cells='';
  for(let i=0;i<primeiro.getDay();i++){const d=new Date(calYear,calMonth,1-primeiro.getDay()+i);cells+=`<div class="cal-day other-month"><div class="cal-day-num">${d.getDate()}</div></div>`;}
  for(let d=1;d<=ultimo.getDate();d++){
    const date=new Date(calYear,calMonth,d);date.setHours(0,0,0,0);
    const isToday=date.getTime()===hoje.getTime();
    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const progDay=D.prog.filter(p=>p.prazo_entrega===ds);
    cells+=`<div class="cal-day${isToday?' today':''}"><div class="cal-day-num">${d}</div>${progDay.map(p=>`<div class="cal-ev cal-ev-prog" onclick="abrirDetProg('${p.id}')">${p.nome_empresa.slice(0,12)}</div>`).join('')}</div>`;
  }
  const last=ultimo.getDay();for(let i=1;i<7-last;i++)cells+=`<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  document.getElementById('cal-body').innerHTML=cells;
}

// ─── CLIENTES ───
function renderCli(){
  const q=(document.getElementById('search-cli')?.value||'').toLowerCase();
  const f=D.clientes.filter(c=>[c.nome,c.cnpj].join(' ').toLowerCase().includes(q));
  const grid=document.getElementById('cli-grid');
  if(!f.length){grid.innerHTML='<div class="empty" style="grid-column:1/-1"><p>Nenhum cliente</p></div>';return;}
  grid.innerHTML=f.map(c=>{
    const peds=D.pedidos.filter(p=>p.nome_empresa===c.nome);
    const ini=c.nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    return`<div class="card" style="cursor:pointer;" onclick="abrirDetCli('${c.id}')">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px;">
        <div style="width:38px;height:38px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--text2);flex-shrink:0;">${ini}</div>
        <div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.nome}</div><div style="font-size:11px;color:var(--text3);">${c.cnpj||'CNPJ não informado'}</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px;">
        ${(c.telefones||[]).filter(Boolean)[0]?`<div style="font-size:12px;color:var(--text2);">📞 ${c.telefones[0]}</div>`:''}
        ${(c.emails||[]).filter(Boolean)[0]?`<div style="font-size:12px;color:var(--text2);">✉ ${c.emails[0]}</div>`:''}
        ${c.endereco?`<div style="font-size:12px;color:var(--text3);">📍 ${c.endereco}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:9px;border-top:1px solid var(--border);">
        <span style="font-size:11px;color:var(--text3);">${peds.length} pedido(s)</span>
        <div style="display:flex;gap:5px;" onclick="event.stopPropagation()">
          <button class="btn bsm" onclick="editCli('${c.id}')">Editar</button>
          <button class="btn bsm bd" onclick="delCli('${c.id}')">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function filterCli(){renderCli();}
function populateDatalist(){
  const opts=D.clientes.map(c=>`<option value="${esc(c.nome)}">`).join('');
  ['cl-est','cl-ped','cl-prog'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
}
function abrirNovoCliente(){
  svt('cli-mt','Novo Cliente');sv('cli-eid','');
  ['cli-nome','cli-cnpj','cli-end','cli-site','cli-t1','cli-t2','cli-t3','cli-e1','cli-e2','cli-e3'].forEach(x=>sv(x,''));OM('mo-cli');
}
function editCli(id){
  const c=D.clientes.find(x=>x.id===id);if(!c)return;
  svt('cli-mt','Editar Cliente');sv('cli-eid',id);sv('cli-nome',c.nome);sv('cli-cnpj',c.cnpj);sv('cli-end',c.endereco);sv('cli-site',c.site);
  const t=c.telefones||[];sv('cli-t1',t[0]);sv('cli-t2',t[1]);sv('cli-t3',t[2]);
  const e=c.emails||[];sv('cli-e1',e[0]);sv('cli-e2',e[1]);sv('cli-e3',e[2]);OM('mo-cli');
}
async function saveCli(){
  const nome=v('cli-nome');if(!nome){toast('Informe o nome','err');return;}
  const eid=v('cli-eid');
  const obj={nome,cnpj:v('cli-cnpj'),endereco:v('cli-end'),site:v('cli-site'),
    telefones:[v('cli-t1'),v('cli-t2'),v('cli-t3')].filter(Boolean),
    emails:[v('cli-e1'),v('cli-e2'),v('cli-e3')].filter(Boolean)};
  let error;
  if(eid){({error}=await sb.from('clientes').update(obj).eq('id',eid));}else{({error}=await sb.from('clientes').insert(obj));}
  if(error&&!error.message?.includes('DataClone')){toast('Erro: '+error.message,'err');return;}
  toast(eid?'Cliente atualizado!':'Cliente cadastrado!');CM('mo-cli');
  const{data}=await sb.from('clientes').select('*').order('nome');D.clientes=data||[];renderCli();renderDash();populateDatalist();
}
window.delCli=async function(id){
  event?.stopPropagation?.();if(!confirm('Excluir cliente?'))return;
  await sb.from('clientes').delete().eq('id',id);
  D.clientes=D.clientes.filter(c=>c.id!==id);renderCli();renderDash();populateDatalist();toast('Cliente excluído');
}
function abrirDetCli(id){
  const c=D.clientes.find(x=>x.id===id);if(!c)return;
  svt('clidet-t',c.nome);
  const peds=D.pedidos.filter(p=>p.nome_empresa===c.nome);const progs=D.prog.filter(p=>p.nome_empresa===c.nome);
  document.getElementById('clidet-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
      <div><div style="font-size:10.5px;color:var(--text3);">CNPJ</div><div style="font-size:13px;">${c.cnpj||'—'}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">SITE</div><div style="font-size:13px;">${c.site?`<a href="${c.site}" target="_blank" style="color:var(--blue);">${c.site}</a>`:'—'}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">TELEFONES</div><div style="font-size:13px;">${(c.telefones||[]).filter(Boolean).join(' · ')||'—'}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">E-MAILS</div><div style="font-size:13px;">${(c.emails||[]).filter(Boolean).join(', ')||'—'}</div></div>
      <div style="grid-column:1/-1"><div style="font-size:10.5px;color:var(--text3);">ENDEREÇO</div><div style="font-size:13px;">${c.endereco||'—'}</div></div>
    </div>
    ${progs.length?`<div style="font-size:13px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px;"><i class="ph-bold ph-calendar-blank"></i> Programações</div><div style="margin-bottom:16px;">${progs.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="CM('mo-cli-det');abrirDetProg('${p.id}')"><div style="font-size:13px;">${p.denominacao||'—'}</div><span class="pill p-${p.status}">${slabelProg(p.status)}</span></div>`).join('')}</div>`:''}
    <div style="font-size:13px;font-weight:600;margin-bottom:10px;">📋 Últimos Pedidos</div>
    ${peds.length?`<div class="table-wrap"><table><thead><tr><th>OS</th><th>Denominação</th><th>Data</th><th>Status</th></tr></thead><tbody>${peds.slice(0,8).map(p=>`<tr><td>${p.numero_os||'—'}</td><td>${p.denominacao||'—'}</td><td style="color:var(--text3);">${fmtDate(p.data_pedido)}</td><td><span class="pill p-${p.status}">${slabel(p.status)}</span></td></tr>`).join('')}</tbody></table></div>`:'<div style="font-size:13px;color:var(--text3);">Nenhum pedido.</div>'}`;
  OM('mo-cli-det');
}

// ─── PEDIDO DETALHE + TIMELINE ───
const TL_ETAPAS=[{key:'os_gerada',label:'OS Gerada',icon:'<i class="ph-bold ph-file-text"></i>'},{key:'em_producao',label:'Em Produção',icon:'<i class="ph-bold ph-gear"></i>'},{key:'inspecao',label:'Inspeção',icon:'<i class="ph-bold ph-magnifying-glass"></i>'},{key:'pronto',label:'Pronto',icon:'<i class="ph-bold ph-check-circle"></i>'},{key:'entregue',label:'Entregue',icon:'<i class="ph-bold ph-truck"></i>'}];

function abrirDetPedido(id){
  const p=D.pedidos.find(x=>x.id===id);if(!p)return;
  svt('peddet-titulo',p.nome_empresa+' — OS '+(p.numero_os||'—'));
  svt('peddet-sub',(p.denominacao||'')+(p.material?' · '+p.material:''));
  document.getElementById('peddet-edit-btn').onclick=()=>{CM('mo-ped-det');editPed(id);};
  document.getElementById('tl-ped-id').value=id;
  pedTabSwitch('tl');renderPedTimeline(p);renderPedInfo(p);OM('mo-ped-det');
  setTimeout(()=>genPedidoAI(p),300);
}
function pedTabSwitch(tab){
  document.getElementById('pedtab-tl').classList.toggle('active',tab==='tl');
  document.getElementById('pedtab-info').classList.toggle('active',tab==='info');
  document.getElementById('peddet-tl-view').style.display=tab==='tl'?'block':'none';
  document.getElementById('peddet-info-view').style.display=tab==='info'?'block':'none';
}
function renderPedTimeline(p){
  const tl=Array.isArray(p.timeline)?p.timeline:[];const tlMap={};tl.forEach(e=>{tlMap[e.etapa]=e;});
  document.getElementById('peddet-timeline').innerHTML=`<div class="tl-wrap">${TL_ETAPAS.map(et=>{
    const entry=tlMap[et.key];const st=entry?.status||'pending';const obs=entry?.obs||'';const data=entry?.data?fmtDT(entry.data):'';
    return`<div class="tl-step ${st}"><div class="tl-obs-wrap"><div class="tl-dot">${st==='done'?'✓':et.icon}</div>${obs?'<div class="tl-obs-tooltip">'+obs+'</div>':''}</div><div class="tl-label">${et.label}</div>${data?'<div class="tl-date">'+data+'</div>':''}</div>`;
  }).join('')}</div>`;
  const lastDone=tl.filter(e=>e.status==='done').sort((a,b)=>new Date(b.data)-new Date(a.data))[0];
  if(lastDone){const idx=TL_ETAPAS.findIndex(e=>e.key===lastDone.etapa);const next=TL_ETAPAS[idx+1];sv('tl-etapa',next?next.key:lastDone.etapa);}
}
function renderPedInfo(p){
  const mp=p.estoque_material_id?D.estoque.find(e=>e.id===p.estoque_material_id):null;
  document.getElementById('peddet-infos').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
      <div><div style="font-size:10.5px;color:var(--text3);">EMPRESA</div><div style="font-size:13px;font-weight:500;">${p.nome_empresa}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">OS / PEDIDO</div><div style="font-size:13px;">OS: ${p.numero_os||'—'}${p.numero_pedido?' · Ped: '+p.numero_pedido:''}</div></div>
      <div><div style="font-size:10.5px;color:var(--text3);">STATUS</div><span class="pill p-${p.status}">${slabel(p.status)}</span></div>
      <div><div style="font-size:10.5px;color:var(--text3);">DATA</div><div style="font-size:13px;">${fmtDate(p.data_pedido)}</div></div>
    </div>
    ${mp?`<div style="background:var(--amber-l);border:1px solid #fde68a;border-radius:var(--rs);padding:12px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:5px;display:flex;align-items:center;gap:4px;"><i class="ph-fill ph-lightning"></i> Material Previsto</div>
      <div style="font-size:13px;"><strong>${mp.material||'—'}</strong> · ${mp.fornecedor||'—'}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:3px;">Uso previsto: <strong>${(p.peso_material_usado_kg||0).toFixed(2)} kg</strong></div>
    </div>`:''}
    ${p.observacoes?`<div style="background:var(--bg2);padding:10px;border-radius:var(--rs);font-size:13px;color:var(--text2);">📝 ${p.observacoes}</div>`:''}`;
}
async function saveTlEtapa(){
  const id=v('tl-ped-id');const etapa=v('tl-etapa');const status=v('tl-status');const obs=document.getElementById('tl-obs').value.trim();
  const p=D.pedidos.find(x=>x.id===id);if(!p)return;
  let tl=Array.isArray(p.timeline)?[...p.timeline]:[];tl=tl.filter(e=>e.etapa!==etapa);
  tl.push({etapa,status,obs,data:new Date().toISOString()});
  tl.sort((a,b)=>TL_ETAPAS.findIndex(e=>e.key===a.etapa)-TL_ETAPAS.findIndex(e=>e.key===b.etapa));
  let mainStatus=p.status;if(etapa==='entregue'&&status==='done')mainStatus='concluido';else if(etapa==='em_producao'&&status==='active')mainStatus='producao';
  const{error}=await sb.from('pedidos').update({timeline:tl,status:mainStatus}).eq('id',id);
  if(error&&!error.message?.includes('DataClone')){toast('Erro: '+error.message,'err');return;}
  toast('Timeline atualizada!');const idx=D.pedidos.findIndex(x=>x.id===id);
  if(idx>=0)D.pedidos[idx]={...D.pedidos[idx],timeline:tl,status:mainStatus};
  renderPedTimeline(D.pedidos.find(x=>x.id===id));renderPedidos();document.getElementById('tl-obs').value='';
}
async function genPedidoAI(p){
  const el=document.getElementById('peddet-ai-est');if(!el)return;
  const wrap=document.getElementById('ai-est-card-wrap');
  if(wrap)wrap.classList.add('thinking');
  el.innerHTML='<span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite;vertical-align:middle;margin-right:6px;"></span> Analisando...';
  const tl=Array.isArray(p.timeline)?p.timeline:[];const etapasFeitas=tl.filter(e=>e.status==='done').map(e=>TL_ETAPAS.find(x=>x.key===e.etapa)?.label||e.etapa);
  const histCli=D.pedidos.filter(x=>x.nome_empresa===p.nome_empresa&&x.status==='concluido'&&x.id!==p.id).length;
  const ctx=`Você é um assistente industrial. Com base nos dados deste pedido, forneça uma estimativa concisa (2 frases) sobre o prazo restante e riscos, em português.
Pedido: ${p.denominacao||'—'} para ${p.nome_empresa} · ${p.quantidade_pecas||0} pçs · ${(p.peso_total_estimado||0).toFixed(2)} kg
Material: ${p.material_previsto||p.material||'não informado'}
Etapas concluídas: ${etapasFeitas.length>0?etapasFeitas.join(', '):'Nenhuma'}
Pedidos anteriores: ${histCli}. Responda apenas com a estimativa.`;
  try{
    const { data, error } = await sb.functions.invoke('ai-insight', { body: { prompt: ctx } });
    if(error) throw error;
    el.textContent = data.insight || 'Dados insuficientes para análise.';
  }catch(e){
    console.error('Erro na IA (Pedido):', e);
    el.textContent='Estimativa indisponível no momento.';
  }finally{
    if(wrap)wrap.classList.remove('thinking');
  }
}

// ─── UTILS ───
function OM(id){document.getElementById(id).classList.add('open');}
function CM(id){document.getElementById(id).classList.remove('open');}
function v(id){return document.getElementById(id)?.value?.trim()||'';}
function sv(id,val){const el=document.getElementById(id);if(el)el.value=val==null?'':val;}
function svt(id,val){const el=document.getElementById(id);if(el)el.textContent=val||'';}
function esc(s){return(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}
function fmtDate(d){if(!d)return'—';try{return new Date(d+'T00:00:00').toLocaleDateString('pt-BR');}catch{return d;}}
function fmtDT(d){if(!d)return'—';try{return new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return d;}}
function slabel(s){return{aberto:'Aberto',producao:'Em Produção',concluido:'Concluído',cancelado:'Cancelado'}[s]||s;}
function slabelProg(s){return{programado:'Programado',em_producao:'Em Produção',concluido:'Concluído',atrasado:'Atrasado'}[s]||s;}
function catCls(c){return c==='Molas'?'p-molas':c==='Artefatos de Arame'?'p-arame':'p-materia';}
function hf(input,dropId,fnId){const f=input.files[0];if(!f)return;svt(fnId,f.name);document.getElementById(dropId).classList.add('has');}
async function upFile(file,bucket,prefix){
  const path=prefix+Date.now()+'_'+file.name;
  const{error}=await sb.storage.from(bucket).upload(path,file);
  if(error&&!error.message?.includes('DataClone')){toast('Erro upload: '+error.message,'err');return null;}
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
function prevPDF(url,title){svt('prev-title',title||'Pré-visualização');document.getElementById('prev-frame').src=url;document.getElementById('prev-dl').href=url;OM('mo-prev');}
let _t;
function toast(msg,type){
  const el=document.getElementById('toast');el.textContent=msg;el.className=type==='err'?'err':'';el.style.display='block';
  clearTimeout(_t);_t=setTimeout(()=>{el.style.display='none';},3400);
}

// Global hotkeys
document.addEventListener('keydown', e => {
  if (e.key === 'F9') {
    e.preventDefault();
    genAIInsight();
    toast('Reanalisando dados com IA...');
  }
});

// Close modals on backdrop click
document.querySelectorAll('.mo').forEach(o=>{o.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});});

// ─── CRM COMERCIAL ───
function renderCRM() {
  if(!document.getElementById('page-crm')) return;
  const leads = D.crm_leads || [];
  const hist = D.crm_historico || [];
  
  // Métricas
  const novos = leads.filter(l => l.status === 'Novo Lead').length;
  const orc = leads.filter(l => l.status === 'Orçamento Enviado').length;
  const negs = leads.filter(l => l.status === 'Negociação').length;
  const fech = leads.filter(l => l.status === 'Fechado').length;
  const perd = leads.filter(l => l.status === 'Perdido').length;
  
  const hj = new Date();
  const parados = leads.filter(l => {
    if(l.status === 'Fechado' || l.status === 'Perdido') return false;
    const h = hist.filter(x => x.lead_id === l.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    if(!h.length) {
      return (hj - new Date(l.created_at)) / 86400000 > 7;
    }
    const ut = new Date(h[0].created_at);
    return (hj - ut) / 86400000 > 7;
  }).length;

  const valorNeg = leads.filter(l => l.status === 'Negociação' || l.status === 'Orçamento Enviado')
    .reduce((a, b) => a + (parseFloat(b.valor_estimado) || 0), 0);

  const els = {
    total: document.getElementById('crm-m-total'),
    novos: document.getElementById('crm-m-novos'),
    orcs: document.getElementById('crm-m-orcs'),
    negs: document.getElementById('crm-m-negs'),
    fech: document.getElementById('crm-m-fech'),
    perd: document.getElementById('crm-m-perd'),
    parados: document.getElementById('crm-m-parados'),
    valor: document.getElementById('crm-m-valor')
  };
  
  if(els.total) els.total.textContent = leads.length;
  if(els.novos) els.novos.textContent = novos;
  if(els.orcs) els.orcs.textContent = orc;
  if(els.negs) els.negs.textContent = negs;
  if(els.fech) els.fech.textContent = fech;
  if(els.perd) els.perd.textContent = perd;
  if(els.parados) els.parados.textContent = parados;
  if(els.valor) els.valor.textContent = 'R$ ' + valorNeg.toLocaleString('pt-BR', {minimumFractionDigits:2});

  // Kanban
  const etapas = ['Novo Lead', 'Em Atendimento', 'Orçamento Enviado', 'Negociação', 'Fechado', 'Perdido'];
  const kb = document.getElementById('crm-kanban');
  if(kb) {
    kb.innerHTML = etapas.map(et => {
      const etLeads = leads.filter(l => l.status === et).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      const isEnd = (et==='Fechado'||et==='Perdido');
      return `
        <div style="flex: 0 0 260px; background:var(--bg2); border-radius:var(--rs); padding:10px; border:1px solid var(--border); display:flex; flex-direction:column; max-height:600px;">
          <div style="font-weight:600; font-size:13px; margin-bottom:10px; display:flex; justify-content:space-between;">
            <span>${et}</span><span style="color:var(--text3);">${etLeads.length}</span>
          </div>
          <div style="overflow-y:auto; flex:1; padding-right:4px; display:flex; flex-direction:column; gap:8px;">
            ${etLeads.map(l => `
              <div style="background:var(--bg1); border:1px solid var(--border); padding:10px; border-radius:var(--rs); cursor:pointer; opacity:${isEnd?0.7:1}; transition:all 0.2s;" onclick="abrirLead('${l.id}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                <div style="font-weight:600; font-size:13px; margin-bottom:4px;">${esc(l.empresa)}</div>
                <div style="font-size:11px; color:var(--text2); margin-bottom:6px;">${esc(l.contato)}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:11px; font-weight:600; color:var(--green);">${l.valor_estimado ? 'R$ '+parseFloat(l.valor_estimado).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'}</span>
                  <span class="pill" style="font-size:9px; padding:2px 6px;">${esc(l.prioridade||'Média')}</span>
                </div>
              </div>
            `).join('') || '<div style="font-size:11px; color:var(--text3); text-align:center; padding:10px;">Vazio</div>'}
          </div>
        </div>
      `;
    }).join('');
  }

  // Lembretes
  const rem = hist.filter(h => h.data_retorno && h.data_retorno.startsWith('20'))
    .sort((a,b)=>new Date(a.data_retorno)-new Date(b.data_retorno));
  
  const rc = document.getElementById('crm-lembretes');
  if(rc) {
    if(!rem.length) {
      rc.innerHTML = '<div class="empty" style="padding:20px 0;"><p>Nenhum lembrete pendente</p></div>';
    } else {
      rc.innerHTML = `<div style="max-height:200px;overflow-y:auto;padding-right:5px;display:flex;flex-direction:column;gap:8px;">
        ${rem.map(h => {
          const l = leads.find(x => x.id === h.lead_id);
          if(!l) return '';
          if(l.status === 'Fechado' || l.status === 'Perdido') return ''; // Omitir fechados
          const hjStr = hj.toISOString().split('T')[0];
          const isLate = h.data_retorno < hjStr;
          return `<div style="background:var(--bg2); border:1px solid var(--border); padding:10px; border-radius:var(--rs); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:12px; font-weight:600; cursor:pointer; color:var(--accent);" onclick="abrirLead('${l.id}')">${esc(l.empresa)} - ${esc(l.contato)}</div>
              <div style="font-size:11px; color:var(--text2); margin-top:2px;"><strong style="color:${isLate?'var(--red)':'var(--text)'};">${fmtDate(h.data_retorno)}</strong> - Passo: ${esc(h.proximo_passo||h.tipo_contato)}</div>
            </div>
            <button class="btn bsm" onclick="abrirLead('${l.id}')">Ver</button>
          </div>`;
        }).join('')}
      </div>`;
    }
  }

  // Modelos
  const mod = D.crm_modelos || [];
  const mc = document.getElementById('crm-modelos');
  if(mc) {
    if(!mod.length) {
      mc.innerHTML = '<div class="empty" style="padding:10px 0;font-size:11px;"><p>Nenhum modelo cadastrado</p></div>';
    } else {
      mc.innerHTML = mod.map(m => `
        <div style="background:var(--bg2); padding:8px 10px; border-radius:var(--rs); border:1px solid var(--border); font-size:11px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:600;">${esc(m.titulo)}</span>
          <button class="btn bsm bw" style="padding:3px 8px;font-size:10px;" onclick="copiarTexto(this, \`${esc(m.conteudo)}\`)">Copiar</button>
        </div>
      `).join('');
    }
  }
}

function copiarTexto(btn, txt) {
  navigator.clipboard.writeText(txt.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  const old = btn.textContent;
  btn.textContent = 'Copiado!';
  setTimeout(()=>btn.textContent=old, 2000);
}

async function carregarResponsaveis() {
  const sel = document.getElementById('lead-responsavel');
  if(!sel || sel.options.length > 0) return; 
  const {data} = await sb.from('profiles').select('id, nome, email, cargo').in('cargo', ['admin', 'console', 'vendas']);
  if(data) {
    sel.innerHTML = data.map(u => `<option value="${u.id}">${esc(u.nome || u.email)}</option>`).join('');
  }
}

async function abrirNovoLead() {
  sv('lead-eid', '');
  document.querySelectorAll('#mo-lead input:not([type="hidden"]), #mo-lead textarea').forEach(e=>e.value='');
  sv('lead-status', 'Novo Lead');
  sv('lead-prioridade', 'Média');
  const mt = document.getElementById('lead-mt');
  if(mt) mt.textContent = 'Novo Lead';
  const pw = document.getElementById('lead-perda-wrap');
  if(pw) pw.style.display='none';
  await carregarResponsaveis();
  OM('mo-lead');
}

const selStatus = document.getElementById('lead-status');
if(selStatus) {
  selStatus.addEventListener('change', (e) => {
    const pw = document.getElementById('lead-perda-wrap');
    if(pw) pw.style.display = e.target.value === 'Perdido' ? 'block' : 'none';
  });
}

async function saveLead() {
  const empresa = v('lead-empresa'), contato = v('lead-contato'), telefone = v('lead-telefone'), email = v('lead-email');
  const origem = v('lead-origem'), status = v('lead-status'), produto = v('lead-produto');
  
  if(!empresa || !contato || !telefone || !origem || !status || !produto) {
    toast('Preencha os campos obrigatórios', 'err'); return;
  }
  
  const obj = {
    empresa, contato, telefone, email, origem, status, produto_interesse: produto,
    valor_estimado: parseFloat(v('lead-valor')) || 0,
    prioridade: v('lead-prioridade'), responsavel_id: v('lead-responsavel') || null,
    segmento: v('lead-segmento'), cnpj: v('lead-cnpj'), material_solicitado: v('lead-material'),
    qtd_solicitada: parseInt(v('lead-qtd')) || 0, prazo_desejado: v('lead-prazo') || null,
    obs: v('lead-obs'), motivo_perda: status === 'Perdido' ? v('lead-motivo-perda') : null
  };

  const eid = v('lead-eid');
  if(eid) {
    const {error} = await sb.from('crm_leads').update(obj).eq('id', eid);
    if(error) { toast('Erro: '+error.message, 'err'); return; }
    toast('Lead atualizado!');
  } else {
    const {error} = await sb.from('crm_leads').insert([obj]);
    if(error) { toast('Erro: '+error.message, 'err'); return; }
    toast('Lead criado com sucesso!');
  }
  
  CM('mo-lead');
  loadAll();
}

async function abrirLead(id) {
  const lead = D.crm_leads.find(l => l.id === id);
  if(!lead) return;
  
  const elT = document.getElementById('leaddet-titulo');
  if(elT) elT.textContent = lead.empresa;
  const elS = document.getElementById('leaddet-sub');
  if(elS) elS.textContent = `${lead.contato} • ${lead.status}`;
  
  const info = `
    <strong>Telefone:</strong> ${esc(lead.telefone)}<br>
    <strong>E-mail:</strong> ${esc(lead.email||'—')}<br>
    <strong>Produto:</strong> ${esc(lead.produto_interesse)}<br>
    <strong>Valor Estimado:</strong> ${lead.valor_estimado ? 'R$ '+parseFloat(lead.valor_estimado).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'}<br>
    <strong>Origem:</strong> ${esc(lead.origem)}<br>
    <strong>Segmento:</strong> ${esc(lead.segmento||'—')}<br>
    <strong>CNPJ:</strong> ${esc(lead.cnpj||'—')}<br>
    <strong>Prioridade:</strong> ${esc(lead.prioridade)}<br>
    <strong>Cadastrado em:</strong> ${fmtDate(lead.created_at)}
  `;
  const elI = document.getElementById('leaddet-info');
  if(elI) elI.innerHTML = info;
  
  const sts = ['Novo Lead', 'Em Atendimento', 'Orçamento Enviado', 'Negociação', 'Fechado', 'Perdido'];
  const sf = document.getElementById('leaddet-status-fast');
  if(sf) sf.innerHTML = sts.map(s => `<option value="${s}" ${s===lead.status?'selected':''}>${s}</option>`).join('');
  
  sv('lc-lead-id', lead.id);
  sv('lc-desc', ''); sv('lc-passo', ''); sv('lc-retorno', '');
  
  const eb = document.getElementById('leaddet-edit-btn');
  if(eb) eb.onclick = async () => {
    await carregarResponsaveis();
    sv('lead-eid', lead.id);
    sv('lead-empresa', lead.empresa); sv('lead-contato', lead.contato);
    sv('lead-telefone', lead.telefone); sv('lead-email', lead.email);
    sv('lead-origem', lead.origem); sv('lead-status', lead.status);
    sv('lead-produto', lead.produto_interesse); sv('lead-valor', lead.valor_estimado);
    sv('lead-prioridade', lead.prioridade); sv('lead-responsavel', lead.responsavel_id);
    sv('lead-segmento', lead.segmento); sv('lead-cnpj', lead.cnpj);
    sv('lead-material', lead.material_solicitado); sv('lead-qtd', lead.qtd_solicitada);
    sv('lead-prazo', lead.prazo_desejado ? lead.prazo_desejado.split('T')[0] : '');
    sv('lead-obs', lead.obs);
    
    const mt = document.getElementById('lead-mt');
    if(mt) mt.textContent = 'Editar Lead';
    const pw = document.getElementById('lead-perda-wrap');
    if(pw) pw.style.display = lead.status === 'Perdido' ? 'block' : 'none';
    if(lead.status === 'Perdido' && lead.motivo_perda) sv('lead-motivo-perda', lead.motivo_perda);
    OM('mo-lead');
  };
  
  renderHistoricoLead(lead.id);
  OM('mo-lead-det');
}

function renderHistoricoLead(id) {
  const hist = D.crm_historico.filter(h => h.lead_id === id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const el = document.getElementById('leaddet-timeline');
  if(!el) return;
  if(!hist.length) {
    el.innerHTML = '<div class="empty" style="font-size:12px;padding:10px 0;"><p>Nenhum histórico registrado</p></div>';
    return;
  }
  el.innerHTML = hist.map(h => `
    <div style="padding-left:14px; border-left:2px solid var(--border); margin-bottom:14px; position:relative;">
      <div style="position:absolute; width:8px; height:8px; background:var(--accent); border-radius:50%; left:-5px; top:4px;"></div>
      <div style="font-size:10px; color:var(--text3); margin-bottom:2px;">${fmtDT(h.created_at)} • ${esc(h.tipo_contato)}</div>
      <div style="font-size:12px; margin-bottom:4px; line-height:1.5;">${esc(h.descricao).replace(/\n/g,'<br>')}</div>
      ${h.proximo_passo ? `<div style="font-size:11px; background:var(--bg1); padding:4px 8px; border-radius:4px; display:inline-block; margin-top:4px;"><strong>Próximo passo:</strong> ${esc(h.proximo_passo)} ${h.data_retorno ? `(${fmtDate(h.data_retorno)})` : ''}</div>` : ''}
    </div>
  `).join('');
}

async function saveLeadContato() {
  const lead_id = v('lc-lead-id'), tipo = v('lc-tipo'), desc = v('lc-desc');
  const retorno = v('lc-retorno')||null, passo = v('lc-passo');
  
  if(!desc) { toast('Preencha a descrição do contato', 'err'); return; }
  
  const obj = { lead_id, tipo_contato: tipo, descricao: desc, proximo_passo: passo, data_retorno: retorno, created_by: currentUser.id };
  const {error} = await sb.from('crm_historico').insert([obj]);
  
  if(error) { toast('Erro: '+error.message, 'err'); return; }
  toast('Contato registrado!');
  await loadAll();
  renderHistoricoLead(lead_id);
  sv('lc-desc', ''); sv('lc-passo', ''); sv('lc-retorno', '');
}

async function updateLeadStatusFast() {
  const lead_id = v('lc-lead-id');
  const status = v('leaddet-status-fast');
  if(!lead_id || !status) return;
  const {error} = await sb.from('crm_leads').update({status}).eq('id', lead_id);
  if(error) { toast('Erro: '+error.message, 'err'); return; }
  toast('Status atualizado!');
  await loadAll();
  const lead = D.crm_leads.find(l => l.id === lead_id);
  if(lead) {
    const elS = document.getElementById('leaddet-sub');
    if(elS) elS.textContent = `${lead.contato} • ${lead.status}`;
  }
}

