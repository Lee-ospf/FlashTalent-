import{b as st}from"./chunk-7XPUVMCY.js";import{a as lt}from"./chunk-H2BZMQVY.js";import{b as Z,f as J,i as X,t as G}from"./chunk-N2HTPRNI.js";import{c as rt,d as ct}from"./chunk-SFQBHEBC.js";import{c as ot}from"./chunk-LPWUQSP2.js";import{a as nt}from"./chunk-5RMYFZG4.js";import{a as it}from"./chunk-Q3DYOERB.js";import{d as Y}from"./chunk-TA45CJ45.js";import{a as at}from"./chunk-M56CYPUR.js";import{a as tt,b as et}from"./chunk-7JNYMZIO.js";import{e as K,g as j}from"./chunk-WSFR5KAX.js";import"./chunk-ANE7AGRT.js";import{$b as R,Bb as B,Db as E,E as T,Eb as V,Hb as O,Ib as F,J as P,Jb as a,Jc as W,Kb as o,Lb as _,Nb as g,Pb as C,Pc as H,Qb as c,Zb as s,_b as A,ac as L,bc as N,eb as d,ec as z,fc as q,gc as Q,ic as U,ka as x,pa as $,rb as h,u as M,xb as y,ya as u,yc as D,za as f}from"./chunk-MZNVNSF4.js";var pt=(n,l)=>l.key,dt=(n,l)=>l.applicationId;function _t(n,l){n&1&&(a(0,"div",3),_(1,"mat-spinner",4),o())}function mt(n,l){if(n&1){let t=g();a(0,"button",14),C("click",function(){let i=u(t).$implicit,r=c(2);return f(r.activeTab.set(i.key))}),s(1),o()}if(n&2){let t=l.$implicit,e=c(2);B("active",e.activeTab()===t.key),d(),L(" ",t.label," (",t.count,") ")}}function ut(n,l){n&1&&(a(0,"div",3),_(1,"i",15),a(2,"p"),s(3,"No applications match."),o()())}function ft(n,l){if(n&1){let t=g();a(0,"button",23),C("click",function(){u(t);let i=c().$implicit,r=c(3);return f(r.openReview(i))}),_(1,"i",24),s(2," Review "),o()}}function Ct(n,l){if(n&1){let t=g();a(0,"button",23),C("click",function(){u(t);let i=c().$implicit,r=c(3);return f(r.openReview(i))}),_(1,"i",24),s(2," Continue Review "),o()}}function vt(n,l){if(n&1){let t=g();a(0,"button",23),C("click",function(){u(t);let i=c().$implicit,r=c(3);return f(r.openPreScreeningReview(i))}),_(1,"i",25),s(2," Send pre-screening form "),o()}}function xt(n,l){if(n&1){let t=g();a(0,"button",23),C("click",function(){u(t);let i=c(2).$implicit,r=c(3);return f(r.scheduleInterview(i))}),_(1,"i",27),s(2," Schedule Interview "),o()}}function ht(n,l){if(n&1){let t=g();a(0,"button",23),C("click",function(){u(t);let i=c(2).$implicit,r=c(3);return f(r.openPreScreeningReview(i))}),_(1,"i",28),s(2," Review submission "),o()}}function gt(n,l){n&1&&(a(0,"span",29),_(1,"i",30),s(2," Waiting for pre-screening form from candidate"),o())}function bt(n,l){if(n&1&&y(0,xt,3,0,"button",26)(1,ht,3,0)(2,gt,3,0),n&2){let t=c().$implicit,e=c(3);V(0,e.prescreeningPassed().has(t.applicationId)?0:e.prescreeningSubmitted().has(t.applicationId)?1:2)}}function wt(n,l){n&1&&(a(0,"span",29),_(1,"i",31),s(2," Final round completed"),o())}function St(n,l){if(n&1){let t=g();a(0,"button",23),C("click",function(){u(t);let i=c(2).$implicit,r=c(3);return f(r.scheduleInterview(i))}),_(1,"i",27),s(2," View Interview "),o()}}function yt(n,l){if(n&1&&y(0,wt,3,0,"span",29)(1,St,3,0),n&2){let t=c().$implicit,e=c(3);V(0,e.maxRoundsReached().has(t.applicationId)?0:1)}}function Vt(n,l){if(n&1&&(a(0,"span",29),_(1,"i",32),s(2),o()),n&2){let t=c().$implicit,e=c(3);d(2),R(" ",e.offerDetail(t),"")}}function At(n,l){n&1&&(a(0,"span",29),_(1,"i",33),s(2," Final stage"),o())}function kt(n,l){if(n&1){let t=g();a(0,"tr",19),C("click",function(){let i=u(t).$implicit,r=c(3);return f(r.openHistory(i))}),a(1,"td",20),s(2),o(),a(3,"td",21),s(4),o(),a(5,"td")(6,"span"),s(7),o()(),a(8,"td",22),C("click",function(i){return u(t),f(i.stopPropagation())}),y(9,ft,3,0)(10,Ct,3,0)(11,vt,3,0)(12,bt,3,1)(13,yt,2,1)(14,Vt,3,1)(15,At,3,0),o()()}if(n&2){let t,e=l.$implicit,i=c(3);d(2),A(e.candidateName),d(2),A(i.formatDate(e.appliedAt)),d(2),E("status-pill s-",i.statusClass(e.status),""),d(),A(i.statusLabel(e)),d(2),V(9,(t=e.status)==="Applied"?9:t==="UnderReview"?10:t==="Shortlisted"?11:t==="PrescreeningStage"?12:t==="InterviewStage"?13:t==="OfferExtended"?14:15)}}function It(n,l){if(n&1&&(a(0,"div",16)(1,"table",17)(2,"thead")(3,"tr")(4,"th"),s(5,"Candidate"),o(),a(6,"th"),s(7,"Applied"),o(),a(8,"th"),s(9,"Status"),o(),a(10,"th"),s(11,"Action"),o()()(),a(12,"tbody"),O(13,kt,16,7,"tr",18,dt),o()()()),n&2){let t=c(2);d(13),F(t.filteredApplications())}}function Mt(n,l){if(n&1){let t=g();a(0,"div",5)(1,"div")(2,"div",6),s(3),o(),a(4,"div",7),s(5),o()(),a(6,"span"),s(7),o()(),a(8,"div",8)(9,"div",9),_(10,"i",10),a(11,"input",11),Q("ngModelChange",function(i){u(t);let r=c();return q(r.searchQ,i)||(r.searchQ=i),f(i)}),o()(),a(12,"div",12),O(13,mt,2,4,"button",13,pt),o()(),y(15,ut,4,0,"div",3)(16,It,15,0)}if(n&2){let t=c();d(3),A(t.vacancy().title),d(2),N(" ",t.applications().length," application",t.applications().length!==1?"s":""," \xB7 ",t.vacancy().status," "),d(),E("status-pill s-",t.vacancy().status==="Published"?"offer":"applied",""),d(),R(" ",t.vacancy().status," "),d(4),z("ngModel",t.searchQ),d(2),F(t.tabs()),d(2),V(15,t.filteredApplications().length?16:15)}}var Pt=5,Jt=(()=>{class n{constructor(){this.route=x(K),this.router=x(j),this.appService=x(at),this.vacancyService=x(nt),this.prescreeningService=x(ot),this.interviewService=x(st),this.offerLetterService=x(lt),this.toast=x(it),this.location=x(W),this.vacancy=h(null),this.applications=h([]),this.loading=h(!0),this.searchQ="",this.activeTab=h("all"),this.prescreeningPassed=h(new Set),this.prescreeningSubmitted=h(new Set),this.maxRoundsReached=h(new Set),this.interviewSubState=h(new Map),this.offerStatusByApp=h(new Map),this.tabs=D(()=>{let t=this.applications(),e=i=>t.filter(r=>this.tabKeyFor(r.status)===i).length;return[{key:"all",label:"All",count:t.length},{key:"review",label:"Review",count:e("review")},{key:"prescreen",label:"Pre-screening",count:e("prescreen")},{key:"interview",label:"Interview",count:e("interview")},{key:"offer",label:"Offer",count:e("offer")}]}),this.filteredApplications=D(()=>{let t=this.searchQ.trim().toLowerCase(),e=this.activeTab();return this.applications().filter(i=>{let r=e==="all"||this.tabKeyFor(i.status)===e,p=!t||i.candidateName.toLowerCase().includes(t);return r&&p})})}ngOnInit(){this.vacancyId=Number(this.route.snapshot.paramMap.get("id")),this.load()}load(){this.loading.set(!0),this.vacancyService.getById(this.vacancyId).subscribe({next:t=>this.vacancy.set(t),error:t=>this.toast.show(t.message,"error")}),this.appService.getByVacancy(this.vacancyId).subscribe({next:t=>{this.applications.set([...t].sort((e,i)=>new Date(e.appliedAt).getTime()-new Date(i.appliedAt).getTime())),this.loading.set(!1),this.enrich(t)},error:t=>{this.toast.show(t.message,"error"),this.loading.set(!1)}})}enrich(t){let e=t.filter(p=>p.status==="PrescreeningStage");e.length&&T(e.map(p=>this.prescreeningService.getByApplication(p.applicationId).pipe(P(()=>M(null))))).subscribe(p=>{let v=new Set,b=new Set;e.forEach((w,k)=>{let m=p[k];m?.outcome==="Passed"?v.add(w.applicationId):m?.status==="Submitted"&&b.add(w.applicationId)}),this.prescreeningPassed.set(v),this.prescreeningSubmitted.set(b)});let i=t.filter(p=>p.status==="InterviewStage");i.length&&T(i.map(p=>this.interviewService.getByApplication(p.applicationId).pipe(P(()=>M([]))))).subscribe(p=>{let v=new Set;i.forEach((b,w)=>{let k=p[w];if(!k.length)return;let m=[...k].sort((S,I)=>I.roundNumber-S.roundNumber)[0];if(m.status==="Completed"&&m.outcome==="Passed"&&m.roundNumber>=Pt&&v.add(b.applicationId),m.status==="Scheduled")this.interviewService.getRescheduleHistory(m.interviewId).pipe(P(()=>M([]))).subscribe(S=>{let I=new Map(this.interviewSubState());I.set(b.applicationId,S.length?{label:"Rescheduled",detail:`Round ${m.roundNumber} now ${this.formatDateTime(m.scheduledAt)}`}:{label:"Upcoming",detail:`Scheduled for ${this.formatDateTime(m.scheduledAt)}`}),this.interviewSubState.set(I)});else if(m.status==="Completed"&&m.outcome==="Passed"){let S=new Map(this.interviewSubState());S.set(b.applicationId,{label:"Passed",detail:`Round ${m.roundNumber} passed`}),this.interviewSubState.set(S)}}),this.maxRoundsReached.set(v)});let r=t.filter(p=>p.status==="OfferExtended");if(r.length){let p=r.map(v=>v.applicationId);this.offerLetterService.preload(p).subscribe(()=>{let v=new Map;p.forEach(b=>{let w=this.offerLetterService.peek(b)?.status;w&&v.set(b,w)}),this.offerStatusByApp.set(v)})}}tabKeyFor(t){return t==="Applied"||t==="UnderReview"?"review":t==="Shortlisted"||t==="PrescreeningStage"?"prescreen":t==="InterviewStage"?"interview":t==="OfferExtended"?"offer":"all"}statusClass(t){return rt(t)}statusLabel(t){let e=ct(t.status);if(t.status==="InterviewStage"){let i=this.interviewSubState().get(t.applicationId);return i?`Interview \xB7 ${i.label}`:e}if(t.status==="OfferExtended"){let i=this.offerStatusByApp().get(t.applicationId);return i==="Accepted"?"Offer \xB7 Accepted":i==="Declined"?"Offer \xB7 Declined":"Offer \xB7 Awaiting response"}return e}offerDetail(t){let e=this.offerStatusByApp().get(t.applicationId);return e==="Accepted"?"Candidate accepted the offer":e==="Declined"?"Candidate declined the offer":"Awaiting candidate response"}formatDate(t){return new Date(t).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}formatDateTime(t){return new Date(t).toLocaleString("en-ZA",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}goBack(){this.location.back()}openHistory(t){this.router.navigate(["/admin/applications",t.applicationId,"history"])}openReview(t){t.status==="Applied"?this.appService.updateStatus(t.applicationId,{newStatus:"UnderReview"}).subscribe({next:()=>this.router.navigate(["/applications/review",t.applicationId],{queryParams:{vacancyId:this.vacancyId}}),error:e=>this.toast.show(e.message,"error")}):this.router.navigate(["/applications/review",t.applicationId],{queryParams:{vacancyId:this.vacancyId}})}openPreScreeningReview(t){this.router.navigate(["/admin/applications",t.applicationId])}scheduleInterview(t){this.router.navigate(["/applications",t.applicationId,"schedule-interview"],{queryParams:{vacancyId:this.vacancyId}})}static{this.\u0275fac=function(e){return new(e||n)}}static{this.\u0275cmp=$({type:n,selectors:[["app-vacancy-applications"]],standalone:!0,features:[U],decls:6,vars:1,consts:[[1,"page-container"],[1,"back-link",2,"cursor","pointer",3,"click"],[1,"ti","ti-arrow-left"],[1,"empty-state"],["diameter","32"],[1,"vp-header"],[1,"vp-title"],[1,"vp-sub"],[1,"vp-filters"],[1,"search-wrap",2,"flex","1","min-width","220px"],[1,"ti","ti-search","search-icon"],["type","search","placeholder","Search by candidate\u2026",1,"search-input",3,"ngModelChange","ngModel"],[1,"vp-tabs"],[1,"vp-tab",3,"active"],[1,"vp-tab",3,"click"],[1,"ti","ti-zoom-question"],[1,"vp-table-wrap"],[1,"vp-table"],[1,"vp-row"],[1,"vp-row",3,"click"],[1,"vp-name"],[1,"vp-muted"],[3,"click"],[1,"btn-primary","vp-action-btn",3,"click"],[1,"ti","ti-eye"],[1,"ti","ti-clipboard-list"],[1,"btn-primary","vp-action-btn"],[1,"ti","ti-calendar-event"],[1,"ti","ti-clipboard-check"],[1,"form-note"],[1,"ti","ti-hourglass"],[1,"ti","ti-flag-check"],[1,"ti","ti-mail"],[1,"ti","ti-lock"]],template:function(e,i){e&1&&(a(0,"div",0)(1,"a",1),C("click",function(){return i.goBack()}),_(2,"i",2),s(3," Back to Applications "),o(),y(4,_t,2,0,"div",3)(5,Mt,17,10),o()),e&2&&(d(4),V(4,i.loading()?4:i.vacancy()?5:-1))},dependencies:[H,G,Z,J,X,Y,et,tt],styles:[`.back-link[_ngcontent-%COMP%] {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-muted);
        font-size: 13px;
        margin-bottom: 14px;
      }
      .back-link[_ngcontent-%COMP%]:hover {
        color: var(--navy);
      }
      .vp-header[_ngcontent-%COMP%] {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 18px;
      }
      .vp-title[_ngcontent-%COMP%] {
        font-size: 20px;
        font-weight: 800;
        color: var(--text);
      }
      .vp-sub[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 3px;
      }
      .vp-filters[_ngcontent-%COMP%] {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .vp-tabs[_ngcontent-%COMP%] {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .vp-tab[_ngcontent-%COMP%] {
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 7px 14px;
        font-size: 12px;
        background: #fff;
        color: var(--text-muted);
        cursor: pointer;
        font-family: inherit;
      }
      .vp-tab.active[_ngcontent-%COMP%] {
        border-color: rgba(0, 0, 0, 0.3);
        color: var(--text);
        font-weight: 700;
        background: var(--surface-2);
      }
      .vp-table-wrap[_ngcontent-%COMP%] {
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
      }
      .vp-table[_ngcontent-%COMP%] {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .vp-table[_ngcontent-%COMP%]   thead[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%] {
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
      }
      .vp-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {
        text-align: left;
        padding: 10px 16px;
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .vp-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
      }
      .vp-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:last-child   td[_ngcontent-%COMP%] {
        border-bottom: none;
      }
      .vp-row[_ngcontent-%COMP%] {
        cursor: pointer;
        transition: background 0.15s;
      }
      .vp-row[_ngcontent-%COMP%]:hover {
        background: var(--surface-2);
      }
      .vp-name[_ngcontent-%COMP%] {
        font-weight: 700;
        color: var(--text);
      }
      .vp-muted[_ngcontent-%COMP%] {
        color: var(--text-muted);
      }
      .vp-action-btn[_ngcontent-%COMP%] {
        padding: 7px 14px;
        font-size: 12px;
      }`]})}}return n})();export{Jt as VacancyApplicationsComponent};
