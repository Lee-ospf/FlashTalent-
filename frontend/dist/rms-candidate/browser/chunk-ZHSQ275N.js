import{a as oe}from"./chunk-RLDXIUNL.js";import{a as ee}from"./chunk-QE4ZAOCQ.js";import{a as te,b as ne}from"./chunk-GOSWB73T.js";import{a as Y,b as $}from"./chunk-SQBE4R6V.js";import{a as K,h as Q,i as X}from"./chunk-ESAPAEHX.js";import"./chunk-Q64FFBLU.js";import{a as J,c as G,e as R}from"./chunk-4M26LYWK.js";import{a as ae}from"./chunk-H2BZMQVY.js";import{b as A,f as F,i as B,k as j,t as N}from"./chunk-N2HTPRNI.js";import{a as q}from"./chunk-Q3DYOERB.js";import{d as Z}from"./chunk-TA45CJ45.js";import{a as ie}from"./chunk-M56CYPUR.js";import{a as H,b as U}from"./chunk-7JNYMZIO.js";import{e as W,h as z}from"./chunk-WSFR5KAX.js";import"./chunk-ANE7AGRT.js";import{$b as u,Bb as P,Eb as _,J as E,Jb as t,Kb as n,Lb as d,Nb as w,Pb as C,Pc as I,Qb as s,Zb as o,_a as k,_b as S,ac as T,eb as l,ec as h,fc as v,gc as y,ic as V,ka as O,kc as M,pa as L,rb as g,u as D,xb as x,ya as m,za as f,zb as b}from"./chunk-MZNVNSF4.js";var re=i=>["/admin/applications",i],le=i=>["/admin/applications",i,"candidate"];function de(i,c){i&1&&(t(0,"a",4),d(1,"i",7),o(2," Candidate details "),n()),i&2&&b("routerLink",M(1,le,c.applicationId))}function se(i,c){i&1&&(t(0,"div",5),d(1,"mat-spinner",8),n())}function pe(i,c){if(i&1&&(t(0,"div",9),d(1,"i",10),o(2),n()),i&2){let e=s();l(2),u(" ",e.loadError()," ")}}function ce(i,c){if(i&1&&(t(0,"span",20),o(1),n()),i&2){let e=c;P("pill-pub",e.status==="Sent"||e.status==="Accepted")("pill-type",e.status==="Declined"),l(),T(" ",e.status," \xB7 v",e.versionNumber," ")}}function me(i,c){i&1&&(t(0,"div",21),d(1,"i",35),o(2," No offer letter template has been created yet. Add one below before generating an offer. "),n())}function fe(i,c){if(i&1){let e=w();t(0,"button",39),C("click",function(){m(e);let a=s(5);return f(a.cancelEditTemplate())}),o(1," Cancel "),n()}}function _e(i,c){i&1&&d(0,"mat-spinner",34)}function xe(i,c){i&1&&d(0,"i",40)}function ge(i,c){if(i&1){let e=w();t(0,"div",22),o(1),n(),t(2,"p",23),o(3," Paste the HTML for the offer letter. Wrap each of these field names in double curly braces as placeholders - CandidateName, JobTitle, Salary, StartDate, ClosingDate, Location, EmploymentType - and they'll be filled in automatically. "),n(),t(4,"textarea",36),y("ngModelChange",function(a){m(e);let p=s(4);return v(p.templateDraft,a)||(p.templateDraft=a),f(a)}),n(),t(5,"div",30),d(6,"span"),t(7,"div",37),x(8,fe,2,0,"button",38),t(9,"button",33),C("click",function(){m(e);let a=s(4);return f(a.saveTemplate())}),x(10,_e,1,0,"mat-spinner",34)(11,xe,1,0),o(12," Save template "),n()()(),d(13,"mat-divider",19)}if(i&2){let e=s(4);l(),u(" ",e.template()?"Edit":"Create"," offer letter template "),l(3),h("ngModel",e.templateDraft),l(4),_(8,e.template()?8:-1),l(),b("disabled",!e.templateDraft.trim()||e.savingTemplate()),l(),_(10,e.savingTemplate()?10:11)}}function Ce(i,c){if(i&1){let e=w();t(0,"div",41)(1,"span"),d(2,"i",42),o(3),n(),t(4,"button",39),C("click",function(){m(e);let a=s(4);return f(a.startEditTemplate())}),d(5,"i",43),o(6," Edit template "),n()()}if(i&2){let e=s(4);l(3),u(" Offer letter template ready (",e.formatDateTime(e.template().uploadedAt),")")}}function ue(i,c){i&1&&o(0," The previous offer was declined. Fill in the terms for a new offer letter to send. ")}function he(i,c){i&1&&o(0," Fill in the terms below. The offer letter is generated from the template and sent to the candidate immediately. ")}function ve(i,c){if(i&1&&(t(0,"div",29),d(1,"i",10),o(2),n()),i&2){let e=s(4);l(2),u(" ",e.generateError()," ")}}function ye(i,c){i&1&&d(0,"mat-spinner",34)}function be(i,c){i&1&&d(0,"i",44)}function we(i,c){if(i&1){let e=w();x(0,me,3,0,"div",21)(1,ge,14,5)(2,Ce,7,1),t(3,"div",22),o(4),n(),t(5,"p",23),x(6,ue,1,0)(7,he,1,0),n(),t(8,"div",24)(9,"mat-form-field",25)(10,"mat-label"),o(11,"Job title"),n(),t(12,"input",26),y("ngModelChange",function(a){m(e);let p=s(3);return v(p.draftJobTitle,a)||(p.draftJobTitle=a),f(a)}),n()(),t(13,"mat-form-field",25)(14,"mat-label"),o(15,"Employment type"),n(),t(16,"input",26),y("ngModelChange",function(a){m(e);let p=s(3);return v(p.draftEmploymentType,a)||(p.draftEmploymentType=a),f(a)}),n()(),t(17,"mat-form-field",25)(18,"mat-label"),o(19,"Location"),n(),t(20,"input",26),y("ngModelChange",function(a){m(e);let p=s(3);return v(p.draftLocation,a)||(p.draftLocation=a),f(a)}),n()(),t(21,"mat-form-field",25)(22,"mat-label"),o(23,"Annual salary (ZAR)"),n(),t(24,"input",27),y("ngModelChange",function(a){m(e);let p=s(3);return v(p.draftSalary,a)||(p.draftSalary=a),f(a)}),n()(),t(25,"mat-form-field",25)(26,"mat-label"),o(27,"Start date"),n(),t(28,"input",28),y("ngModelChange",function(a){m(e);let p=s(3);return v(p.draftStartDate,a)||(p.draftStartDate=a),f(a)}),n()(),t(29,"mat-form-field",25)(30,"mat-label"),o(31,"Closing date"),n(),t(32,"input",28),y("ngModelChange",function(a){m(e);let p=s(3);return v(p.draftClosingDate,a)||(p.draftClosingDate=a),f(a)}),n()()(),x(33,ve,3,1,"div",29),t(34,"div",30)(35,"span",31),d(36,"i",32),o(37," Sends to the candidate immediately - there's no draft step"),n(),t(38,"button",33),C("click",function(){m(e);let a=s(3);return f(a.generateOffer())}),x(39,ye,1,0,"mat-spinner",34)(40,be,1,0),o(41," Generate & send offer letter "),n()()}if(i&2){let e=s(3);_(0,!e.template()&&!e.templateLoading()?0:-1),l(),_(1,!e.template()||e.editingTemplate()?1:2),l(3),u(" ",e.offer()?"Send a new offer":"Generate offer"," "),l(2),_(6,e.offer()?6:7),l(6),h("ngModel",e.draftJobTitle),l(4),h("ngModel",e.draftEmploymentType),l(4),h("ngModel",e.draftLocation),l(4),h("ngModel",e.draftSalary),l(4),h("ngModel",e.draftStartDate),l(4),h("ngModel",e.draftClosingDate),l(),_(33,e.generateError()?33:-1),l(5),b("disabled",!e.canGenerate()||e.sendingOffer()),l(),_(39,e.sendingOffer()?39:40)}}function Se(i,c){if(i&1&&(t(0,"p",31),d(1,"i",59),o(2),n()),i&2){let e=s(4);l(2),u(" Sent ",e.formatDateTime(e.offer().sentAt)," \u2014 waiting for the candidate to accept or decline the offer. ")}}function Oe(i,c){if(i&1&&(t(0,"p",60),d(1,"i",61),o(2),t(3,"strong"),o(4,"Hired"),n(),o(5," from the "),t(6,"a",62),o(7,"application page"),n(),o(8," to finish onboarding. "),n()),i&2){let e=s(4);l(2),u(" Accepted ",e.formatDateTime(e.offer().respondedAt),". Move the application to "),l(4),b("routerLink",M(2,re,e.applicationId))}}function Me(i,c){if(i&1){let e=w();t(0,"div",22),o(1,"Offer terms"),n(),t(2,"div",45)(3,"div",46)(4,"span",47),d(5,"i",48),n(),t(6,"div")(7,"span",49),o(8,"Position"),n(),t(9,"span",50),o(10),n()()(),t(11,"div",46)(12,"span",47),d(13,"i",51),n(),t(14,"div")(15,"span",49),o(16,"Employment type"),n(),t(17,"span",50),o(18),n()()(),t(19,"div",46)(20,"span",47),d(21,"i",52),n(),t(22,"div")(23,"span",49),o(24,"Location"),n(),t(25,"span",50),o(26),n()()(),t(27,"div",46)(28,"span",47),d(29,"i",53),n(),t(30,"div")(31,"span",49),o(32,"Salary"),n(),t(33,"span",50),o(34),n()()(),t(35,"div",46)(36,"span",47),d(37,"i",54),n(),t(38,"div")(39,"span",49),o(40,"Start date"),n(),t(41,"span",50),o(42),n()()(),t(43,"div",46)(44,"span",47),d(45,"i",55),n(),t(46,"div")(47,"span",49),o(48,"Closing date"),n(),t(49,"span",50),o(50),n()()()(),d(51,"mat-divider",19),x(52,Se,3,1,"p",31)(53,Oe,9,4),t(54,"div",30)(55,"button",56),C("click",function(){m(e);let a=s(3);return f(a.openPreview())}),d(56,"i",57),o(57," View letter"),n(),t(58,"button",56),C("click",function(){m(e);let a=s(3);return f(a.downloadOffer())}),d(59,"i",58),o(60," Download letter"),n()()}if(i&2){let e=s(3);l(10),S(e.offer().jobTitle),l(8),S(e.offer().employmentType||"\u2014"),l(8),S(e.offer().location||"\u2014"),l(8),u("ZAR ",e.offer().salary.toLocaleString("en-ZA"),""),l(8),S(e.formatDate(e.offer().startDate)),l(8),S(e.formatDate(e.offer().closingDate)),l(2),_(52,e.offer().status==="Sent"?52:e.offer().status==="Accepted"?53:-1)}}function De(i,c){if(i&1&&(t(0,"mat-card",11)(1,"mat-card-content",12)(2,"div",13)(3,"div",14)(4,"div",15),o(5),n(),t(6,"div")(7,"div",16),o(8,"Offer letter"),n(),t(9,"div",17),o(10),n()()(),x(11,ce,2,6,"span",18),n(),d(12,"mat-divider",19),x(13,we,42,13)(14,Me,61,7),n()()),i&2){let e,r=c,a=s(2);l(5),S(a.initials(r.candidateName)),l(5),T("",r.candidateName," \xB7 ",r.vacancyTitle,""),l(),_(11,(e=a.offer())?11:-1,e),l(2),_(13,!a.offer()||a.offer().status==="Declined"?13:14)}}function Ee(i,c){if(i&1&&x(0,De,15,5,"mat-card",11),i&2){let e,r=s();_(0,(e=r.application())?0:-1,e)}}function Te(i,c){if(i&1){let e=w();t(0,"div",63),C("click",function(){m(e);let a=s();return f(a.closePreview())}),t(1,"div",64),C("click",function(a){return m(e),f(a.stopPropagation())}),t(2,"div",65)(3,"div"),d(4,"i",66),o(5),n(),t(6,"button",67),C("click",function(){m(e);let a=s();return f(a.closePreview())}),d(7,"i",68),n()(),t(8,"div",69),d(9,"iframe",70),n(),t(10,"div",71)(11,"button",39),C("click",function(){m(e);let a=s();return f(a.closePreview())}),o(12," Close "),n(),t(13,"button",72),C("click",function(){m(e);let a=s();return f(a.downloadOffer())}),d(14,"i",58),o(15," Download "),n()()()()}if(i&2){let e,r,a=s();l(5),u(" Offer letter \u2014 ",(e=a.offer())==null?null:e.jobTitle," "),l(4),b("srcdoc",(r=(r=a.offer())==null?null:r.generatedHtml)!==null&&r!==void 0?r:"",k)}}var tt=(()=>{class i{constructor(){this.route=O(W),this.appService=O(ie),this.vacancyService=O(oe),this.offerLetter=O(ae),this.toast=O(q),this.loading=g(!0),this.loadError=g(null),this.application=g(null),this.vacancy=g(null),this.applicationId=0,this.template=g(null),this.templateLoading=g(!0),this.templateDraft="",this.editingTemplate=g(!1),this.savingTemplate=g(!1),this.draftJobTitle="",this.draftEmploymentType="",this.draftLocation="",this.draftSalary=null,this.draftStartDate="",this.draftClosingDate="",this.sendingOffer=g(!1),this.generateError=g(null),this.previewOpen=g(!1)}openPreview(){this.previewOpen.set(!0)}closePreview(){this.previewOpen.set(!1)}ngOnInit(){if(this.applicationId=Number(this.route.snapshot.paramMap.get("id")),!this.applicationId){this.loadError.set("Invalid application."),this.loading.set(!1);return}this.appService.getById(this.applicationId).subscribe({next:e=>{this.application.set(e),this.vacancyService.getById(e.vacancyId).pipe(E(()=>D(null))).subscribe(r=>{this.vacancy.set(r),this.offerLetter.getLatest(this.applicationId).pipe(E(()=>D(null))).subscribe(()=>{this.loading.set(!1),this.syncFormDefaults()})})},error:e=>{this.loadError.set(e.message),this.loading.set(!1)}}),this.offerLetter.getTemplate().subscribe({next:e=>{this.template.set(e),this.templateLoading.set(!1),e&&(this.templateDraft=e.htmlContent)},error:()=>{this.template.set(null),this.templateLoading.set(!1)}})}offer(){return this.offerLetter.peek(this.applicationId)}syncFormDefaults(){let e=this.vacancy(),r=this.application();this.draftJobTitle=e?.title??r?.vacancyTitle??"",this.draftEmploymentType=e?.employmentType??"",this.draftLocation=e?.location??"",this.draftSalary=null,this.draftStartDate="",this.draftClosingDate=""}canGenerate(){return!!this.draftSalary&&this.draftSalary>0&&!!this.draftStartDate&&!!this.draftClosingDate}generateOffer(){let e=this.application();!e||!this.canGenerate()||this.draftSalary==null||(this.sendingOffer.set(!0),this.generateError.set(null),this.offerLetter.generate(this.applicationId,{salary:this.draftSalary,startDate:this.draftStartDate,closingDate:this.draftClosingDate,jobTitle:this.draftJobTitle||void 0,employmentType:this.draftEmploymentType||void 0,location:this.draftLocation||void 0}).subscribe({next:()=>{this.sendingOffer.set(!1),this.syncFormDefaults(),this.toast.show(`Offer letter sent to ${e.candidateName}.`,"success")},error:r=>{this.sendingOffer.set(!1),this.generateError.set(r.message)}}))}startEditTemplate(){this.templateDraft=this.template()?.htmlContent??"",this.editingTemplate.set(!0)}cancelEditTemplate(){this.editingTemplate.set(!1)}saveTemplate(){this.templateDraft.trim()&&(this.savingTemplate.set(!0),this.offerLetter.uploadTemplate(this.templateDraft).subscribe({next:e=>{this.template.set(e),this.savingTemplate.set(!1),this.editingTemplate.set(!1),this.toast.show("Offer letter template saved.","success")},error:e=>{this.savingTemplate.set(!1),this.toast.show(e.message,"error")}}))}downloadOffer(){let e=this.offer();e&&this.offerLetter.downloadLetter(e)}initials(e){if(!e)return"?";let r=e.trim().split(/\s+/).filter(Boolean);if(!r.length)return"?";let a=r[0][0]??"",p=r.length>1?r[r.length-1][0]:"";return(a+p).toUpperCase()}formatDate(e){return new Date(e).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}formatDateTime(e){return new Date(e).toLocaleString("en-ZA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}static{this.\u0275fac=function(r){return new(r||i)}}static{this.\u0275cmp=L({type:i,selectors:[["app-offer-letter-detail"]],standalone:!0,features:[V],decls:10,vars:6,consts:[[1,"page-container","ol-page"],[1,"ol-top-bar"],[1,"back-link",3,"routerLink"],[1,"ti","ti-arrow-left"],[1,"btn-secondary","doc-view-btn","ol-top-btn",3,"routerLink"],[1,"empty-state"],[1,"ps-modal-backdrop"],[1,"ti","ti-user"],["diameter","32"],[1,"api-error"],[1,"ti","ti-alert-circle"],[1,"mat-elevation-z1","ol-card"],[2,"padding","28px 32px"],[1,"vd-header"],[1,"ol-header-info"],[1,"ol-avatar"],[1,"vd-title"],[1,"vd-ref"],[1,"pill",3,"pill-pub","pill-type"],[2,"margin","18px 0"],[1,"pill"],[1,"tmpl-warning"],[1,"vd-section-label"],[1,"vd-body"],[1,"offer-form",2,"margin-top","10px"],["appearance","outline",1,"compact-select"],["matInput","",3,"ngModelChange","ngModel"],["matInput","","type","number","placeholder","Enter salary",3,"ngModelChange","ngModel"],["matInput","","type","date",3,"ngModelChange","ngModel"],[1,"api-error",2,"margin-top","12px"],[1,"assess-footer"],[1,"form-note"],[1,"ti","ti-info-circle"],[1,"btn-primary",3,"click","disabled"],["diameter","14",1,"move-btn-spinner"],[1,"ti","ti-alert-triangle"],["rows","8","placeholder","<html>\u2026</html>",1,"assess-comment",2,"margin-top","10px","font-family","'SFMono-Regular',Consolas,monospace","font-size","12px",3,"ngModelChange","ngModel"],[2,"display","flex","gap","10px"],[1,"btn-secondary"],[1,"btn-secondary",3,"click"],[1,"ti","ti-device-floppy"],[1,"tmpl-ready"],[1,"ti","ti-file-check"],[1,"ti","ti-edit"],[1,"ti","ti-send-2"],[1,"kv-grid",2,"grid-template-columns","1fr 1fr","margin-top","10px"],[1,"kv"],[1,"kv-icon"],[1,"ti","ti-briefcase"],[1,"kv-label"],[1,"kv-val"],[1,"ti","ti-clock"],[1,"ti","ti-map-pin"],[1,"ti","ti-currency-dollar"],[1,"ti","ti-calendar-event"],[1,"ti","ti-calendar-due"],[1,"btn-secondary","doc-view-btn",3,"click"],[1,"ti","ti-eye"],[1,"ti","ti-download"],[1,"ti","ti-hourglass"],[1,"form-note",2,"color","#1a5c35"],[1,"ti","ti-circle-check"],[3,"routerLink"],[1,"ps-modal-backdrop",3,"click"],[1,"ps-modal",3,"click"],[1,"ps-modal-header"],[1,"ti","ti-file-certificate"],[1,"ps-modal-close",3,"click"],[1,"ti","ti-x"],[1,"ps-modal-body"],[1,"ps-modal-frame",3,"srcdoc"],[1,"ps-modal-footer"],[1,"btn-primary",3,"click"]],template:function(r,a){if(r&1&&(t(0,"div",0)(1,"div",1)(2,"a",2),d(3,"i",3),o(4," Back to application "),n(),x(5,de,3,3,"a",4),n(),x(6,se,2,0,"div",5)(7,pe,3,1)(8,Ee,1,1),n(),x(9,Te,16,2,"div",6)),r&2){let p;l(2),b("routerLink",M(4,re,a.applicationId)),l(3),_(5,(p=a.application())?5:-1,p),l(),_(6,a.loading()?6:a.loadError()?7:8),l(3),_(9,a.previewOpen()?9:-1)}},dependencies:[I,N,A,j,F,B,z,ee,R,J,G,Z,X,Q,K,$,Y,U,H,ne,te],styles:[`.ol-page[_ngcontent-%COMP%] { max-width: 900px; }
      .ol-top-bar[_ngcontent-%COMP%] { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
      .ol-top-btn[_ngcontent-%COMP%] { text-decoration: none; font-weight: 700; padding: 9px 18px; }
      .back-link[_ngcontent-%COMP%] {
        display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500;
        color: var(--text-muted); text-decoration: none;
      }
      .back-link[_ngcontent-%COMP%]:hover { color: var(--navy); }

      .ol-card[_ngcontent-%COMP%] { border-radius: 16px !important; }
      .ol-header-info[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 16px; }
      .ol-avatar[_ngcontent-%COMP%] {
        width: 52px; height: 52px; border-radius: 50%;
        background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 700; letter-spacing: 0.02em; flex-shrink: 0;
        box-shadow: 0 3px 12px rgba(26,39,68,0.3);
      }

      .vd-header[_ngcontent-%COMP%] { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .vd-title[_ngcontent-%COMP%] { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; }
      .vd-ref[_ngcontent-%COMP%] { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
      .vd-section-label[_ngcontent-%COMP%] { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
      .vd-body[_ngcontent-%COMP%] { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
      .kv-grid[_ngcontent-%COMP%] { display: grid; gap: 16px; }
      .kv[_ngcontent-%COMP%] { display: flex; gap: 10px; align-items: flex-start; }
      .kv-icon[_ngcontent-%COMP%] { width: 32px; height: 32px; border-radius: 9px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; color: var(--navy); flex-shrink: 0; }
      .kv-label[_ngcontent-%COMP%] { display: block; font-size: 10.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .kv-val[_ngcontent-%COMP%] { display: block; font-size: 13.5px; color: var(--text); font-weight: 600; margin-top: 2px; }
      .pill[_ngcontent-%COMP%] { font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 20px; background: var(--surface-2); color: var(--text-muted); white-space: nowrap; }
      .pill-pub[_ngcontent-%COMP%] { background: var(--green-bg, #e8f5e9); color: #1a5c35; }
      .pill-type[_ngcontent-%COMP%] { background: #fdecea; color: var(--red, #c62828); }

      .tmpl-warning[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12.5px;
        color: #8a5a00;
        background: #fff8e1;
        border: 1px solid #ffe4a3;
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 16px;
      }
      .tmpl-ready[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 12.5px;
        color: #1a5c35;
        background: var(--green-bg, #e8f5e9);
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 18px;
      }
      .tmpl-ready[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] {
        margin-right: 4px;
      }

      .offer-form[_ngcontent-%COMP%] {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 14px;
      }
      .compact-select[_ngcontent-%COMP%] {
        width: 100%;
      }
      .assess-comment[_ngcontent-%COMP%] {
        width: 100%;
        font-size: 13px;
        padding: 10px 12px;
        resize: vertical;
        border-radius: var(--radius);
        border: 1.5px solid rgba(0, 0, 0, 0.15);
        background: #fff;
        color: var(--text);
        font-family: inherit;
      }
      .assess-comment[_ngcontent-%COMP%]:focus {
        outline: none;
        border-color: var(--navy);
        box-shadow: 0 0 0 3px rgba(26, 39, 68, 0.08);
      }
      .assess-footer[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      .assess-footer[_ngcontent-%COMP%]   .btn-primary[_ngcontent-%COMP%] {
        padding: 9px 16px;
      }
      .move-btn-spinner[_ngcontent-%COMP%] {
        display: inline-block;
      }
      .move-btn-spinner[_ngcontent-%COMP%]     circle {
        stroke: #fff;
      }

      

      .ps-modal-backdrop[_ngcontent-%COMP%] {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .ps-modal[_ngcontent-%COMP%] {
        background: #fff;
        border-radius: 14px;
        width: min(680px, 100%);
        max-height: 86vh;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-lg);
        overflow: hidden;
      }
      .ps-modal-header[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--border);
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .ps-modal-header[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] {
        color: var(--navy);
        margin-right: 6px;
      }
      .ps-modal-close[_ngcontent-%COMP%] {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        padding: 4px;
        border-radius: 6px;
      }
      .ps-modal-close[_ngcontent-%COMP%]:hover {
        background: var(--surface-2);
        color: var(--text);
      }
      .ps-modal-body[_ngcontent-%COMP%] {
        flex: 1;
        overflow: auto;
        background: var(--surface-2);
        min-height: 300px;
      }
      .ps-modal-frame[_ngcontent-%COMP%] {
        width: 100%;
        height: 60vh;
        border: none;
        background: #fff;
      }
      .ps-modal-footer[_ngcontent-%COMP%] {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 18px;
        border-top: 1px solid var(--border);
        background: #fff;
      }`]})}}return i})();export{tt as OfferLetterDetailComponent};
