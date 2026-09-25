import{a as ht}from"./chunk-QNP5LWKH.js";import{a as Ct}from"./chunk-RLDXIUNL.js";import{a as W}from"./chunk-C5YO4H7A.js";import{a as Y}from"./chunk-WC3V5O6C.js";import{a as G}from"./chunk-ZNJ26Q73.js";import{a as Z}from"./chunk-FSU7TRMN.js";import{b as J,f as Q}from"./chunk-CET3Q6JE.js";import{a as dt,b as ct}from"./chunk-GOSWB73T.js";import{a as it,e as ot}from"./chunk-4M26LYWK.js";import{a as $}from"./chunk-CSW67XHM.js";import"./chunk-4RWRTKWZ.js";import{a as ft}from"./chunk-H2BZMQVY.js";import{b as X,f as tt,i as et,t as nt}from"./chunk-N2HTPRNI.js";import{a as xt,b as gt}from"./chunk-SFQBHEBC.js";import{a as mt,c as _t}from"./chunk-LPWUQSP2.js";import{a as st}from"./chunk-Q3DYOERB.js";import{d as at}from"./chunk-TA45CJ45.js";import{a as pt}from"./chunk-M56CYPUR.js";import{a as lt,b as rt}from"./chunk-7JNYMZIO.js";import{c as U,e as B,g as q,h as H}from"./chunk-WSFR5KAX.js";import{d as K}from"./chunk-ANE7AGRT.js";import{$a as F,$b as w,Bb as O,Db as I,E as D,Eb as _,J as b,Jb as o,Jc as j,Kb as a,Lb as l,Nb as M,Pb as f,Pc as R,Qb as c,Tb as L,Zb as d,_a as E,_b as P,a as k,ab as z,b as S,eb as s,h as vt,ic as V,ka as g,kc as N,pa as T,rb as p,u as h,xb as m,ya as C,za as u,zb as v}from"./chunk-MZNVNSF4.js";var ut=vt(ht());var bt=e=>["/admin/applications",e,"candidate"];function wt(e,r){e&1&&(o(0,"a",4),l(1,"i",7),d(2," Candidate details "),a()),e&2&&v("routerLink",N(1,bt,r.applicationId))}function Pt(e,r){e&1&&(o(0,"div",5),l(1,"mat-spinner",8),a())}function Mt(e,r){if(e&1&&(o(0,"div",9),l(1,"i",10),d(2),a()),e&2){let t=c();s(2),w(" ",t.loadError(),"")}}function yt(e,r){e&1&&l(0,"mat-spinner",33)}function Ot(e,r){e&1&&l(0,"i",34)}function kt(e,r){e&1&&l(0,"mat-spinner",33)}function St(e,r){e&1&&l(0,"i",35)}function At(e,r){if(e&1){let t=M();o(0,"span",29),l(1,"i",30),d(2),a(),o(3,"div",31)(4,"button",32),f("click",function(){let i=C(t),x=c(3);return u(x.viewFile(i.fileUrl,i.originalFileName,"template-view"))}),m(5,yt,1,0,"mat-spinner",33)(6,Ot,1,0),d(7," View "),a(),o(8,"button",32),f("click",function(){let i=C(t),x=c(3);return u(x.downloadFile(i.fileUrl,i.originalFileName,"template-dl"))}),m(9,kt,1,0,"mat-spinner",33)(10,St,1,0),d(11," Download "),a()()}if(e&2){let t=c(3);s(2),w(" Template: ",r.originalFileName,""),s(2),v("disabled",t.isFileActionLoading("template-view")),s(),_(5,t.isFileActionLoading("template-view")?5:6),s(3),v("disabled",t.isFileActionLoading("template-dl")),s(),_(9,t.isFileActionLoading("template-dl")?9:10)}}function Dt(e,r){e&1&&(o(0,"span",29),l(1,"i",36),d(2," No pre-screening template has been uploaded yet."),a())}function Tt(e,r){e&1&&(o(0,"div",28),l(1,"mat-spinner",37),a())}function Et(e,r){e&1&&l(0,"mat-spinner",41)}function Ft(e,r){e&1&&l(0,"i",42)}function zt(e,r){if(e&1){let t=M();o(0,"div",39)(1,"button",40),f("click",function(){C(t);let i=c(5);return u(i.sendPrescreening())}),m(2,Et,1,0,"mat-spinner",41)(3,Ft,1,0),d(4," Send pre-screening form "),a()()}if(e&2){let t=c(5);s(),v("disabled",t.sendingPrescreening()),s(),_(2,t.sendingPrescreening()?2:3)}}function It(e,r){e&1&&(o(0,"p",29),l(1,"i",43),d(2," A pre-screening form can only be sent once the candidate is Shortlisted."),a())}function Lt(e,r){if(e&1&&(o(0,"div",28),l(1,"i",38),o(2,"p"),d(3,"No pre-screening assessment has been sent for this application yet."),a()(),m(4,zt,5,2,"div",39)(5,It,3,0)),e&2){let t=c(2);s(4),_(4,t.status==="Shortlisted"?4:5)}}function Vt(e,r){if(e&1&&(o(0,"span"),l(1,"i",45),d(2),a()),e&2){let t=c(5);s(2),w(" Received ",t.formatDateTime(t.doc().submittedAt),"")}}function Nt(e,r){e&1&&(o(0,"span"),l(1,"i",46),d(2," Not yet received"),a())}function jt(e,r){e&1&&l(0,"mat-spinner",33)}function Rt(e,r){e&1&&l(0,"i",34)}function Ut(e,r){e&1&&l(0,"mat-spinner",33)}function Bt(e,r){e&1&&l(0,"i",35)}function qt(e,r){e&1&&l(0,"mat-spinner",41)}function Ht(e,r){e&1&&l(0,"i",62)}function Kt(e,r){if(e&1){let t=M();o(0,"div",55),d(1,"Assessment"),a(),o(2,"div",56)(3,"button",57),f("click",function(){C(t);let i=c(6);return u(i.setAssessmentResult("Passed"))}),l(4,"i",45),d(5," Pass "),a(),o(6,"button",58),f("click",function(){C(t);let i=c(6);return u(i.setAssessmentResult("Failed"))}),l(7,"i",59),d(8," Fail "),a()(),o(9,"textarea",60),f("ngModelChange",function(i){C(t);let x=c(6);return u(x.assessmentDraftComment.set(i))}),a(),o(10,"div",61)(11,"span",29),l(12,"i",43),d(13," Not assessed yet"),a(),o(14,"button",40),f("click",function(){C(t);let i=c(6);return u(i.saveAssessment())}),m(15,qt,1,0,"mat-spinner",41)(16,Ht,1,0),d(17," Save assessment "),a()()}if(e&2){let t=c(6);s(3),O("active",t.assessmentDraftResult()==="Passed"),s(3),O("active",t.assessmentDraftResult()==="Failed"),s(3),v("ngModel",t.assessmentDraftComment()),s(5),v("disabled",!t.assessmentDraftResult()||t.savingAssessment()),s(),_(15,t.savingAssessment()?15:16)}}function $t(e,r){if(e&1&&d(0),e&2){let t=c(7);w(" on ",t.formatDateTime(t.doc().reviewedAt)," ")}}function Zt(e,r){if(e&1&&(o(0,"p",64),d(1),a()),e&2){let t=c(7);s(),P(t.doc().recruiterNotes)}}function Jt(e,r){if(e&1&&(o(0,"div",55),d(1,"Assessment"),a(),o(2,"p",29),l(3,"i",63),d(4," Reviewed as "),o(5,"strong"),d(6),a(),m(7,$t,1,1),a(),m(8,Zt,2,1,"p",64)),e&2){let t=c(6);s(3),O("ti-circle-check",t.doc().outcome==="Passed")("ti-circle-x",t.doc().outcome==="Failed"),s(3),P(t.doc().outcome),s(),_(7,t.doc().reviewedAt?7:-1),s(),_(8,t.doc().recruiterNotes?8:-1)}}function Qt(e,r){if(e&1){let t=M();l(0,"mat-divider",47),o(1,"div",25),d(2,"Submitted document"),a(),o(3,"div",48)(4,"span",49),l(5,"i",50),a(),o(6,"div",51)(7,"div",52),d(8),a(),o(9,"div",53),d(10,"Submitted assessment document"),a()(),o(11,"div",54)(12,"button",32),f("click",function(){C(t);let i=c(5);return u(i.viewFile(i.doc().completedFileUrl,i.doc().completedOriginalFileName||"document","submitted-view"))}),m(13,jt,1,0,"mat-spinner",33)(14,Rt,1,0),d(15," View "),a(),o(16,"button",32),f("click",function(){C(t);let i=c(5);return u(i.downloadFile(i.doc().completedFileUrl,i.doc().completedOriginalFileName||"document","submitted-dl"))}),m(17,Ut,1,0,"mat-spinner",33)(18,Bt,1,0),d(19," Download "),a()()(),m(20,Kt,18,7)(21,Jt,9,7)}if(e&2){let t=c(5);s(8),P(t.doc().completedOriginalFileName),s(4),v("disabled",t.isFileActionLoading("submitted-view")),s(),_(13,t.isFileActionLoading("submitted-view")?13:14),s(3),v("disabled",t.isFileActionLoading("submitted-dl")),s(),_(17,t.isFileActionLoading("submitted-dl")?17:18),s(3),_(20,t.doc().status==="Submitted"?20:21)}}function Wt(e,r){e&1&&(o(0,"p",29),l(1,"i",46),d(2," The candidate hasn't uploaded their completed assessment yet."),a())}function Yt(e,r){if(e&1&&(o(0,"div",44)(1,"span"),l(2,"i",42),d(3),a(),m(4,Vt,3,1,"span")(5,Nt,3,0),a(),m(6,Qt,22,6)(7,Wt,3,0)),e&2){let t=c(4);s(3),w(" Sent ",t.formatDateTime(t.doc().sentAt),""),s(),_(4,t.doc().status!=="Sent"?4:5),s(2),_(6,t.doc().status!=="Sent"?6:7)}}function Gt(e,r){if(e&1&&m(0,Lt,6,1)(1,Yt,8,3),e&2){let t=c(3);_(0,t.doc()?1:0)}}function Xt(e,r){if(e&1&&(o(0,"div",11)(1,"div",12)(2,"mat-card",13)(3,"div",14)(4,"div",15),d(5),a(),o(6,"div",16)(7,"div",17),d(8),a(),o(9,"div",18),l(10,"i",19),d(11," Applied for "),o(12,"strong"),d(13),a(),o(14,"span",20),d(15,"\xB7"),a(),l(16,"i",21),d(17),a()(),o(18,"div",22)(19,"span"),l(20,"span",23),d(21),a()()(),l(22,"mat-divider",24),o(23,"div",25),d(24,"Pre-screening assessment"),a(),o(25,"div",26),d(26,"Candidate-submitted screening documentation"),a(),o(27,"div",27),m(28,At,12,5)(29,Dt,3,0),a(),m(30,Tt,2,0,"div",28)(31,Gt,2,1),a()()()),e&2){let t,n=r,i=c(2);s(5),P(i.initials(n.candidateName)),s(3),P(n.candidateName),s(5),P(n.vacancyTitle),s(4),w(" ",i.formatDate(n.appliedAt)," "),s(2),I("status-pill-lg s-",i.statusClass(i.effectiveStatus()),""),s(2),w("",i.label(i.effectiveStatus())," "),s(7),_(28,(t=i.template())?28:29,t),s(2),_(30,i.psLoading()?30:31)}}function te(e,r){if(e&1&&m(0,Xt,32,10,"div",11),e&2){let t,n=c();_(0,(t=n.application())?0:-1,t)}}function ee(e,r){if(e&1&&l(0,"iframe",71),e&2){let t=c();v("src",t.safeUrl,z)}}function ne(e,r){if(e&1&&(o(0,"div",75),l(1,"img",76),a()),e&2){let t=c();s(),L("alt",t.fileName),v("src",t.safeUrl,F)}}function ie(e,r){e&1&&(o(0,"div",5),l(1,"mat-spinner",77),a())}function oe(e,r){e&1&&(o(0,"div",5),l(1,"i",78),o(2,"p"),d(3,"Couldn't render this document. Download it to view the contents."),a()())}function ae(e,r){if(e&1&&l(0,"div",79),e&2){let t=c(3);v("innerHTML",t.docxHtml(),E)}}function le(e,r){if(e&1&&m(0,ie,2,0,"div",5)(1,oe,4,0)(2,ae,1,1),e&2){let t=c(2);_(0,t.docxConverting()?0:t.docxError()?1:t.docxHtml()?2:-1)}}function re(e,r){e&1&&(o(0,"div",5),l(1,"i",78),o(2,"p"),d(3,"Preview isn't available for this file type. Download it to view the contents."),a()())}function se(e,r){if(e&1){let t=M();o(0,"div",65),f("click",function(){C(t);let i=c();return u(i.closeFilePreview())}),o(1,"div",66),f("click",function(i){return C(t),u(i.stopPropagation())}),o(2,"div",67)(3,"div"),l(4,"i",50),d(5),a(),o(6,"button",68),f("click",function(){C(t);let i=c();return u(i.closeFilePreview())}),l(7,"i",69),a()(),o(8,"div",70),m(9,ee,1,1,"iframe",71)(10,ne,2,2)(11,le,3,1)(12,re,4,0),a(),o(13,"div",72)(14,"button",73),f("click",function(){C(t);let i=c();return u(i.closeFilePreview())}),d(15,"Close"),a(),o(16,"button",74),f("click",function(){C(t);let i=c();return u(i.downloadFromPreview())}),l(17,"i",35),d(18," Download "),a()()()()}if(e&2){let t=r;s(5),w(" ",t.fileName,""),s(4),_(9,t.kind==="pdf"?9:t.kind==="image"?10:t.kind==="docx"?11:12)}}var de={Applied:"applied",UnderReview:"shortlisted",Shortlisted:"prescreen",PrescreeningStage:"interview",InterviewStage:"interview",OfferExtended:"offer",Hired:"offer",NotSelected:"rejected",OfferSent:"offer",OfferAccepted:"offer",OfferDeclined:"rejected"},Re=(()=>{class e{constructor(){this.route=g(B),this.router=g(q),this.appService=g(pt),this.candidateService=g(Z),this.documentService=g(Q),this.skillService=g(W),this.experienceService=g(Y),this.qualificationService=g(G),this.prescreening=g(_t),this.vacancyService=g(Ct),this.offerLetter=g(ft),this.toast=g(st),this.sanitizer=g(U),this.location=g(j),this.auth=g($),this.loading=p(!0),this.loadError=p(null),this.updating=p(!1),this.application=p(null),this.candidate=p(null),this.skills=p([]),this.experience=p([]),this.qualifications=p([]),this.documents=p([]),this.vacancy=p(null),this.pendingStatus="",this.psDoc=p(null),this.psLoading=p(!1),this.sendingPrescreening=p(!1),this.template=p(null),this.fileActionKey=p(null),this.previewingFile=p(null),this.docxHtml=p(null),this.docxConverting=p(!1),this.docxError=p(!1),this.assessmentDraftResult=p(null),this.assessmentDraftComment=p(""),this.savingAssessment=p(!1)}ngOnInit(){let t=Number(this.route.snapshot.paramMap.get("id"));if(!t){this.loadError.set("Invalid application."),this.loading.set(!1);return}this.load(t),this.prescreening.getTemplate().subscribe({next:n=>this.template.set(n),error:()=>this.template.set(null)})}load(t){this.loading.set(!0),this.psLoading.set(!0),this.appService.getById(t).subscribe({next:n=>{this.application.set(n),D({candidate:this.candidateService.getById(n.candidateId).pipe(b(()=>h(null))),skills:this.skillService.getAll(n.candidateId).pipe(b(()=>h([]))),experience:this.experienceService.getAll(n.candidateId).pipe(b(()=>h([]))),qualifications:this.qualificationService.getAll(n.candidateId).pipe(b(()=>h([]))),documents:this.documentService.getAll(n.candidateId).pipe(b(()=>h([]))),vacancy:this.vacancyService.getById(n.vacancyId).pipe(b(()=>h(null))),prescreening:this.prescreening.getByApplication(n.applicationId).pipe(b(()=>h(null))),offer:this.offerLetter.getLatest(n.applicationId).pipe(b(()=>h(null)))}).subscribe(i=>{this.candidate.set(i.candidate),this.skills.set(i.skills),this.experience.set(i.experience),this.qualifications.set(i.qualifications),this.documents.set(i.documents),this.vacancy.set(i.vacancy),this.psDoc.set(i.prescreening),this.loading.set(!1),this.psLoading.set(!1),this.syncAssessmentDraft()})},error:n=>{this.loadError.set(n.message),this.loading.set(!1),this.psLoading.set(!1)}})}doc(){return this.psDoc()}effectiveStatus(){let t=this.application();if(!t)return"";let n=this.prescreening.effectiveStatus(t.applicationId,t.status);return n==="OfferExtended"?this.offerLetter.effectiveStatus(t.applicationId,n):n}nextOptions(){return xt(this.effectiveStatus())}label(t){return gt[t]??t}statusClass(t){return de[t]??"applied"}docLabel(t){return J[t]??t}showScheduleInterview(t){if(t.status==="InterviewStage")return!0;let n=this.doc();return t.status==="PrescreeningStage"&&!!n&&n.status==="Reviewed"&&n.outcome==="Passed"}initials(t){if(!t)return"?";let n=t.trim().split(/\s+/).filter(Boolean);if(!n.length)return"?";let i=n[0][0]??"",x=n.length>1?n[n.length-1][0]:"";return(i+x).toUpperCase()}skillClass(t){let n=(t||"").toLowerCase();return n.includes("expert")||n.includes("advanced")?"lvl-expert":n.includes("intermediate")?"lvl-intermediate":"lvl-beginner"}formatDate(t){return new Date(t).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}formatDateTime(t){return new Date(t).toLocaleString("en-ZA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}fileHref(t){if(/^https?:\/\//i.test(t))return t;let n=K.apiUrl.replace(/\/api\/?$/,"");return t.startsWith("/")?n+t:`${n}/${t}`}updateStatus(){let t=this.application();if(!t||!this.pendingStatus)return;let n=this.pendingStatus;this.updating.set(!0),this.appService.updateStatus(t.applicationId,{newStatus:n}).subscribe({next:i=>{this.application.set(i),this.updating.set(!1),this.pendingStatus="",this.toast.show(`${t.candidateName} moved to ${this.label(n)}.`,"success")},error:i=>{this.updating.set(!1),this.toast.show(i.message,"error")}})}sendPrescreening(){let t=this.application();t&&(this.sendingPrescreening.set(!0),this.prescreening.send(t.applicationId).subscribe({next:n=>{this.psDoc.set(n),this.application.set(S(k({},t),{status:"PrescreeningStage"})),this.sendingPrescreening.set(!1),this.toast.show(`Pre-screening form sent to ${t.candidateName}.`,"success")},error:n=>{this.sendingPrescreening.set(!1),this.toast.show(n.message,"error")}}))}isFileActionLoading(t){return this.fileActionKey()===t}viewFile(t,n,i){t&&(this.fileActionKey.set(i),this.prescreening.getFileBlob(t).subscribe({next:x=>{this.fileActionKey.set(null);let y=URL.createObjectURL(x),A=mt(n);this.previewingFile.set({fileName:n,kind:A,safeUrl:this.sanitizer.bypassSecurityTrustResourceUrl(y),objectUrl:y}),this.docxHtml.set(null),this.docxError.set(!1),A==="docx"&&this.convertDocxPreview(x)},error:x=>{this.fileActionKey.set(null),this.toast.show(x.message||"Could not open the document.","error")}}))}convertDocxPreview(t){this.docxConverting.set(!0),t.arrayBuffer().then(n=>ut.convertToHtml({arrayBuffer:n})).then(n=>{this.docxConverting.set(!1),this.docxHtml.set(this.sanitizer.bypassSecurityTrustHtml(n.value))}).catch(()=>{this.docxConverting.set(!1),this.docxError.set(!0)})}downloadFile(t,n,i){t&&(this.fileActionKey.set(i),this.prescreening.downloadFile(t,n).subscribe({next:()=>this.fileActionKey.set(null),error:x=>{this.fileActionKey.set(null),this.toast.show(x.message||"Could not download the document.","error")}}))}downloadFromPreview(){let t=this.previewingFile();if(!t)return;let n=document.createElement("a");n.href=t.objectUrl,n.download=t.fileName,document.body.appendChild(n),n.click(),document.body.removeChild(n)}closeFilePreview(){let t=this.previewingFile();t&&URL.revokeObjectURL(t.objectUrl),this.previewingFile.set(null),this.docxHtml.set(null),this.docxConverting.set(!1),this.docxError.set(!1)}syncAssessmentDraft(){this.assessmentDraftResult.set(null),this.assessmentDraftComment.set("")}setAssessmentResult(t){t!=="Pending"&&this.assessmentDraftResult.set(t)}saveAssessment(){let t=this.application(),n=this.assessmentDraftResult();!t||!n||n==="Pending"||(this.savingAssessment.set(!0),this.prescreening.setOutcome(t.applicationId,n,this.assessmentDraftComment()).subscribe({next:i=>{this.psDoc.set(i),n==="Failed"&&this.application.set(S(k({},t),{status:"NotSelected"})),this.savingAssessment.set(!1),this.toast.show(`Assessment saved: ${n}.`,"success")},error:i=>{this.savingAssessment.set(!1),this.toast.show(i.message,"error")}}))}goBack(){this.location.back()}static{this.\u0275fac=function(n){return new(n||e)}}static{this.\u0275cmp=T({type:e,selectors:[["app-application-detail"]],standalone:!0,features:[V],decls:10,vars:3,consts:[[1,"page-container","ad-page"],[1,"ad-top-bar"],[1,"back-link",2,"cursor","pointer",3,"click"],[1,"ti","ti-arrow-left"],[1,"btn-secondary","ad-top-btn",3,"routerLink"],[1,"empty-state"],[1,"ps-modal-backdrop"],[1,"ti","ti-user"],["diameter","32"],[1,"api-error"],[1,"ti","ti-alert-circle"],[1,"ad-grid"],[1,"ad-col"],[1,"mat-elevation-z1","ad-card"],[1,"ad-header-inline"],[1,"ad-avatar"],[1,"ad-header-info"],[1,"ad-name"],[1,"ad-sub"],[1,"ti","ti-briefcase"],[1,"ad-sub-dot"],[1,"ti","ti-calendar"],[1,"ad-header-actions"],[1,"status-dot"],[2,"margin","20px 0"],[1,"vd-section-label"],[1,"vd-ref",2,"margin-bottom","14px"],[1,"tmpl-row"],[1,"empty-state",2,"padding","1.5rem 0"],[1,"form-note"],[1,"ti","ti-file-text"],[2,"display","flex","gap","8px","flex-shrink","0","margin-left","auto"],["type","button",1,"btn-secondary","doc-view-btn",3,"click","disabled"],["diameter","14",2,"display","inline-block","margin-right","2px"],[1,"ti","ti-eye"],[1,"ti","ti-download"],[1,"ti","ti-alert-triangle"],["diameter","24"],[1,"ti","ti-clipboard-off"],[1,"assess-footer",2,"justify-content","flex-end"],[1,"btn-primary",3,"click","disabled"],["diameter","14",1,"move-btn-spinner"],[1,"ti","ti-send-2"],[1,"ti","ti-info-circle"],[1,"vc-meta",2,"margin-top","14px"],[1,"ti","ti-circle-check"],[1,"ti","ti-hourglass"],[2,"margin","16px 0"],[1,"doc-row",2,"margin-top","10px"],[1,"doc-icon"],[1,"ti","ti-file-description"],[1,"doc-meta"],[1,"doc-name"],[1,"doc-sub"],[2,"display","flex","gap","8px","flex-shrink","0"],[1,"vd-section-label",2,"margin-top","20px"],[1,"assess-toggle"],["type","button",1,"assess-btn","assess-pass",3,"click"],["type","button",1,"assess-btn","assess-fail",3,"click"],[1,"ti","ti-circle-x"],["rows","3","placeholder","Add a comment about this candidate's assessment (optional)\u2026",1,"assess-comment",3,"ngModelChange","ngModel"],[1,"assess-footer"],[1,"ti","ti-device-floppy"],[1,"ti"],[1,"form-note",2,"white-space","pre-line"],[1,"ps-modal-backdrop",3,"click"],[1,"ps-modal",3,"click"],[1,"ps-modal-header"],[1,"ps-modal-close",3,"click"],[1,"ti","ti-x"],[1,"ps-modal-body"],[1,"ps-modal-iframe",3,"src"],[1,"ps-modal-footer"],[1,"btn-secondary",3,"click"],[1,"btn-primary",3,"click"],[1,"ps-modal-image-wrap"],[3,"src","alt"],["diameter","28"],[1,"ti","ti-file-unknown"],[1,"ps-docx-preview",3,"innerHTML"]],template:function(n,i){if(n&1&&(o(0,"div",0)(1,"div",1)(2,"a",2),f("click",function(){return i.goBack()}),l(3,"i",3),d(4," Back "),a(),m(5,wt,3,3,"a",4),a(),m(6,Pt,2,0,"div",5)(7,Mt,3,1)(8,te,1,1),a(),m(9,se,19,2,"div",6)),n&2){let x,y;s(5),_(5,(x=i.application())?5:-1,x),s(),_(6,i.loading()?6:i.loadError()?7:i.application()?8:-1),s(3),_(9,(y=i.previewingFile())?9:-1,y)}},dependencies:[R,nt,X,tt,et,H,ot,it,at,rt,lt,ct,dt],styles:[`.ad-page[_ngcontent-%COMP%] { max-width: 1320px; }

      .back-link[_ngcontent-%COMP%] { display: inline-flex; align-items: center; gap: 6px; }
      .back-link[_ngcontent-%COMP%]:hover { color: var(--navy); }

      .ad-top-bar[_ngcontent-%COMP%] { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
      .ad-top-btn[_ngcontent-%COMP%] { text-decoration: none; font-weight: 700; padding: 11px 22px; font-size: 13.5px; }

      

      .ad-header-inline[_ngcontent-%COMP%] {
        display: flex; align-items: center; gap: 18px;
      }
      .ad-avatar[_ngcontent-%COMP%] {
        width: 58px; height: 58px; border-radius: 50%;
        background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 700; letter-spacing: 0.02em; flex-shrink: 0;
        box-shadow: 0 3px 12px rgba(26,39,68,0.35);
      }
      .ad-header-info[_ngcontent-%COMP%] { flex: 1; min-width: 0; }
      .ad-name[_ngcontent-%COMP%] { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; }
      .ad-sub[_ngcontent-%COMP%] {
        font-size: 13px; color: var(--text-muted); margin-top: 4px;
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
      }
      .ad-sub[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] { font-size: 13px; color: var(--text-muted); }
      .ad-sub[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] { color: var(--text); font-weight: 600; }
      .ad-sub-dot[_ngcontent-%COMP%] { color: rgba(0,0,0,0.2); margin: 0 2px; }

      .status-pill-lg[_ngcontent-%COMP%] {
        font-size: 12px; font-weight: 700; padding: 8px 16px 8px 12px; border-radius: 20px;
        white-space: nowrap; display: inline-flex; align-items: center; gap: 7px; letter-spacing: 0.02em;
        flex-shrink: 0;
      }
      .status-dot[_ngcontent-%COMP%] { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

      .ad-header-actions[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
      .btn-sm[_ngcontent-%COMP%] { padding: 7px 14px !important; font-size: 12px !important; }

      

      .ad-grid[_ngcontent-%COMP%] { display: grid; grid-template-columns: 1fr; max-width: 920px; margin: 0 auto; gap: 18px; align-items: start; }
      .ad-col[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

      .ad-card[_ngcontent-%COMP%] { border-radius: 16px !important; padding: 26px 30px; }
      .ad-card[_ngcontent-%COMP%]     .mat-mdc-card-content { padding: 0; }

      

      .sec-header[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
      .sec-icon[_ngcontent-%COMP%] {
        width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
        background: var(--surface-2); border: 1px solid var(--border); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .sec-title[_ngcontent-%COMP%] { font-size: 14.5px; font-weight: 700; color: var(--text); }

      

      .kv-grid[_ngcontent-%COMP%] { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
      .kv[_ngcontent-%COMP%] {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 11px 0; border-bottom: 1px solid var(--border);
      }
      .kv[_ngcontent-%COMP%]:nth-last-child(-n+2) { border-bottom: none; padding-bottom: 0; }
      .kv-icon[_ngcontent-%COMP%] {
        width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; margin-top: 1px;
        background: var(--surface-2); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 13px;
      }
      .kv-label[_ngcontent-%COMP%] { display: block; font-size: 10.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .kv-val[_ngcontent-%COMP%] { display: block; font-size: 13px; color: var(--text); font-weight: 600; margin-top: 3px; word-break: break-word; }

      

      .exp-list[_ngcontent-%COMP%] { display: flex; flex-direction: column; }
      .exp-row[_ngcontent-%COMP%] { display: flex; gap: 12px; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
      .exp-row[_ngcontent-%COMP%]:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
      .exp-icon[_ngcontent-%COMP%] {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--blue-bg); color: var(--blue);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .exp-body[_ngcontent-%COMP%] { flex: 1; min-width: 0; }
      .exp-role[_ngcontent-%COMP%] { font-size: 13.5px; font-weight: 700; color: var(--text); }
      .exp-at[_ngcontent-%COMP%] { font-weight: 500; color: var(--text-muted); }
      .exp-dates[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
      .exp-dates[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] { font-size: 12px; }
      .exp-notes[_ngcontent-%COMP%] { font-size: 12.5px; color: var(--text-muted); margin-top: 7px; white-space: pre-line; line-height: 1.6; }

      

      .qual-list[_ngcontent-%COMP%] { display: flex; flex-direction: column; }
      .qual-row[_ngcontent-%COMP%] { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); }
      .qual-row[_ngcontent-%COMP%]:last-child { border-bottom: none; padding-bottom: 0; }
      .qual-row[_ngcontent-%COMP%]:first-child { padding-top: 0; }
      .qual-icon[_ngcontent-%COMP%] {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--purple-bg); color: var(--purple);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .qual-name[_ngcontent-%COMP%] { font-size: 13px; font-weight: 700; color: var(--text); }
      .qual-sub[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

      

      .skill-chips[_ngcontent-%COMP%] { display: flex; gap: 8px; flex-wrap: wrap; }
      .skill-chip[_ngcontent-%COMP%] {
        display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600;
        background: var(--surface-2); border: 1px solid var(--border); border-radius: 20px;
        padding: 7px 12px; color: var(--text);
      }
      .skill-dot[_ngcontent-%COMP%] { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      .skill-dot.lvl-expert[_ngcontent-%COMP%] { background: var(--green); }
      .skill-dot.lvl-intermediate[_ngcontent-%COMP%] { background: var(--blue); }
      .skill-dot.lvl-beginner[_ngcontent-%COMP%] { background: var(--amber); }
      .skill-level[_ngcontent-%COMP%] { color: var(--text-muted); font-weight: 500; }
      .skill-level[_ngcontent-%COMP%]::before { content: '\xB7'; margin-right: 7px; color: rgba(0,0,0,0.2); }

      

      .doc-list[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 8px; }
      .doc-row[_ngcontent-%COMP%] {
        display: flex; align-items: center; gap: 12px; padding: 12px;
        border: 1px solid var(--border); border-radius: 10px; transition: all 0.15s;
      }
      .doc-row[_ngcontent-%COMP%]:hover { border-color: rgba(0,0,0,0.18); box-shadow: var(--shadow-sm); }
      .doc-icon[_ngcontent-%COMP%] {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--blue-bg); color: var(--blue);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .doc-meta[_ngcontent-%COMP%] { flex: 1; min-width: 0; }
      .doc-name[_ngcontent-%COMP%] { font-size: 13px; font-weight: 700; color: var(--text); }
      .doc-sub[_ngcontent-%COMP%] { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .doc-view-btn[_ngcontent-%COMP%] {
        padding: 6px 12px; font-size: 12px; flex-shrink: 0; border-radius: 20px;
        background: var(--blue-bg); border-color: var(--blue); color: var(--blue);
      }
      .doc-view-btn[_ngcontent-%COMP%]:hover { background: var(--blue); border-color: var(--blue); color: #fff; }
      .doc-view-btn[_ngcontent-%COMP%]:disabled { opacity: 0.6; cursor: default; }

      

      .offer-form[_ngcontent-%COMP%] { display: flex; flex-direction: column; gap: 4px; }
      .offer-form[_ngcontent-%COMP%]   mat-form-field[_ngcontent-%COMP%] { width: 100%; }

      

      .move-select[_ngcontent-%COMP%] { width: 100%; }
      .move-btn[_ngcontent-%COMP%] {
        border-radius: 9px !important; width: 100%; height: 46px !important;
        display: inline-flex !important; align-items: center; justify-content: center; gap: 7px;
      }
      .move-btn-spinner[_ngcontent-%COMP%] { display: inline-block; }
      .move-btn-spinner[_ngcontent-%COMP%]     circle { stroke: #fff; }

      

      .vd-title-sm[_ngcontent-%COMP%] { font-size: 15px; font-weight: 700; color: var(--text); }
      .vd-ref[_ngcontent-%COMP%] { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
      .vd-section-label[_ngcontent-%COMP%] { font-size: 11px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }

      

      .tmpl-row[_ngcontent-%COMP%] { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; padding-bottom: 14px; border-bottom: 1px dashed var(--border); }
      .tmpl-row[_ngcontent-%COMP%]   .form-note[_ngcontent-%COMP%] { margin: 0; }
      .tmpl-upload-btn[_ngcontent-%COMP%] { padding: 5px 10px; font-size: 11.5px; flex-shrink: 0; margin-left: auto; cursor: pointer; }
      .ps-file-input[_ngcontent-%COMP%] { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }

      .assess-toggle[_ngcontent-%COMP%] { display: flex; gap: 10px; margin-top: 10px; }
      .assess-btn[_ngcontent-%COMP%] {
        flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        font-size: 13px; font-weight: 600; padding: 10px; border-radius: 9px; cursor: pointer;
        background: var(--surface-2); border: 1.5px solid var(--border); color: var(--text-muted);
        transition: all 0.15s; font-family: inherit;
      }
      .assess-btn[_ngcontent-%COMP%]:hover { border-color: rgba(0,0,0,0.25); }
      .assess-pass.active[_ngcontent-%COMP%] { background: var(--green-bg); border-color: #1a5c35; color: #1a5c35; }
      .assess-fail.active[_ngcontent-%COMP%] { background: var(--red-bg); border-color: var(--red); color: var(--red); }

      .assess-comment[_ngcontent-%COMP%] {
        width: 100%; margin-top: 12px; font-size: 13px; padding: 10px 12px; resize: vertical;
        border-radius: var(--radius); border: 1.5px solid rgba(0,0,0,0.15);
        background: #fff; color: var(--text); font-family: inherit;
      }
      .assess-comment[_ngcontent-%COMP%]:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgba(26,39,68,0.08); }

      .assess-footer[_ngcontent-%COMP%] { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
      .assess-footer[_ngcontent-%COMP%]   .btn-primary[_ngcontent-%COMP%] { padding: 9px 16px; }

      

      .ps-modal-backdrop[_ngcontent-%COMP%] {
        position: fixed; inset: 0; background: rgba(15,20,30,0.55); z-index: 1000;
        display: flex; align-items: center; justify-content: center; padding: 24px;
      }
      .ps-modal[_ngcontent-%COMP%] {
        background: #fff; border-radius: 14px; width: min(760px, 100%); max-height: 86vh;
        display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden;
      }
      .ps-modal-header[_ngcontent-%COMP%] {
        display: flex; align-items: center; justify-content: space-between; padding: 14px 18px;
        border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 700; color: var(--text);
      }
      .ps-modal-header[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] { color: var(--navy); margin-right: 6px; }
      .ps-modal-close[_ngcontent-%COMP%] { background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 6px; }
      .ps-modal-close[_ngcontent-%COMP%]:hover { background: var(--surface-2); color: var(--text); }
      .ps-modal-body[_ngcontent-%COMP%] { flex: 1; overflow: auto; background: var(--surface-2); min-height: 300px; }
      .ps-modal-iframe[_ngcontent-%COMP%] { width: 100%; height: 65vh; border: none; display: block; background: #fff; }
      .ps-modal-image-wrap[_ngcontent-%COMP%] { display: flex; align-items: center; justify-content: center; min-height: 300px; padding: 16px; }
      .ps-modal-image-wrap[_ngcontent-%COMP%]   img[_ngcontent-%COMP%] { max-width: 100%; max-height: 65vh; border-radius: 6px; box-shadow: var(--shadow-sm); }
      .ps-docx-preview[_ngcontent-%COMP%] {
        background: #fff; padding: 32px 40px; max-height: 65vh; overflow: auto;
        font-size: 14px; line-height: 1.6; color: var(--text);
      }
      .ps-docx-preview[_ngcontent-%COMP%]   [_ngcontent-%COMP%]:is(h1, h2[_ngcontent-%COMP%], h3[_ngcontent-%COMP%], h4[_ngcontent-%COMP%], h5[_ngcontent-%COMP%], h6)[_ngcontent-%COMP%] { color: var(--navy); margin: 1.2em 0 0.5em; }
      .ps-docx-preview[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] { margin: 0 0 0.8em; }
      .ps-docx-preview[_ngcontent-%COMP%]   table[_ngcontent-%COMP%] { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
      .ps-docx-preview[_ngcontent-%COMP%]   td[_ngcontent-%COMP%], .ps-docx-preview[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] { border: 1px solid var(--border); padding: 6px 10px; }
      .ps-docx-preview[_ngcontent-%COMP%]   img[_ngcontent-%COMP%] { max-width: 100%; }
      .ps-modal-footer[_ngcontent-%COMP%] { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--border); background: #fff; }`]})}}return e})();export{Re as ApplicationDetailComponent};
