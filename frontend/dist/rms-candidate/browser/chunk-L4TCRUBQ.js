import{b as G,f as H}from"./chunk-CET3Q6JE.js";import{b as J,f as K,i as Z,t as X}from"./chunk-N2HTPRNI.js";import{a as oe}from"./chunk-Q3DYOERB.js";import{a as ee,b as te,d as ne}from"./chunk-TA45CJ45.js";import{a as re}from"./chunk-M56CYPUR.js";import{a as ie,b as ae}from"./chunk-7JNYMZIO.js";import{c as Q,e as W,g as Y}from"./chunk-WSFR5KAX.js";import{d as I}from"./chunk-ANE7AGRT.js";import{$a as T,$b as u,Ab as z,Bb as A,Cb as N,Db as q,Eb as s,Hb as w,Ib as S,Jb as i,Jc as U,Kb as n,Lb as m,Nb as P,Oc as B,Pb as v,Pc as j,Qb as p,Zb as a,_b as _,ab as R,ac as b,eb as o,ec as L,fc as F,gc as V,ic as $,ka as g,lc as M,mc as k,pa as D,rb as f,xb as x,ya as h,yc as E,za as C,zb as y}from"./chunk-MZNVNSF4.js";var pe=(t,r)=>r.candidateDocumentId,le=(t,r)=>r.skillId,de=(t,r)=>r.name,se=(t,r)=>r.company;function me(t,r){if(t&1&&(i(0,"div",5)(1,"div",13),a(2),n(),i(3,"div")(4,"div",14),a(5),n(),i(6,"div",15),a(7),i(8,"span"),a(9),n()()()()),t&2){let e=p();o(2),_(e.candidateInitials()),o(3),b(" ",e.data().candidate.firstName," ",e.data().candidate.lastName," "),o(2),u(" Applied ",e.formatDate(e.data().application.appliedAt)," \xA0\xB7\xA0 "),o(),q("status-pill s-",e.statusClass(e.data().application.status),""),o(),u(" ",e.data().application.status," ")}}function xe(t,r){t&1&&(i(0,"div",11),m(1,"mat-spinner",16),n())}function _e(t,r){t&1&&(i(0,"div",11),m(1,"i",17),i(2,"p"),a(3,"Could not load application."),n()())}function ue(t,r){if(t&1&&(i(0,"div",34)(1,"div",35),m(2,"i",36),i(3,"span"),a(4,"Skill Match"),n(),i(5,"span",37),a(6),n()(),i(7,"div",38),m(8,"div",39),n(),i(9,"div",40),a(10),n()()),t&2){let e=p(2);N(e.matchLevelClass()),o(6),u("",e.skillMatchSummary().percentage,"%"),o(2),z("width",e.skillMatchSummary().percentage,"%"),o(2),b(" ",e.skillMatchSummary().matched," of ",e.skillMatchSummary().total," required skills matched ")}}function ve(t,r){t&1&&(i(0,"span",29),a(1,"Loading documents\u2026"),n())}function fe(t,r){if(t&1&&m(0,"iframe",48),t&2){let e=p().$implicit,l=p(3);y("src",l.safeDocUrl(e),R)("title",e.originalFileName)}}function ge(t,r){if(t&1){let e=P();i(0,"div",42),v("click",function(){let d=h(e).$implicit,c=p(3);return C(c.toggleDocPreview(d))}),m(1,"i",43),i(2,"div",44)(3,"div",45),a(4),n(),i(5,"div",46),a(6),n()(),m(7,"i",47),n(),x(8,fe,1,2,"iframe",48)}if(t&2){let e=r.$implicit,l=p(3);o(4),u(" ",l.docLabel(e.documentType)," "),o(2),u(" ",e.originalFileName," "),o(),A("ti-chevron-down",l.expandedDocId()!==e.candidateDocumentId)("ti-chevron-up",l.expandedDocId()===e.candidateDocumentId),o(),s(8,l.expandedDocId()===e.candidateDocumentId?8:-1)}}function he(t,r){if(t&1&&(i(0,"div",41),w(1,ge,9,7,null,null,pe),n()),t&2){let e=p(2);o(),S(e.documents())}}function Ce(t,r){t&1&&(i(0,"span",29),a(1,"No documents submitted"),n())}function be(t,r){t&1&&m(0,"i",54)}function we(t,r){if(t&1&&(i(0,"span",52),a(1),i(2,"span",53),a(3),n(),x(4,be,1,0,"i",54),n()),t&2){let e=r.$implicit,l=p(3);A("tag-match",l.isSkillMatch(e.skillId)),o(),u(" ",e.skillName," "),o(2),_(e.proficiencyLevel),o(),s(4,l.isSkillMatch(e.skillId)?4:-1)}}function Se(t,r){if(t&1&&(i(0,"div",33),w(1,we,5,5,"span",49,le),n(),i(3,"div",50),m(4,"i",51),a(5," Green skills match vacancy requirements "),n()),t&2){let e=p(2);o(),S(e.data().candidate.skills)}}function ye(t,r){t&1&&(i(0,"span",29),a(1,"No skills listed"),n())}function Me(t,r){if(t&1&&(i(0,"div",55)(1,"div",56),a(2),n(),i(3,"div",57),a(4),M(5,"date"),n()()),t&2){let e=r.$implicit;o(2),_(e.name),o(2),b(" ",e.institution," \xB7 ",k(5,3,e.yearCompleted,"yyyy")," ")}}function ke(t,r){if(t&1&&w(0,Me,6,6,"div",55,de),t&2){let e=p(2);S(e.data().candidate.qualifications)}}function Ee(t,r){t&1&&(i(0,"span",29),a(1,"None listed"),n())}function Pe(t,r){if(t&1&&(i(0,"div",55)(1,"div",56),a(2),n(),i(3,"div",57),a(4),M(5,"date"),n()()),t&2){let e=r.$implicit;o(2),_(e.name),o(2),b(" ",e.institution," \xB7 ",k(5,3,e.yearCompleted,"yyyy")," ")}}function Oe(t,r){if(t&1&&w(0,Pe,6,6,"div",55,de),t&2){let e=p(2);S(e.data().candidate.certifications)}}function Ae(t,r){t&1&&(i(0,"span",29),a(1,"None listed"),n())}function Ie(t,r){if(t&1&&(i(0,"p",62),a(1),n()),t&2){let e=p().$implicit;o(),_(e.projectsAndDuties)}}function De(t,r){if(t&1&&(i(0,"div",58)(1,"div",59),a(2),n(),i(3,"div",60),a(4),n(),i(5,"div",61),a(6),M(7,"date"),M(8,"date"),n(),x(9,Ie,2,1,"p",62),n()),t&2){let e=r.$implicit;o(2),_(e.role),o(2),_(e.company),o(2),b(" ",k(7,5,e.startDate,"MMM yyyy")," \u2014 ",e.endDate?k(8,8,e.endDate,"MMM yyyy"):"Present"," "),o(3),s(9,e.projectsAndDuties?9:-1)}}function Te(t,r){if(t&1&&w(0,De,10,11,"div",58,se),t&2){let e=p(2);S(e.data().candidate.experiences)}}function Re(t,r){t&1&&(i(0,"span",29),a(1,"No experience listed"),n())}function ze(t,r){t&1&&(i(0,"span",64),a(1,"Required"),n())}function Ne(t,r){if(t&1&&(i(0,"span",63),a(1),i(2,"span",53),a(3),n(),x(4,ze,2,0,"span",64),n()),t&2){let e=r.$implicit;o(),u(" ",e.skillName," "),o(2),_(e.proficiencyLevel),o(),s(4,e.isRequired?4:-1)}}function qe(t,r){if(t&1&&(i(0,"div",33),w(1,Ne,5,3,"span",63,le),n()),t&2){let e=p(2);o(),S(e.data().vacancy.requiredSkills)}}function Le(t,r){t&1&&(i(0,"span",29),a(1,"Not specified"),n())}function Fe(t,r){if(t&1&&(i(0,"p",28),a(1),n()),t&2){let e=p(2);o(),u(" ",e.data().vacancy.requiredQualifications," ")}}function Ve(t,r){t&1&&(i(0,"span",29),a(1,"Not specified"),n())}function $e(t,r){if(t&1&&(i(0,"div",24)(1,"div",25),a(2,"Additional Requirements"),n(),i(3,"p",32),a(4),n()()),t&2){let e=p(2);o(4),u(" ",e.data().vacancy.requirements," ")}}function Ue(t,r){if(t&1&&(i(0,"div",18)(1,"div",19)(2,"div",20),m(3,"i",21),a(4," Candidate Profile "),n(),i(5,"div",22),x(6,ue,11,7,"div",23),i(7,"div",24)(8,"div",25),a(9,"Contact"),n(),i(10,"div",26)(11,"span",27),a(12,"Name"),n(),i(13,"span",28),a(14),n()(),i(15,"div",26)(16,"span",27),a(17,"Email"),n(),i(18,"span",28),a(19),n()(),i(20,"div",26)(21,"span",27),a(22,"Phone"),n(),i(23,"span",28),a(24),n()()(),i(25,"div",24)(26,"div",25),a(27,"Submitted Documents"),n(),x(28,ve,2,0,"span",29)(29,he,3,0)(30,Ce,2,0),n(),i(31,"div",24)(32,"div",25),a(33,"Skills"),n(),x(34,Se,6,0)(35,ye,2,0),n(),i(36,"div",24)(37,"div",25),a(38,"Qualifications"),n(),x(39,ke,2,0)(40,Ee,2,0),n(),i(41,"div",24)(42,"div",25),a(43,"Certifications"),n(),x(44,Oe,2,0)(45,Ae,2,0),n(),i(46,"div",24)(47,"div",25),a(48,"Experience"),n(),x(49,Te,2,0)(50,Re,2,0),n()()(),m(51,"div",30),i(52,"div",19)(53,"div",20),m(54,"i",31),a(55," Vacancy Requirements "),n(),i(56,"div",22)(57,"div",24)(58,"div",25),a(59,"Position"),n(),i(60,"div",26)(61,"span",27),a(62,"Title"),n(),i(63,"span",28),a(64),n()(),i(65,"div",26)(66,"span",27),a(67,"Type"),n(),i(68,"span",28),a(69),n()(),i(70,"div",26)(71,"span",27),a(72,"Location"),n(),i(73,"span",28),a(74),n()(),i(75,"div",26)(76,"span",27),a(77,"Posted for"),n(),i(78,"span",28),a(79),n()(),i(80,"div",26)(81,"span",27),a(82,"Min. Experience"),n(),i(83,"span",28),a(84),n()()(),i(85,"div",24)(86,"div",25),a(87,"Job Description"),n(),i(88,"p",32),a(89),n()(),i(90,"div",24)(91,"div",25),a(92,"Required Skills"),n(),x(93,qe,3,0,"div",33)(94,Le,2,0),n(),i(95,"div",24)(96,"div",25),a(97,"Required Qualifications"),n(),x(98,Fe,2,1,"p",28)(99,Ve,2,0),n(),x(100,$e,5,1,"div",24),n()()()),t&2){let e,l,d,c=p();o(6),s(6,c.skillMatchSummary().total>0?6:-1),o(8),b(" ",c.data().candidate.firstName," ",c.data().candidate.lastName," "),o(5),_(c.data().candidate.email),o(5),_((e=c.data().candidate.phone)!==null&&e!==void 0?e:"\u2014"),o(4),s(28,c.documentsLoading()?28:c.documents().length?29:30),o(6),s(34,c.data().candidate.skills.length?34:35),o(5),s(39,c.data().candidate.qualifications.length?39:40),o(5),s(44,c.data().candidate.certifications.length?44:45),o(5),s(49,c.data().candidate.experiences.length?49:50),o(15),_(c.data().vacancy.title),o(5),_(c.data().vacancy.employmentType),o(5),_((l=c.data().vacancy.location)!==null&&l!==void 0?l:"\u2014"),o(5),_((d=c.data().vacancy.postedFor)!==null&&d!==void 0?d:"\u2014"),o(5),u(" ",c.data().vacancy.minYearsExperience!=null?c.data().vacancy.minYearsExperience+" year(s)":"\u2014"," "),o(5),u(" ",c.data().vacancy.description," "),o(4),s(93,c.data().vacancy.requiredSkills.length?93:94),o(5),s(98,c.data().vacancy.requiredQualifications?98:99),o(2),s(100,c.data().vacancy.requirements?100:-1)}}function Be(t,r){if(t&1){let e=P();i(0,"div",12)(1,"div",65)(2,"div",66),a(3,"Drop this candidate?"),n(),i(4,"p",67),a(5),n(),i(6,"textarea",68),V("ngModelChange",function(d){h(e);let c=p();return F(c.dropNotes,d)||(c.dropNotes=d),C(d)}),a(7,"            "),n(),i(8,"div",69)(9,"button",2),v("click",function(){h(e);let d=p();return C(d.showDropConfirm.set(!1))}),a(10," Cancel "),n(),i(11,"button",70),v("click",function(){h(e);let d=p();return C(d.drop())}),a(12," Confirm Drop "),n()()()()}if(t&2){let e=p();o(5),b(" ",e.data().candidate.firstName," ",e.data().candidate.lastName," will be marked as Not Selected and saved to the talent pool. "),o(),L("ngModel",e.dropNotes),o(5),y("disabled",e.actioning())}}function je(t,r){if(t&1){let e=P();i(0,"div",71),v("click",function(){h(e);let d=p();return C(d.closeDocModal())}),i(1,"div",72),v("click",function(d){return h(e),C(d.stopPropagation())}),i(2,"div",66),a(3),n(),i(4,"p",67),a(5),n(),i(6,"div",69)(7,"button",2),v("click",function(){h(e);let d=p();return C(d.closeDocModal())}),a(8," Close "),n(),i(9,"a",73),m(10,"i",74),a(11," Download "),n()()()()}if(t&2){let e=p();o(3),u(" ",e.docLabel(e.previewModalDoc().documentType)," "),o(2),u(" ",e.previewModalDoc().originalFileName," can't be previewed in the browser for this file type. Download it to view the contents. "),o(4),y("href",e.docDownloadUrl(e.previewModalDoc()),T)}}var dt=(()=>{class t{constructor(){this.route=g(W),this.router=g(Y),this.appService=g(re),this.sanitizer=g(Q),this.toast=g(oe),this.documentService=g(H),this.rawDocuments=f([]),this.location=g(U),this.data=f(null),this.loading=f(!0),this.actioning=f(!1),this.showDropConfirm=f(!1),this.dropNotes="",this.documentsLoading=f(!1),this.expandedDocId=f(null),this.previewModalDoc=f(null),this.documents=E(()=>{let e=new Map;for(let l of this.rawDocuments()){let d=`${l.documentType}:${l.qualificationId??"none"}`,c=e.get(d);(!c||new Date(l.uploadedAt)>new Date(c.uploadedAt))&&e.set(d,l)}return Array.from(e.values())}),this.vacancySkillIds=E(()=>new Set(this.data()?.vacancy.requiredSkills.map(e=>e.skillId)??[])),this.STATUS_CLASS={Applied:"applied",UnderReview:"shortlisted",Shortlisted:"interview",OfferExtended:"offer",Hired:"offer",NotSelected:"rejected"},this.skillMatchSummary=E(()=>{let e=this.data()?.vacancy.requiredSkills??[],l=new Set(this.data()?.candidate.skills.map(O=>O.skillId)??[]),d=e.filter(O=>l.has(O.skillId)).length,c=e.length,ce=c>0?Math.round(d/c*100):0;return{matched:d,total:c,percentage:ce}}),this.matchLevelClass=E(()=>{let e=this.skillMatchSummary().percentage;return e>=75?"match-high":e>=40?"match-medium":"match-low"})}ngOnInit(){let e=Number(this.route.snapshot.paramMap.get("id"));this.appService.getReview(e).subscribe({next:l=>{this.data.set(l),this.loading.set(!1),this.loadDocuments(l.candidate.candidateId)},error:l=>{this.toast.show(l.message,"error"),this.loading.set(!1)}})}loadDocuments(e){this.documentsLoading.set(!0),this.documentService.getAll(e).subscribe({next:l=>{this.rawDocuments.set(l),this.documentsLoading.set(!1)},error:()=>this.documentsLoading.set(!1)})}candidateInitials(){let e=this.data()?.candidate;return e?(e.firstName[0]+e.lastName[0]).toUpperCase():""}isSkillMatch(e){return this.vacancySkillIds().has(e)}shortlist(){let e=this.data()?.application;e&&(this.actioning.set(!0),this.appService.updateStatus(e.applicationId,{newStatus:"Shortlisted"}).subscribe({next:()=>{this.toast.show("Candidate shortlisted successfully.","success"),this.router.navigate(["/admin/applications"])},error:l=>{this.actioning.set(!1),this.toast.show(l.message,"error")}}))}drop(){let e=this.data()?.application;e&&(this.actioning.set(!0),this.appService.updateStatus(e.applicationId,{newStatus:"NotSelected"}).subscribe({next:()=>{this.toast.show("Candidate dropped and saved to talent pool.","warn"),this.router.navigate(["/admin/applications"])},error:l=>{this.actioning.set(!1),this.toast.show(l.message,"error")}}))}statusClass(e){return this.STATUS_CLASS[e??""]??"applied"}formatDate(e){return e?new Date(e).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}):"\u2014"}docLabel(e){return G[e]??e}isPdf(e){return e.originalFileName.toLowerCase().endsWith(".pdf")}toggleDocPreview(e){this.isPdf(e)?this.expandedDocId.set(this.expandedDocId()===e.candidateDocumentId?null:e.candidateDocumentId):this.previewModalDoc.set(e)}closeDocModal(){this.previewModalDoc.set(null)}safeDocUrl(e){let l=`${I.apiUrl.replace("/api","")}${e.fileUrl}#toolbar=0&navpanes=0&zoom=page-width`;return this.sanitizer.bypassSecurityTrustResourceUrl(l)}docDownloadUrl(e){return`${I.apiUrl.replace("/api","")}${e.fileUrl}`}goBack(){this.location.back()}static{this.\u0275fac=function(l){return new(l||t)}}static{this.\u0275cmp=D({type:t,selectors:[["app-application-review"]],standalone:!0,features:[$],decls:19,vars:6,consts:[[1,"review-shell"],[1,"review-topbar"],["mat-stroked-button","",3,"click"],[1,"ti","ti-arrow-left"],[1,"topbar-center"],[1,"topbar-identity"],[2,"display","flex","gap","8px"],["mat-stroked-button","","color","warn",3,"click","disabled"],[1,"ti","ti-user-x"],["mat-raised-button","","color","primary",3,"click","disabled"],[1,"ti","ti-user-check"],[1,"empty-state"],[1,"confirm-backdrop"],[1,"topbar-avatar"],[1,"topbar-name"],[1,"topbar-meta"],["diameter","32"],[1,"ti","ti-alert-circle"],[1,"split-container"],[1,"split-panel"],[1,"panel-label"],[1,"ti","ti-user"],[1,"panel-scroll"],[1,"match-summary",3,"class"],[1,"info-section"],[1,"section-heading"],[1,"info-row"],[1,"info-label"],[1,"info-val"],[1,"info-empty"],[1,"split-divider"],[1,"ti","ti-briefcase"],[1,"info-val","description-text"],[1,"tag-wrap"],[1,"match-summary"],[1,"match-summary-header"],[1,"ti","ti-target"],[1,"match-percentage"],[1,"match-bar-wrap"],[1,"match-bar-fill"],[1,"match-summary-text"],[2,"display","flex","flex-direction","column","gap","8px"],[1,"doc-slot","uploaded",2,"cursor","pointer",3,"click"],[1,"ti","ti-file-text","doc-icon","icon-ok"],[1,"doc-info"],[1,"doc-name"],[1,"doc-meta"],[1,"ti"],[1,"doc-preview-iframe",3,"src","title"],[1,"tag",3,"tag-match"],[1,"match-hint"],[1,"ti","ti-info-circle"],[1,"tag"],[1,"tag-sub"],[1,"ti","ti-check","tag-check"],[1,"qual-card"],[1,"qual-name"],[1,"qual-sub"],[1,"exp-card"],[1,"exp-role"],[1,"exp-company"],[1,"exp-dates"],[1,"exp-duties"],[1,"tag","tag-required"],[1,"tag-required-badge"],[1,"confirm-card"],[1,"confirm-title"],[1,"confirm-body"],["placeholder","Reason for dropping (optional)...","rows","3",1,"confirm-notes",3,"ngModelChange","ngModel"],[1,"confirm-actions"],["mat-raised-button","","color","warn",3,"click","disabled"],[1,"confirm-backdrop",3,"click"],[1,"confirm-card",3,"click"],["mat-raised-button","","color","primary","download","",3,"href"],[1,"ti","ti-download"]],template:function(l,d){l&1&&(i(0,"div",0)(1,"div",1)(2,"button",2),v("click",function(){return d.goBack()}),m(3,"i",3),a(4," Back "),n(),i(5,"div",4),x(6,me,10,8,"div",5),n(),i(7,"div",6)(8,"button",7),v("click",function(){return d.showDropConfirm.set(!0)}),m(9,"i",8),a(10," Drop "),n(),i(11,"button",9),v("click",function(){return d.shortlist()}),m(12,"i",10),a(13," Shortlist "),n()()(),x(14,xe,2,0,"div",11)(15,_e,4,0)(16,Ue,101,19)(17,Be,13,4,"div",12)(18,je,12,3,"div",12),n()),l&2&&(o(6),s(6,d.data()?6:-1),o(2),y("disabled",d.actioning()),o(3),y("disabled",d.actioning()),o(3),s(14,d.loading()?14:d.data()?16:15),o(3),s(17,d.showDropConfirm()?17:-1),o(),s(18,d.previewModalDoc()?18:-1))},dependencies:[j,B,ne,te,ee,ae,ie,X,J,K,Z],styles:[`.review-shell[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        background: var(--surface);
        position: relative;
      }
      .review-topbar[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 24px;
        gap: 16px;
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }
      .topbar-identity[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: center;
      }
      .topbar-avatar[_ngcontent-%COMP%] {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(
          135deg,
          var(--navy) 0%,
          var(--navy-light) 100%
        );
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 3px 10px rgba(26, 39, 68, 0.3);
      }
      .topbar-center[_ngcontent-%COMP%] {
        flex: 1;
        text-align: center;
      }
      .topbar-name[_ngcontent-%COMP%] {
        font-size: 15px;
        font-weight: 700;
        color: var(--text);
        text-align: left;
      }

      .topbar-meta[_ngcontent-%COMP%] {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 4px;
      }
      .split-container[_ngcontent-%COMP%] {
        display: flex;
        flex: 1;
        overflow: hidden;
        min-height: 0;
      }
      .split-panel[_ngcontent-%COMP%] {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
        min-height: 0;
      }
      .panel-label[_ngcontent-%COMP%] {
        padding: 10px 20px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }
      .panel-scroll[_ngcontent-%COMP%] {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
        min-height: 0;
      }
      .split-divider[_ngcontent-%COMP%] {
        width: 1px;
        background: var(--border);
        flex-shrink: 0;
      }
      .info-section[_ngcontent-%COMP%] {
        margin-bottom: 24px;
      }
      .section-heading[_ngcontent-%COMP%] {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--border);
      }
      .info-row[_ngcontent-%COMP%] {
        display: flex;
        gap: 12px;
        padding: 5px 0;
      }
      .info-label[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text-muted);
        min-width: 110px;
        flex-shrink: 0;
      }
      .info-val[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text);
      }
      .info-empty[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text-muted);
        font-style: italic;
      }
      .description-text[_ngcontent-%COMP%] {
        line-height: 1.7;
        white-space: pre-wrap;
        margin: 0;
        font-size: 13px;
      }
      .tag-wrap[_ngcontent-%COMP%] {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 6px;
      }
      .tag[_ngcontent-%COMP%] {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 4px 10px;
        font-size: 12px;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .tag-match[_ngcontent-%COMP%] {
        background: #e8f5e9;
        border-color: #a5d6a7;
        color: #1b5e20;
      }
      .tag-required[_ngcontent-%COMP%] {
        background: #e3f2fd;
        border-color: #90caf9;
        color: #0d47a1;
      }
      .tag-sub[_ngcontent-%COMP%] {
        font-size: 10px;
        opacity: 0.7;
      }
      .tag-check[_ngcontent-%COMP%] {
        font-size: 11px;
      }
      .tag-required-badge[_ngcontent-%COMP%] {
        font-size: 9px;
        font-weight: 700;
        background: #0d47a1;
        color: #fff;
        border-radius: 4px;
        padding: 1px 5px;
        margin-left: 2px;
      }
      .match-hint[_ngcontent-%COMP%] {
        font-size: 11px;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 6px;
      }
      .qual-card[_ngcontent-%COMP%] {
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
      }
      .qual-card[_ngcontent-%COMP%]:last-child {
        border-bottom: none;
      }
      .qual-name[_ngcontent-%COMP%] {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .qual-sub[_ngcontent-%COMP%] {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .exp-card[_ngcontent-%COMP%] {
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
      }
      .exp-card[_ngcontent-%COMP%]:last-child {
        border-bottom: none;
      }
      .exp-role[_ngcontent-%COMP%] {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .exp-company[_ngcontent-%COMP%] {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 1px;
      }
      .exp-dates[_ngcontent-%COMP%] {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .exp-duties[_ngcontent-%COMP%] {
        font-size: 12px;
        color: var(--text);
        margin-top: 6px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .confirm-backdrop[_ngcontent-%COMP%] {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      .confirm-card[_ngcontent-%COMP%] {
        background: var(--surface);
        border-radius: 12px;
        padding: 28px;
        width: 420px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }
      .confirm-title[_ngcontent-%COMP%] {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 8px;
      }
      .confirm-body[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 14px;
        line-height: 1.6;
      }
      .confirm-notes[_ngcontent-%COMP%] {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 10px;
        font-size: 13px;
        color: var(--text);
        background: var(--surface-2);
        resize: none;
        box-sizing: border-box;
        margin-bottom: 16px;
      }
      .confirm-actions[_ngcontent-%COMP%] {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .doc-preview-iframe[_ngcontent-%COMP%] {
        width: 100%;
        height: 500px;
        border: 1px solid var(--border);
        border-radius: 8px;
        margin: 4px 0 4px 44px; 

      }
      .match-summary[_ngcontent-%COMP%] {
        border-radius: 12px;
        padding: 14px 18px;
        margin-bottom: 20px;
        border: 1.5px solid var(--border);
      }
      .match-summary-header[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 10px;
      }
      .match-percentage[_ngcontent-%COMP%] {
        margin-left: auto;
        font-size: 16px;
        font-weight: 800;
      }
      .match-bar-wrap[_ngcontent-%COMP%] {
        height: 6px;
        background: var(--surface-3);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      .match-bar-fill[_ngcontent-%COMP%] {
        height: 100%;
        border-radius: 3px;
        transition: width 0.4s ease;
      }
      .match-summary-text[_ngcontent-%COMP%] {
        font-size: 12px;
        color: var(--text-muted);
      }

      .match-high[_ngcontent-%COMP%] {
        background: var(--green-bg);
        border-color: var(--green-mid);
      }
      .match-high[_ngcontent-%COMP%]   .match-summary-header[_ngcontent-%COMP%], .match-high[_ngcontent-%COMP%]   .match-percentage[_ngcontent-%COMP%] {
        color: #1a5c35;
      }
      .match-high[_ngcontent-%COMP%]   .match-bar-fill[_ngcontent-%COMP%] {
        background: var(--green);
      }

      .match-medium[_ngcontent-%COMP%] {
        background: var(--amber-bg);
        border-color: #ffe0b2;
      }
      .match-medium[_ngcontent-%COMP%]   .match-summary-header[_ngcontent-%COMP%], .match-medium[_ngcontent-%COMP%]   .match-percentage[_ngcontent-%COMP%] {
        color: var(--amber);
      }
      .match-medium[_ngcontent-%COMP%]   .match-bar-fill[_ngcontent-%COMP%] {
        background: var(--amber);
      }

      .match-low[_ngcontent-%COMP%] {
        background: var(--red-bg);
        border-color: #ffcdd2;
      }
      .match-low[_ngcontent-%COMP%]   .match-summary-header[_ngcontent-%COMP%], .match-low[_ngcontent-%COMP%]   .match-percentage[_ngcontent-%COMP%] {
        color: var(--red);
      }
      .match-low[_ngcontent-%COMP%]   .match-bar-fill[_ngcontent-%COMP%] {
        background: var(--red);
      }`]})}}return t})();export{dt as ApplicationReviewComponent};
