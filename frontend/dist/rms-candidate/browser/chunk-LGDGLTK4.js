import{a as $}from"./chunk-C5YO4H7A.js";import{a as L}from"./chunk-WC3V5O6C.js";import{a as j}from"./chunk-ZNJ26Q73.js";import{a as A}from"./chunk-FSU7TRMN.js";import{b as B,f as N}from"./chunk-CET3Q6JE.js";import{a as G,b as J}from"./chunk-GOSWB73T.js";import{a as F,e as Q}from"./chunk-4M26LYWK.js";import{a as U}from"./chunk-M56CYPUR.js";import{a as R,b as H}from"./chunk-7JNYMZIO.js";import{e as q}from"./chunk-WSFR5KAX.js";import{d as D}from"./chunk-ANE7AGRT.js";import{$a as E,$b as h,Bb as O,E as S,Eb as _,Hb as C,Ib as u,J as v,Jb as t,Jc as I,Kb as i,Lb as d,Lc as T,Pb as y,Pc as z,Qb as p,Zb as o,_b as c,ac as b,eb as l,ic as w,ka as s,pa as M,rb as x,u as g,xb as f,zb as P}from"./chunk-MZNVNSF4.js";var V=(e,r)=>r.candidateExperienceId,W=(e,r)=>r.candidateQualificationId,Y=(e,r)=>r.candidateSkillId,Z=(e,r)=>r.candidateDocumentId;function K(e,r){e&1&&(t(0,"div",3),d(1,"mat-spinner",4),i())}function X(e,r){if(e&1&&(t(0,"div",5),d(1,"i",6),o(2),i()),e&2){let n=p();l(2),h(" ",n.loadError()," ")}}function nn(e,r){if(e&1&&(t(0,"div",16)(1,"div",22)(2,"span",23),d(3,"i",24),i(),t(4,"div")(5,"span",25),o(6,"Email"),i(),t(7,"span",26),o(8),i()()(),t(9,"div",22)(10,"span",23),d(11,"i",27),i(),t(12,"div")(13,"span",25),o(14,"Phone"),i(),t(15,"span",26),o(16),i()()(),t(17,"div",22)(18,"span",23),d(19,"i",28),i(),t(20,"div")(21,"span",25),o(22,"Gender"),i(),t(23,"span",26),o(24),i()()(),t(25,"div",22)(26,"span",23),d(27,"i",29),i(),t(28,"div")(29,"span",25),o(30,"Nationality"),i(),t(31,"span",26),o(32),i()()(),t(33,"div",22)(34,"span",23),d(35,"i",30),i(),t(36,"div")(37,"span",25),o(38,"Date of birth"),i(),t(39,"span",26),o(40),i()()(),t(41,"div",22)(42,"span",23),d(43,"i",31),i(),t(44,"div")(45,"span",25),o(46,"Registered"),i(),t(47,"span",26),o(48),i()()()()),e&2){let n=r,a=p(3);l(8),c(n.email),l(8),c(n.phone||"\u2014"),l(8),c(n.gender||"\u2014"),l(8),c(n.nationality||"\u2014"),l(8),c(n.dateOfBirth?a.formatDate(n.dateOfBirth):"\u2014"),l(8),c(a.formatDate(n.registeredAt))}}function en(e,r){e&1&&(t(0,"p",32),o(1," Candidate profile unavailable. "),i())}function tn(e,r){if(e&1&&(t(0,"div",41),o(1),i()),e&2){let n=p().$implicit;l(),c(n.projectsAndDuties)}}function an(e,r){if(e&1&&(t(0,"div",33)(1,"span",34),d(2,"i",35),i(),t(3,"div",36)(4,"div",37),o(5),t(6,"span",38),o(7),i()(),t(8,"div",39),d(9,"i",40),o(10),i(),f(11,tn,2,1,"div",41),i()()),e&2){let n=r.$implicit,a=p(4);l(5),h(" ",n.role," "),l(2),h("at ",n.company,""),l(3),b("",a.formatDate(n.startDate)," \u2013 ",n.endDate?a.formatDate(n.endDate):"Present"," "),l(),_(11,n.projectsAndDuties?11:-1)}}function on(e,r){if(e&1&&(t(0,"div",18),C(1,an,12,5,"div",33,V),i()),e&2){let n=p(3);l(),u(n.experience())}}function ln(e,r){e&1&&(t(0,"p",32),o(1," No experience captured. "),i())}function rn(e,r){if(e&1&&(t(0,"div",42)(1,"span",43),d(2,"i",44),i(),t(3,"div")(4,"div",45),o(5),i(),t(6,"div",46),o(7),i()()()),e&2){let n=r.$implicit,a=p(4);l(2),O("ti-certificate",n.qualificationType==="Certification")("ti-books",n.qualificationType!=="Certification"),l(3),c(n.name),l(2),b(" ",n.institution," \xB7 ",a.formatDate(n.yearCompleted)," ")}}function dn(e,r){if(e&1&&(t(0,"div",19),C(1,rn,8,7,"div",42,W),i()),e&2){let n=p(3);l(),u(n.qualifications())}}function cn(e,r){e&1&&(t(0,"p",32),o(1," No qualifications captured. "),i())}function pn(e,r){if(e&1&&(t(0,"span",47),d(1,"span",48),o(2),t(3,"span",49),o(4),i()()),e&2){let n=r.$implicit,a=p(4);l(),P("ngClass",a.skillClass(n.proficiencyLevel)),l(),c(n.skillName),l(2),c(n.proficiencyLevel)}}function mn(e,r){if(e&1&&(t(0,"div",20),C(1,pn,5,3,"span",47,Y),i()),e&2){let n=p(3);l(),u(n.skills())}}function sn(e,r){e&1&&(t(0,"p",32),o(1," No skills captured. "),i())}function xn(e,r){if(e&1&&(t(0,"div",50)(1,"span",51),d(2,"i",52),i(),t(3,"div",53)(4,"div",54),o(5),i(),t(6,"div",55),o(7),i()(),t(8,"a",56),d(9,"i",57),o(10," View "),i()()),e&2){let n=r.$implicit,a=p(4);l(5),c(a.docLabel(n.documentType)),l(2),b(" ",n.originalFileName," \xB7 uploaded ",a.formatDate(n.uploadedAt)," "),l(),P("href",a.fileHref(n.fileUrl),E)}}function fn(e,r){if(e&1&&(t(0,"div",21),C(1,xn,11,4,"div",50,Z),i()),e&2){let n=p(3);l(),u(n.documents())}}function _n(e,r){e&1&&(t(0,"p",32),o(1," No documents on file. "),i())}function gn(e,r){if(e&1&&(t(0,"mat-card",7)(1,"div",8)(2,"div",9),o(3),i(),t(4,"div",10)(5,"div",11),o(6),i(),t(7,"div",12),d(8,"i",13),o(9," Applied for "),t(10,"strong"),o(11),i()()()(),d(12,"mat-divider",14),t(13,"div",15),o(14,"Candidate details"),i(),f(15,nn,49,6,"div",16)(16,en,2,0),d(17,"mat-divider",17),t(18,"div",15),o(19,"Experience"),i(),f(20,on,3,0,"div",18)(21,ln,2,0),d(22,"mat-divider",17),t(23,"div",15),o(24,"Qualifications"),i(),f(25,dn,3,0,"div",19)(26,cn,2,0),d(27,"mat-divider",17),t(28,"div",15),o(29,"Skills"),i(),f(30,mn,3,0,"div",20)(31,sn,2,0),d(32,"mat-divider",17),t(33,"div",15),o(34,"Submitted documents"),i(),f(35,fn,3,0,"div",21)(36,_n,2,0),i()),e&2){let n,a=r,m=p(2);l(3),c(m.initials(a.candidateName)),l(3),c(a.candidateName),l(5),c(a.vacancyTitle),l(4),_(15,(n=m.candidate())?15:16,n),l(5),_(20,m.experience().length?20:21),l(5),_(25,m.qualifications().length?25:26),l(5),_(30,m.skills().length?30:31),l(5),_(35,m.documents().length?35:36)}}function vn(e,r){if(e&1&&f(0,gn,37,8,"mat-card",7),e&2){let n,a=p();_(0,(n=a.application())?0:-1,n)}}var jn=(()=>{class e{constructor(){this.route=s(q),this.appService=s(U),this.candidateService=s(A),this.documentService=s(N),this.skillService=s($),this.experienceService=s(L),this.qualificationService=s(j),this.location=s(I),this.loading=x(!0),this.loadError=x(null),this.application=x(null),this.candidate=x(null),this.skills=x([]),this.experience=x([]),this.qualifications=x([]),this.documents=x([]),this.applicationId=0}ngOnInit(){if(this.applicationId=Number(this.route.snapshot.paramMap.get("id")),!this.applicationId){this.loadError.set("Invalid application."),this.loading.set(!1);return}this.appService.getById(this.applicationId).subscribe({next:n=>{this.application.set(n),S({candidate:this.candidateService.getById(n.candidateId).pipe(v(()=>g(null))),skills:this.skillService.getAll(n.candidateId).pipe(v(()=>g([]))),experience:this.experienceService.getAll(n.candidateId).pipe(v(()=>g([]))),qualifications:this.qualificationService.getAll(n.candidateId).pipe(v(()=>g([]))),documents:this.documentService.getAll(n.candidateId).pipe(v(()=>g([])))}).subscribe(a=>{this.candidate.set(a.candidate),this.skills.set(a.skills),this.experience.set(a.experience),this.qualifications.set(a.qualifications),this.documents.set(a.documents),this.loading.set(!1)})},error:n=>{this.loadError.set(n.message),this.loading.set(!1)}})}docLabel(n){return B[n]??n}initials(n){if(!n)return"?";let a=n.trim().split(/\s+/).filter(Boolean);if(!a.length)return"?";let m=a[0][0]??"",k=a.length>1?a[a.length-1][0]:"";return(m+k).toUpperCase()}skillClass(n){let a=(n||"").toLowerCase();return a.includes("expert")||a.includes("advanced")?"lvl-expert":a.includes("intermediate")?"lvl-intermediate":"lvl-beginner"}formatDate(n){return new Date(n).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}fileHref(n){if(/^https?:\/\//i.test(n))return n;let a=D.apiUrl.replace(/\/api\/?$/,"");return n.startsWith("/")?a+n:`${a}/${n}`}goBack(){this.location.back()}static{this.\u0275fac=function(a){return new(a||e)}}static{this.\u0275cmp=M({type:e,selectors:[["app-candidate-profile"]],standalone:!0,features:[w],decls:7,vars:1,consts:[[1,"page-container","cp-page"],[1,"back-link",2,"cursor","pointer",3,"click"],[1,"ti","ti-arrow-left"],[1,"empty-state"],["diameter","32"],[1,"api-error"],[1,"ti","ti-alert-circle"],[1,"mat-elevation-z1","ad-card"],[1,"ad-header-inline"],[1,"ad-avatar"],[1,"ad-header-info"],[1,"ad-name"],[1,"ad-sub"],[1,"ti","ti-briefcase"],[2,"margin","20px 0"],[1,"vd-section-label"],[1,"kv-grid",2,"margin-top","10px"],[2,"margin","18px 0"],[1,"exp-list",2,"margin-top","10px"],[1,"qual-list",2,"margin-top","10px"],[1,"skill-chips",2,"margin-top","10px"],[1,"doc-list",2,"margin-top","10px"],[1,"kv"],[1,"kv-icon"],[1,"ti","ti-mail"],[1,"kv-label"],[1,"kv-val"],[1,"ti","ti-phone"],[1,"ti","ti-gender-bigender"],[1,"ti","ti-flag"],[1,"ti","ti-cake"],[1,"ti","ti-calendar-event"],[1,"form-note",2,"margin-top","8px"],[1,"exp-row"],[1,"exp-icon"],[1,"ti","ti-briefcase-2"],[1,"exp-body"],[1,"exp-role"],[1,"exp-at"],[1,"exp-dates"],[1,"ti","ti-calendar"],[1,"exp-notes"],[1,"qual-row"],[1,"qual-icon"],[1,"ti"],[1,"qual-name"],[1,"qual-sub"],[1,"skill-chip"],[1,"skill-dot",3,"ngClass"],[1,"skill-level"],[1,"doc-row"],[1,"doc-icon"],[1,"ti","ti-file-text"],[1,"doc-meta"],[1,"doc-name"],[1,"doc-sub"],["target","_blank","rel","noopener",1,"btn-secondary","doc-view-btn",3,"href"],[1,"ti","ti-eye"]],template:function(a,m){a&1&&(t(0,"div",0)(1,"a",1),y("click",function(){return m.goBack()}),d(2,"i",2),o(3," Back "),i(),f(4,K,2,0,"div",3)(5,X,3,1)(6,vn,1,1),i()),a&2&&(l(4),_(4,m.loading()?4:m.loadError()?5:6))},dependencies:[z,T,Q,F,H,R,J,G],styles:[`.cp-page[_ngcontent-%COMP%] {
        max-width: 820px;
      }
      .back-link[_ngcontent-%COMP%] {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-muted);
        text-decoration: none;
        margin-bottom: 16px;
      }
      .back-link[_ngcontent-%COMP%]:hover {
        color: var(--navy);
      }

      

      .ad-header-inline[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 18px;
      }
      .ad-avatar[_ngcontent-%COMP%] {
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: linear-gradient(
          135deg,
          var(--navy) 0%,
          var(--navy-light) 100%
        );
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.02em;
        flex-shrink: 0;
        box-shadow: 0 3px 12px rgba(26, 39, 68, 0.35);
      }
      .ad-header-info[_ngcontent-%COMP%] {
        flex: 1;
        min-width: 0;
      }
      .ad-name[_ngcontent-%COMP%] {
        font-size: 20px;
        font-weight: 800;
        color: var(--text);
        letter-spacing: -0.2px;
      }
      .ad-sub[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text-muted);
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
      }
      .ad-sub[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text-muted);
      }
      .ad-sub[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {
        color: var(--text);
        font-weight: 600;
      }

      .ad-card[_ngcontent-%COMP%] {
        border-radius: 14px !important;
        padding: 20px 22px;
      }
      .ad-card[_ngcontent-%COMP%]     .mat-mdc-card-content {
        padding: 0;
      }

      .vd-section-label[_ngcontent-%COMP%] {
        font-size: 11px;
        font-weight: 700;
        color: var(--navy);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
      }
      .form-note[_ngcontent-%COMP%] {
        font-size: 12.5px;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      

      .kv-grid[_ngcontent-%COMP%] {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 20px;
      }
      .kv[_ngcontent-%COMP%] {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 11px 0;
        border-bottom: 1px solid var(--border);
      }
      .kv[_ngcontent-%COMP%]:nth-last-child(-n + 2) {
        border-bottom: none;
        padding-bottom: 0;
      }
      .kv-icon[_ngcontent-%COMP%] {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        flex-shrink: 0;
        margin-top: 1px;
        background: var(--surface-2);
        color: var(--navy);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
      }
      .kv-label[_ngcontent-%COMP%] {
        display: block;
        font-size: 10.5px;
        color: var(--text-muted);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .kv-val[_ngcontent-%COMP%] {
        display: block;
        font-size: 13px;
        color: var(--text);
        font-weight: 600;
        margin-top: 3px;
        word-break: break-word;
      }

      

      .exp-list[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
      }
      .exp-row[_ngcontent-%COMP%] {
        display: flex;
        gap: 12px;
        padding-bottom: 16px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--border);
      }
      .exp-row[_ngcontent-%COMP%]:last-child {
        border-bottom: none;
        padding-bottom: 0;
        margin-bottom: 0;
      }
      .exp-icon[_ngcontent-%COMP%] {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        flex-shrink: 0;
        background: var(--blue-bg);
        color: var(--blue);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
      }
      .exp-body[_ngcontent-%COMP%] {
        flex: 1;
        min-width: 0;
      }
      .exp-role[_ngcontent-%COMP%] {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--text);
      }
      .exp-at[_ngcontent-%COMP%] {
        font-weight: 500;
        color: var(--text-muted);
      }
      .exp-dates[_ngcontent-%COMP%] {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 3px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .exp-dates[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] {
        font-size: 12px;
      }
      .exp-notes[_ngcontent-%COMP%] {
        font-size: 12.5px;
        color: var(--text-muted);
        margin-top: 7px;
        white-space: pre-line;
        line-height: 1.6;
      }

      

      .qual-list[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
      }
      .qual-row[_ngcontent-%COMP%] {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 11px 0;
        border-bottom: 1px solid var(--border);
      }
      .qual-row[_ngcontent-%COMP%]:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .qual-row[_ngcontent-%COMP%]:first-child {
        padding-top: 0;
      }
      .qual-icon[_ngcontent-%COMP%] {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        flex-shrink: 0;
        background: var(--purple-bg);
        color: var(--purple);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
      }
      .qual-name[_ngcontent-%COMP%] {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .qual-sub[_ngcontent-%COMP%] {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }

      

      .skill-chips[_ngcontent-%COMP%] {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .skill-chip[_ngcontent-%COMP%] {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 600;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 7px 12px;
        color: var(--text);
      }
      .skill-dot[_ngcontent-%COMP%] {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .skill-dot.lvl-expert[_ngcontent-%COMP%] {
        background: var(--green);
      }
      .skill-dot.lvl-intermediate[_ngcontent-%COMP%] {
        background: var(--blue);
      }
      .skill-dot.lvl-beginner[_ngcontent-%COMP%] {
        background: var(--amber);
      }
      .skill-level[_ngcontent-%COMP%] {
        color: var(--text-muted);
        font-weight: 500;
      }
      .skill-level[_ngcontent-%COMP%]::before {
        content: '\xB7';
        margin-right: 7px;
        color: rgba(0, 0, 0, 0.2);
      }

      

      .doc-list[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .doc-row[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 10px;
        transition: all 0.15s;
      }
      .doc-row[_ngcontent-%COMP%]:hover {
        border-color: rgba(0, 0, 0, 0.18);
        box-shadow: var(--shadow-sm);
      }
      .doc-icon[_ngcontent-%COMP%] {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        flex-shrink: 0;
        background: var(--blue-bg);
        color: var(--blue);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
      }
      .doc-meta[_ngcontent-%COMP%] {
        flex: 1;
        min-width: 0;
      }
      .doc-name[_ngcontent-%COMP%] {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .doc-sub[_ngcontent-%COMP%] {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .doc-view-btn[_ngcontent-%COMP%] {
        padding: 6px 12px;
        font-size: 12px;
        flex-shrink: 0;
      }`]})}}return e})();export{jn as CandidateProfileComponent};
