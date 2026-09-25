import{a as z}from"./chunk-QFCQU3HH.js";import{a as R}from"./chunk-ZNJ26Q73.js";import{a as _t}from"./chunk-QE4ZAOCQ.js";import{e as Y,f as B}from"./chunk-CET3Q6JE.js";import{a as ut,b as ft}from"./chunk-45W3S2SA.js";import{a as mt,b as pt}from"./chunk-SQBE4R6V.js";import{a as lt,b as dt,h as ct,i as st}from"./chunk-ESAPAEHX.js";import{a as Z,c as tt,e as et}from"./chunk-4M26LYWK.js";import{a as N}from"./chunk-4RWRTKWZ.js";import{b as U,d as w,f as G,g as j,j as L,l as X,n as H,s as J,u as K}from"./chunk-N2HTPRNI.js";import{a as rt}from"./chunk-Q3DYOERB.js";import{a as it,d as nt}from"./chunk-TA45CJ45.js";import{a as at,b as ot}from"./chunk-7JNYMZIO.js";import{K as W,d as $}from"./chunk-ANE7AGRT.js";import{$a as I,$b as v,Bb as k,Eb as p,Hb as M,Ia as F,Ib as q,Jb as o,Kb as a,Lb as s,Nb as S,Pb as C,Pc as A,Qb as m,Yb as O,Zb as r,_b as Q,ac as P,bc as V,eb as l,ic as D,ka as h,pa as T,rb as b,xb as u,ya as _,za as x,zb as g}from"./chunk-MZNVNSF4.js";var Ct=(n,c)=>c.id,ht=(n,c)=>c.candidateQualificationId;function gt(n,c){n&1&&(o(0,"div",1)(1,"div")(2,"h2",27),s(3,"i",28),r(4," Qualifications "),a(),o(5,"p",29),r(6," Education and certifications, visible to recruiters "),a()()())}function vt(n,c){if(n&1&&(o(0,"div",36),r(1),a()),n&2){let t=m().$implicit,i=m(2);l(),v(" Completed ",i.formatYear(t.yearCompleted)," ")}}function bt(n,c){if(n&1){let t=S();o(0,"input",41),C("change",function(e){_(t);let d=m().$implicit,f=m(2);return x(f.qualYearDraft[d.id]=e.target.value)}),a(),o(1,"span",42),r(2,"AI couldn't find a date \u2014 set one to add this."),a()}if(n&2){let t,i=m().$implicit,e=m(2);g("max",e.maxDate)("value",(t=e.qualYearDraft[i.id])!==null&&t!==void 0?t:"")}}function St(n,c){if(n&1){let t=S();o(0,"div",32)(1,"div",33)(2,"div",34),r(3),a(),o(4,"div",35),r(5),a(),u(6,vt,2,1,"div",36)(7,bt,3,2),a(),o(8,"div",37)(9,"button",38),C("click",function(){let e=_(t).$implicit,d=m(2);return x(d.addSuggestedQualification(e))}),s(10,"i",6),r(11," Add "),a(),o(12,"button",39),C("click",function(){let e=_(t).$implicit,d=m(2);return x(d.autofillStore.removeQualification(e.id))}),s(13,"i",40),a()()()}if(n&2){let t=c.$implicit,i=m(2);l(3),Q(t.name),l(2),P(" ",t.qualificationType," \xB7 ",t.institution," "),l(),p(6,t.yearCompleted?6:7),l(3),g("disabled",i.saving()||!t.yearCompleted&&!i.qualYearDraft[t.id])}}function yt(n,c){if(n&1&&(o(0,"div",2)(1,"div",30),s(2,"i",31),r(3),a(),M(4,St,14,5,"div",32,Ct),a()),n&2){let t=m();l(3),v(" Found ",t.autofillStore.qualifications().length," qualification(s) in your CV \u2014 review and add "),l(),q(t.autofillStore.qualifications())}}function Et(n,c){n&1&&(o(0,"mat-error"),r(1,"Required"),a())}function wt(n,c){n&1&&(o(0,"mat-error"),r(1,"Required"),a())}function Mt(n,c){n&1&&(o(0,"mat-error"),r(1,"Required"),a())}function qt(n,c){if(n&1){let t=S();o(0,"span",19),s(1,"i",43),r(2),o(3,"button",44),C("click",function(){_(t);let e=m();return x(e.clearSelectedFile())}),s(4,"i",40),a()()}if(n&2){let t=m();l(2),v(" ",t.selectedFile().name," ")}}function Qt(n,c){n&1&&s(0,"mat-spinner",24)}function Tt(n,c){if(n&1&&(o(0,"div",25),s(1,"i",45),r(2),a()),n&2){let t=m();l(2),v(" ",t.apiError," ")}}function Ft(n,c){n&1&&(o(0,"div",26),s(1,"mat-spinner",46),a())}function It(n,c){n&1&&(o(0,"div",26),s(1,"i",47),o(2,"p"),r(3,"No qualifications added yet."),a()())}function kt(n,c){if(n&1&&(o(0,"a",53),s(1,"i",18),r(2),a()),n&2){let t=c,i=m(3);g("href",i.fileUrl(t.fileUrl),I),l(2),v(" ",t.originalFileName," ")}}function Ot(n,c){n&1&&(o(0,"span",57),s(1,"i",58),r(2," No certificate attached"),a())}function Pt(n,c){if(n&1){let t=S();o(0,"div",49)(1,"div",50)(2,"div",51),r(3),a(),o(4,"div",52),r(5),a(),u(6,kt,3,2,"a",53)(7,Ot,3,0),a(),o(8,"div",54)(9,"button",55),C("click",function(){let e=_(t).$implicit,d=m(2);return x(d.remove(e))}),s(10,"i",56),a()()()}if(n&2){let t,i=c.$implicit,e=m(2);l(3),Q(i.name),l(2),V(" ",i.qualificationType," \xB7 ",i.institution," \xB7 ",e.formatYear(i.yearCompleted)," "),l(),p(6,(t=e.attachmentFor(i.candidateQualificationId))?6:7,t)}}function Vt(n,c){if(n&1&&(o(0,"div",48),M(1,Pt,11,5,"div",49,ht),a()),n&2){let t=m();l(),q(t.qualifications())}}var se=(()=>{class n{constructor(){this.embedded=!1,this.autoAdvanceOnSave=!0,this.saved=new F,this.fb=h(J),this.state=h(z),this.qualService=h(R),this.docService=h(B),this.toast=h(rt),this.autofillStore=h(N),this.qualifications=b([]),this.attachments=b([]),this.loading=b(!1),this.saving=b(!1),this.apiError="",this.maxDate=new Date().toISOString().substring(0,10),this.selectedFile=b(null),this.qualYearDraft={},this.form=this.fb.group({qualificationType:["Education",w.required],name:["",w.required],institution:["",w.required],yearCompleted:["",w.required]})}invalid(t){let i=this.form.get(t);return!!i&&i.invalid&&(i.dirty||i.touched)}formatYear(t){return new Date(t).getFullYear().toString()}fileUrl(t){return`${$.apiUrl.replace(/\/api\/?$/,"")}${t}`}attachmentFor(t){return this.attachments().find(i=>i.qualificationId===t)}ngOnInit(){this.load()}load(){let t=this.state.profile();t&&(this.loading.set(!0),this.qualService.getAll(t.candidateId).subscribe({next:i=>{this.qualifications.set(i),this.loadAttachments(t.candidateId)},error:()=>this.loading.set(!1)}))}loadAttachments(t){this.docService.getAll(t).subscribe({next:i=>{this.attachments.set(i.filter(e=>e.qualificationId!=null)),this.loading.set(!1)},error:()=>this.loading.set(!1)})}onFileSelected(t){let i=t.target.files?.[0];if(!i)return;let e=Y(i);if(e){this.toast.show(e,"error"),t.target.value="";return}this.selectedFile.set(i),t.target.value=""}clearSelectedFile(){this.selectedFile.set(null)}add(){let t=this.state.profile();if(!t||this.form.invalid)return;this.apiError="",this.saving.set(!0);let i=this.qualifications().length===0,e=this.form.value;this.qualService.create(t.candidateId,{qualificationType:e.qualificationType,name:e.name,institution:e.institution,yearCompleted:new Date(e.yearCompleted).toISOString()}).subscribe({next:d=>{this.qualifications.update(E=>[d,...E]);let f=this.selectedFile();if(!f){this.finishAdd("Qualification added.",i);return}let y=d.qualificationType==="Certification"?"Certification":"Qualification";this.docService.upload(t.candidateId,y,f,d.candidateQualificationId).subscribe({next:E=>{this.attachments.update(xt=>[...xt,E]),this.finishAdd("Qualification added with certificate attached.",i)},error:E=>{this.finishAdd(`Qualification added, but the file failed to attach: ${E.message}`,i)}})},error:d=>{this.saving.set(!1),this.apiError=d.message}})}finishAdd(t,i){this.saving.set(!1),this.selectedFile.set(null),this.form.reset({qualificationType:"Education",name:"",institution:"",yearCompleted:""}),this.toast.show(t,"success"),i&&this.saved.emit()}remove(t){let i=this.state.profile();i&&confirm(`Remove "${t.name}"? Any attached certificate will be removed too.`)&&this.qualService.delete(i.candidateId,t.candidateQualificationId).subscribe({next:()=>{this.qualifications.update(e=>e.filter(d=>d.candidateQualificationId!==t.candidateQualificationId)),this.attachments.update(e=>e.filter(d=>d.qualificationId!==t.candidateQualificationId)),this.toast.show("Qualification removed.","success")},error:e=>this.toast.show(e.message,"error")})}addSuggestedQualification(t){let i=this.state.profile(),e=t.yearCompleted??this.qualYearDraft[t.id];!i||!e||(this.saving.set(!0),this.qualService.create(i.candidateId,{qualificationType:t.qualificationType,name:t.name,institution:t.institution,yearCompleted:new Date(e).toISOString()}).subscribe({next:d=>{this.qualifications.update(f=>[d,...f]),this.saving.set(!1),this.autofillStore.removeQualification(t.id),this.toast.show(`"${d.name}" added.`,"success"),this.qualifications().length===1&&this.autoAdvanceOnSave&&this.saved.emit()},error:d=>{this.saving.set(!1),this.apiError=d.message}}))}static{this.\u0275fac=function(i){return new(i||n)}}static{this.\u0275cmp=T({type:n,selectors:[["app-candidate-qualifications"]],inputs:{embedded:"embedded",autoAdvanceOnSave:"autoAdvanceOnSave"},outputs:{saved:"saved"},standalone:!0,features:[D],decls:51,vars:17,consts:[["fileInput",""],[1,"page-header"],[1,"autofill-review-block"],[1,"mat-elevation-z1",2,"border-radius","12px","margin-bottom","16px"],[2,"padding","18px 20px"],[1,"form-section-label"],[1,"ti","ti-plus"],[3,"ngSubmit","formGroup"],[1,"field-grid"],["appearance","outline",2,"width","100%"],["formControlName","qualificationType"],["value","Education"],["value","Certification"],["matInput","","formControlName","name","placeholder","e.g. BSc Computer Science"],["matInput","","formControlName","institution","placeholder","e.g. University of Pretoria"],["matInput","","type","date","formControlName","yearCompleted",3,"max"],[1,"attach-row"],["type","button","mat-stroked-button","",2,"border-radius","8px",3,"click"],[1,"ti","ti-paperclip"],[1,"attach-filename"],["type","file","accept",".pdf,.doc,.docx",2,"display","none",3,"change"],[1,"form-note",2,"margin-top","4px"],[1,"ti","ti-info-circle"],["mat-raised-button","","color","primary","type","submit",2,"border-radius","8px","margin-top","12px",3,"disabled"],["diameter","16",2,"display","inline-block","margin-right","6px"],[1,"api-error",2,"margin-top","12px"],[1,"empty-state"],[1,"page-title"],[1,"ti","ti-school"],[1,"page-sub"],[1,"autofill-review-header"],[1,"ti","ti-sparkles"],[1,"autofill-card","autofill-card-stack"],[1,"autofill-card-body"],[1,"autofill-card-title"],[1,"autofill-card-sub"],[1,"autofill-card-desc"],[1,"autofill-card-actions"],["mat-stroked-button","",2,"border-radius","8px",3,"click","disabled"],["type","button",1,"chip-dismiss",3,"click"],[1,"ti","ti-x"],["type","date",1,"ai-mini-date",3,"change","max","value"],[1,"autofill-missing-note"],[1,"ti","ti-file-check",2,"color","#2D7A4F"],["type","button",1,"attach-remove",3,"click"],[1,"ti","ti-alert-circle"],["diameter","32"],[1,"ti","ti-school-off"],[2,"display","flex","flex-direction","column","gap","8px"],[1,"doc-slot"],[1,"doc-info"],[1,"doc-name"],[1,"doc-meta"],["target","_blank",1,"attach-link",3,"href"],[1,"doc-actions"],[1,"btn-remove",3,"click"],[1,"ti","ti-trash"],[1,"attach-missing"],[1,"ti","ti-paperclip-off"]],template:function(i,e){if(i&1){let d=S();o(0,"div"),u(1,gt,7,0,"div",1)(2,yt,6,1,"div",2),o(3,"mat-card",3)(4,"mat-card-content",4)(5,"div",5),s(6,"i",6),r(7," Add a qualification "),a(),o(8,"form",7),C("ngSubmit",function(){return _(d),x(e.add())}),o(9,"div",8)(10,"mat-form-field",9)(11,"mat-label"),r(12,"Type"),a(),o(13,"mat-select",10)(14,"mat-option",11),r(15,"Education"),a(),o(16,"mat-option",12),r(17,"Certification"),a()()(),o(18,"mat-form-field",9)(19,"mat-label"),r(20,"Name"),a(),s(21,"input",13),u(22,Et,2,0,"mat-error"),a(),o(23,"mat-form-field",9)(24,"mat-label"),r(25,"Institution"),a(),s(26,"input",14),u(27,wt,2,0,"mat-error"),a(),o(28,"mat-form-field",9)(29,"mat-label"),r(30,"Year completed"),a(),s(31,"input",15),u(32,Mt,2,0,"mat-error"),a()(),o(33,"div",16)(34,"button",17),C("click",function(){_(d);let y=O(39);return x(y.click())}),s(35,"i",18),r(36),a(),u(37,qt,5,1,"span",19),o(38,"input",20,0),C("change",function(y){return _(d),x(e.onFileSelected(y))}),a()(),o(40,"p",21),s(41,"i",22),r(42," PDF, DOC, DOCX \xB7 max 5 MB. You can add this later if you don't have it on hand. "),a(),o(43,"button",23),u(44,Qt,1,0,"mat-spinner",24),s(45,"i",6),r(46," Add "),a()(),u(47,Tt,3,1,"div",25),a()(),u(48,Ft,2,0,"div",26)(49,It,4,0)(50,Vt,3,0),a()}i&2&&(k("page-container",!e.embedded)("step-body-padded",e.embedded),l(),p(1,e.embedded?-1:1),l(),p(2,e.autofillStore.qualifications().length?2:-1),l(6),g("formGroup",e.form),l(14),p(22,e.invalid("name")?22:-1),l(5),p(27,e.invalid("institution")?27:-1),l(4),g("max",e.maxDate),l(),p(32,e.invalid("yearCompleted")?32:-1),l(4),v("\xA0",e.selectedFile()?"Change file":"Attach certificate / transcript (optional)"," "),l(),p(37,e.selectedFile()?37:-1),l(6),g("disabled",e.form.invalid||e.saving()),l(),p(44,e.saving()?44:-1),l(3),p(47,e.apiError?47:-1),l(),p(48,e.loading()?48:e.qualifications().length?50:49))},dependencies:[A,_t,K,L,U,G,j,X,H,st,ct,lt,dt,pt,mt,ft,ut,W,nt,it,et,Z,tt,ot,at],styles:[`.step-body-padded[_ngcontent-%COMP%] {
        padding: 1.5rem;
      }
      .attach-row[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .attach-filename[_ngcontent-%COMP%] {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #1a5c35;
        background: var(--green-bg);
        border: 1px solid var(--green-mid);
        border-radius: 20px;
        padding: 5px 10px;
      }
      .attach-remove[_ngcontent-%COMP%] {
        background: none;
        border: none;
        cursor: pointer;
        color: inherit;
        opacity: 0.6;
        padding: 0;
        margin-left: 2px;
      }
      .attach-remove[_ngcontent-%COMP%]:hover {
        opacity: 1;
      }
      .attach-link[_ngcontent-%COMP%] {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: #1565c0;
        margin-top: 4px;
        text-decoration: none;
        font-weight: 500;
      }
      .attach-link[_ngcontent-%COMP%]:hover {
        text-decoration: underline;
      }
      .attach-missing[_ngcontent-%COMP%] {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      .autofill-review-block[_ngcontent-%COMP%] {
        margin-bottom: 20px;
      }
      .autofill-review-header[_ngcontent-%COMP%] {
        font-size: 12px;
        font-weight: 600;
        color: #6a1b9a;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
      }
      .autofill-card[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: #fff;
        border: 1px solid #ce93d8;
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 8px;
      }
      .autofill-card-stack[_ngcontent-%COMP%] {
        align-items: flex-start;
      }
      .autofill-card-body[_ngcontent-%COMP%] {
        flex: 1;
        min-width: 0;
      }
      .autofill-card-title[_ngcontent-%COMP%] {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .autofill-card-sub[_ngcontent-%COMP%] {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .autofill-card-desc[_ngcontent-%COMP%] {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 4px;
      }
      .autofill-missing-note[_ngcontent-%COMP%] {
        display: block;
        font-size: 11px;
        color: #c0392b;
        margin-top: 4px;
      }
      .autofill-card-actions[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
      .ai-mini-date[_ngcontent-%COMP%] {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 6px 8px;
        font-size: 12px;
        margin-top: 6px;
      }
      .chip-dismiss[_ngcontent-%COMP%] {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.5;
        padding: 4px;
      }
      .chip-dismiss[_ngcontent-%COMP%]:hover {
        opacity: 1;
      }`]})}}return n})();export{se as a};
