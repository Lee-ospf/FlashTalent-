import{a as _e}from"./chunk-XWQ2F3EE.js";import{a as K}from"./chunk-QFCQU3HH.js";import"./chunk-FSU7TRMN.js";import{a as ne,b as oe}from"./chunk-GOSWB73T.js";import"./chunk-ESAPAEHX.js";import"./chunk-Q64FFBLU.js";import{b as X}from"./chunk-AONTNQQT.js";import{a as J,e as Q}from"./chunk-4M26LYWK.js";import{b as pe}from"./chunk-7XPUVMCY.js";import{a as se}from"./chunk-H2BZMQVY.js";import{b as Z,f as Y,i as q,t as G}from"./chunk-N2HTPRNI.js";import{c as ce,d as k}from"./chunk-SFQBHEBC.js";import{a as le,b as re,c as de}from"./chunk-LPWUQSP2.js";import{a as ie}from"./chunk-Q3DYOERB.js";import{d as W}from"./chunk-TA45CJ45.js";import{a as ae}from"./chunk-M56CYPUR.js";import{a as ee,b as te}from"./chunk-7JNYMZIO.js";import{c as B,h as H}from"./chunk-WSFR5KAX.js";import"./chunk-ANE7AGRT.js";import{$a as R,$b as v,Bb as E,Db as F,Eb as _,Hb as y,Ib as T,Jb as o,Kb as a,Lb as p,Nb as w,Pb as u,Pc as U,Qb as d,Zb as r,_a as $,_b as h,a as M,ab as N,ac as O,b as L,eb as l,ic as j,ka as I,pa as D,rb as b,xb as x,ya as C,yb as z,za as f,zb as g}from"./chunk-MZNVNSF4.js";var Ce=(i,c)=>c.applicationId,fe=(i,c)=>c.key,xe=(i,c)=>c.interviewId;function ue(i,c){i&1&&(o(0,"div",5),p(1,"i",21),r(2," Create your "),o(3,"a",22),r(4,"candidate profile"),a(),r(5," first to start applying and tracking applications. "),a())}function ve(i,c){if(i&1&&(o(0,"div",6),p(1,"i",23),r(2),a()),i&2){let e=d();l(2),v(" ",e.loadError()," ")}}function ge(i,c){i&1&&(o(0,"div",19),p(1,"i",24),o(2,"p"),r(3,"Loading applications\u2026"),a()())}function he(i,c){i&1&&(o(0,"div",19),p(1,"i",25),o(2,"p"),r(3,"No applications yet."),p(4,"br"),r(5,"Browse vacancies to apply."),a()())}function be(i,c){if(i&1&&r(0),i&2){let e=d().$implicit,t=d(2);v(" \xB7 Updated ",t.formatDate(e.updatedAt)," ")}}function we(i,c){if(i&1){let e=w();o(0,"div",47),u("click",function(){let n=C(e).$implicit,s=d(2).$implicit,m=d(2);return f(m.selectStage(s,n))}),o(1,"div",48),p(2,"i",49),a(),o(3,"div",50),r(4),a()()}if(i&2){let e=c.$implicit,t=c.$index,n=c.$count,s=d(2).$implicit,m=d(2);E("done",e.state==="done")("pip-last",t===n-1)("pip-clickable",e.state!=="pending")("pip-selected",m.currentStage(s)===e.key&&e.state!=="pending"),l(),E("dot-done",e.state==="done")("dot-active",e.state==="active")("dot-rejected",e.state==="rejected"),l(),E("ti-check",e.state==="done")("ti-x",e.state==="rejected")("ti-player-play",e.state==="active")("ti-circle",e.state==="pending"),l(),E("label-done",e.state==="done")("label-active",e.state==="active")("label-rejected",e.state==="rejected"),l(),v(" ",e.label," ")}}function Se(i,c){i&1&&p(0,"mat-spinner",63)}function Ie(i,c){i&1&&p(0,"i",64)}function Ee(i,c){i&1&&p(0,"mat-spinner",63)}function ke(i,c){i&1&&p(0,"i",65)}function Ae(i,c){if(i&1){let e=w();o(0,"button",62),u("click",function(){let n=C(e),s=d(5).$implicit,m=d(2);return f(m.viewFile(n.fileUrl,n.originalFileName,"tmpl-"+s.applicationId+"-view"))}),x(1,Se,1,0,"mat-spinner",63)(2,Ie,1,0),r(3," View document "),a(),o(4,"button",62),u("click",function(){let n=C(e),s=d(5).$implicit,m=d(2);return f(m.downloadFile(n.fileUrl,n.originalFileName,"tmpl-"+s.applicationId+"-dl"))}),x(5,Ee,1,0,"mat-spinner",63)(6,ke,1,0),r(7," Download document "),a()}if(i&2){let e=d(5).$implicit,t=d(2);g("disabled",t.isFileActionLoading("tmpl-"+e.applicationId+"-view")),l(),_(1,t.isFileActionLoading("tmpl-"+e.applicationId+"-view")?1:2),l(3),g("disabled",t.isFileActionLoading("tmpl-"+e.applicationId+"-dl")),l(),_(5,t.isFileActionLoading("tmpl-"+e.applicationId+"-dl")?5:6)}}function Fe(i,c){if(i&1&&(o(0,"div",58),p(1,"i",23),r(2),a()),i&2){let e=d(5).$implicit,t=d(2);l(2),v(" ",t.uploadError(e.applicationId)," ")}}function ye(i,c){i&1&&p(0,"mat-spinner",61)}function Te(i,c){if(i&1){let e=w();o(0,"p",52),r(1," A pre-screening document has been sent for this application. Download it, fill it in, then upload the completed file below. "),a(),o(2,"div",53),x(3,Ae,8,4),a(),o(4,"div",54)(5,"input",55),u("change",function(n){C(e);let s=d(4).$implicit,m=d(2);return f(m.onFileSelected(n,s.applicationId))}),a(),o(6,"label",56),p(7,"i",57),r(8),a(),x(9,Fe,3,1,"div",58),o(10,"div",59)(11,"button",60),u("click",function(){C(e);let n=d(4).$implicit,s=d(2);return f(s.submitUpload(n))}),x(12,ye,1,0,"mat-spinner",61),r(13," Upload completed document "),a()()()}if(i&2){let e,t=d(4).$implicit,n=d(2);l(3),_(3,(e=n.template())?3:-1,e),l(2),g("id","ps-file-"+t.applicationId),l(),g("for","ps-file-"+t.applicationId),l(2),v(" ",n.selectedFileName(t.applicationId)||"Choose completed document"," "),l(),_(9,n.uploadError(t.applicationId)?9:-1),l(2),g("disabled",!n.selectedFileName(t.applicationId)||n.submittingId()===t.applicationId),l(),_(12,n.submittingId()===t.applicationId?12:-1)}}function Oe(i,c){i&1&&p(0,"mat-spinner",63)}function Pe(i,c){i&1&&p(0,"i",64)}function Ve(i,c){i&1&&p(0,"mat-spinner",63)}function Me(i,c){i&1&&p(0,"i",65)}function Le(i,c){if(i&1&&(o(0,"p",73),p(1,"i",49),r(2," Reviewed as "),o(3,"strong"),r(4),a()()),i&2){let e=d(2);l(),E("ti-circle-check",e.outcome==="Passed")("ti-circle-x",e.outcome==="Failed"),l(3),h(e.outcome)}}function De(i,c){if(i&1){let e=w();o(0,"div",66)(1,"span",67),p(2,"i",68),a(),o(3,"div",69)(4,"div",70),r(5),a(),o(6,"div",71),r(7),a()(),o(8,"div",72)(9,"button",62),u("click",function(){C(e);let n=d(),s=d(3).$implicit,m=d(2);return f(m.viewFile(n.completedFileUrl,n.completedOriginalFileName||"document","doc-"+s.applicationId+"-view"))}),x(10,Oe,1,0,"mat-spinner",63)(11,Pe,1,0),r(12," View "),a(),o(13,"button",62),u("click",function(){C(e);let n=d(),s=d(3).$implicit,m=d(2);return f(m.downloadFile(n.completedFileUrl,n.completedOriginalFileName||"document","doc-"+s.applicationId+"-dl"))}),x(14,Ve,1,0,"mat-spinner",63)(15,Me,1,0),r(16," Download "),a()()(),x(17,Le,5,5,"p",73)}if(i&2){let e=d(),t=d(3).$implicit,n=d(2);l(5),v(" ",e.completedOriginalFileName||"Assessment submitted"," "),l(2),v(" Submitted ",n.formatDate(e.submittedAt)," \xB7 the recruiter can now view it "),l(2),g("disabled",n.isFileActionLoading("doc-"+t.applicationId+"-view")),l(),_(10,n.isFileActionLoading("doc-"+t.applicationId+"-view")?10:11),l(3),g("disabled",n.isFileActionLoading("doc-"+t.applicationId+"-dl")),l(),_(14,n.isFileActionLoading("doc-"+t.applicationId+"-dl")?14:15),l(3),_(17,e.status==="Reviewed"?17:-1)}}function $e(i,c){i&1&&(o(0,"div",41)(1,"div",51),r(2," Pre-screening assessment "),a(),x(3,Te,14,7)(4,De,18,7),a()),i&2&&(l(3),_(3,c.status==="Sent"?3:4))}function Re(i,c){i&1&&(o(0,"div",74),p(1,"i",75),o(2,"p"),r(3,"No pre-screening assessment has been sent yet."),a()())}function Ne(i,c){if(i&1&&x(0,$e,5,1,"div",41)(1,Re,4,0),i&2){let e,t=d(2).$implicit,n=d(2);_(0,(e=n.prescreeningDoc(t.applicationId))?0:1,e)}}function ze(i,c){i&1&&(o(0,"p",52),p(1,"i",24),r(2," Loading interview details\u2026 "),a())}function je(i,c){if(i&1&&r(0),i&2){let e=d().$implicit;v(" \xB7 ",e.location," ")}}function Ue(i,c){if(i&1&&(r(0," \xB7 "),o(1,"a",78),r(2,"Meeting link"),a()),i&2){let e=d().$implicit;l(),g("href",e.meetingLink,R)}}function Be(i,c){if(i&1&&(o(0,"div",79),p(1,"i",49),r(2," Outcome: "),o(3,"strong"),r(4),a()()),i&2){let e=d().$implicit;l(),E("ti-circle-check",e.outcome==="Passed")("ti-circle-x",e.outcome==="Failed"),l(3),h(e.outcome)}}function He(i,c){if(i&1&&(o(0,"div",76)(1,"span",67),p(2,"i",77),a(),o(3,"div",69)(4,"div",70),r(5),a(),o(6,"div",71),r(7),x(8,je,1,1)(9,Ue,3,1,"a",78),a(),x(10,Be,5,5,"div",79),a(),o(11,"span"),r(12),a()()),i&2){let e=c.$implicit,t=d(6);l(5),O(" Round ",e.roundNumber," \xB7 ",e.interviewType," "),l(2),v(" ",t.formatDate(e.scheduledAt)," "),l(),_(8,e.location?8:-1),l(),_(9,e.meetingLink?9:-1),l(),_(10,e.outcome&&e.outcome!=="Pending"?10:-1),l(),F("status-pill s-",t.interviewStatusClass(e.status),""),l(),h(e.status)}}function Ke(i,c){if(i&1&&y(0,He,13,10,"div",76,xe),i&2){let e=d(3).$implicit,t=d(2);T(t.interviews(e.applicationId))}}function Ze(i,c){i&1&&(o(0,"div",74),p(1,"i",75),o(2,"p"),r(3,"No interview has been scheduled yet."),a()())}function Ye(i,c){if(i&1&&(o(0,"div",41)(1,"div",51),r(2,"Interview"),a(),x(3,ze,3,0,"p",52)(4,Ke,2,0)(5,Ze,4,0),a()),i&2){let e=d(2).$implicit,t=d(2);l(3),_(3,t.isInterviewLoading(e.applicationId)?3:t.interviews(e.applicationId).length?4:5)}}function qe(i,c){i&1&&p(0,"mat-spinner",63)}function Ge(i,c){if(i&1){let e=w();o(0,"div",53)(1,"button",60),u("click",function(){C(e);let n=d(5).$implicit,s=d(2);return f(s.acceptOffer(n))}),x(2,qe,1,0,"mat-spinner",63),p(3,"i",68),r(4," Accept offer "),a(),o(5,"button",88),u("click",function(){C(e);let n=d(5).$implicit,s=d(2);return f(s.startDecline(n.applicationId))}),p(6,"i",89),r(7," Decline offer "),a()()}if(i&2){let e=d(5).$implicit,t=d(2);l(),g("disabled",t.respondingId()===e.applicationId),l(),_(2,t.respondingId()===e.applicationId?2:-1),l(3),g("disabled",t.respondingId()===e.applicationId)}}function Je(i,c){i&1&&p(0,"mat-spinner",63)}function Qe(i,c){if(i&1){let e=w();o(0,"textarea",90),u("ngModelChange",function(n){C(e);let s=d(5).$implicit,m=d(2);return f(m.setDeclineReason(s.applicationId,n))}),a(),o(1,"div",59)(2,"button",60),u("click",function(){C(e);let n=d(5).$implicit,s=d(2);return f(s.confirmDecline(n))}),x(3,Je,1,0,"mat-spinner",63),r(4," Confirm decline "),a(),o(5,"button",85),u("click",function(){C(e);let n=d(5).$implicit,s=d(2);return f(s.cancelDecline(n.applicationId))}),r(6," Cancel "),a()()}if(i&2){let e=d(5).$implicit,t=d(2);g("ngModel",t.declineReasonDraft(e.applicationId)),l(2),g("disabled",t.respondingId()===e.applicationId),l(),_(3,t.respondingId()===e.applicationId?3:-1)}}function We(i,c){if(i&1&&(o(0,"div",86)(1,"p",87),r(2," Review the terms above, then accept or decline this offer. "),a(),x(3,Ge,8,3,"div",53)(4,Qe,7,3),a()),i&2){let e=d(4).$implicit,t=d(2);l(3),_(3,t.isDeclining(e.applicationId)?4:3)}}function Xe(i,c){if(i&1&&(o(0,"p",91),p(1,"i",68),r(2),a()),i&2){let e=d(),t=d(5);l(2),v(" You accepted this offer on ",t.formatDate(e.respondedAt),". ")}}function et(i,c){if(i&1&&(o(0,"p",92),p(1,"i",89),r(2),a()),i&2){let e=d(),t=d(5);l(2),v(" You declined this offer on ",t.formatDate(e.respondedAt),". ")}}function tt(i,c){if(i&1){let e=w();o(0,"div",41)(1,"div",51),r(2,"Offer letter"),a(),o(3,"div",80)(4,"div",81)(5,"span",82),r(6,"Position"),a(),o(7,"span",83),r(8),a()(),o(9,"div",81)(10,"span",82),r(11,"Employment type"),a(),o(12,"span",83),r(13),a()(),o(14,"div",81)(15,"span",82),r(16,"Location"),a(),o(17,"span",83),r(18),a()(),o(19,"div",81)(20,"span",82),r(21,"Salary"),a(),o(22,"span",83),r(23),a()(),o(24,"div",81)(25,"span",82),r(26,"Proposed start date"),a(),o(27,"span",83),r(28),a()(),o(29,"div",81)(30,"span",82),r(31,"Closing date"),a(),o(32,"span",83),r(33),a()()(),o(34,"div",84)(35,"button",85),u("click",function(){let n=C(e),s=d(5);return f(s.viewOffer(n))}),p(36,"i",64),r(37," View offer letter "),a(),o(38,"button",85),u("click",function(){let n=C(e),s=d(5);return f(s.downloadOffer(n))}),p(39,"i",65),r(40," Download offer letter "),a()(),x(41,We,5,1,"div",86)(42,Xe,3,1)(43,et,3,1),a()}if(i&2){let e=c,t=d(5);l(8),h(e.jobTitle),l(5),h(e.employmentType||"\u2014"),l(5),h(e.location||"\u2014"),l(5),v("ZAR ",e.salary.toLocaleString("en-ZA"),""),l(5),h(t.formatDate(e.startDate)),l(5),h(t.formatDate(e.closingDate)),l(8),_(41,e.status==="Sent"?41:e.status==="Accepted"?42:43)}}function it(i,c){i&1&&(o(0,"div",74),p(1,"i",75),o(2,"p"),r(3,"No offer letter has been generated yet."),a()())}function nt(i,c){if(i&1&&x(0,tt,44,7,"div",41)(1,it,4,0),i&2){let e,t=d(2).$implicit,n=d(2);_(0,(e=n.offerDoc(t.applicationId))?0:1,e)}}function ot(i,c){if(i&1&&(o(0,"div",34),p(1,"mat-divider"),o(2,"div",35)(3,"div",36),r(4,"Recruitment pipeline"),a(),o(5,"div",37),y(6,we,5,29,"div",38,fe),a(),o(8,"p",39),p(9,"i",40),r(10," Tap a completed stage above to see its details. "),a(),x(11,Ne,2,1)(12,Ye,6,1,"div",41)(13,nt,2,1),o(14,"div",42)(15,"span",43),p(16,"i",44),r(17),a(),o(18,"span",43),p(19,"i",45),r(20),a(),o(21,"span",43),p(22,"i",46),r(23),a()()()()),i&2){let e=d().$implicit,t=d(2);l(6),T(t.pipelineSteps(e)),l(5),_(11,t.currentStage(e)==="PrescreeningStage"?11:-1),l(),_(12,t.currentStage(e)==="InterviewStage"?12:-1),l(),_(13,t.currentStage(e)==="OfferExtended"?13:-1),l(4),v(" APP-",e.applicationId,""),l(3),v(" Candidate #",e.candidateId,""),l(3),v(" Vacancy #",e.vacancyId,"")}}function at(i,c){if(i&1){let e=w();o(0,"mat-card",27)(1,"div",28),u("click",function(){let n=C(e).$implicit,s=d(2);return f(s.toggle(n.applicationId))}),o(2,"div"),p(3,"i",29),a(),o(4,"div",30)(5,"div",31),r(6),a(),o(7,"div",32),r(8),x(9,be,1,1),a()(),o(10,"span"),r(11),a(),p(12,"i",33),a(),x(13,ot,24,6,"div",34),a()}if(i&2){let e=c.$implicit,t=d(2);l(),z("aria-expanded",t.isOpen(e.applicationId)),l(),F("app-icon-wrap app-icon-",t.statusClass(e.status),""),l(4),h(e.vacancyTitle),l(2),v(" Applied ",t.formatDate(e.appliedAt)," "),l(),_(9,e.updatedAt?9:-1),l(),F("status-pill s-",t.statusClass(e.status),""),l(),h(t.statusLabel(e.status)),l(),E("open",t.isOpen(e.applicationId)),l(),_(13,t.isOpen(e.applicationId)?13:-1)}}function lt(i,c){if(i&1&&(o(0,"div",26),y(1,at,14,14,"mat-card",27,Ce),a()),i&2){let e=d();l(),T(e.apps())}}function rt(i,c){if(i&1){let e=w();o(0,"div",93),u("click",function(){C(e);let n=d();return f(n.closeOfferPreview())}),o(1,"div",94),u("click",function(n){return C(e),f(n.stopPropagation())}),o(2,"div",95)(3,"div"),p(4,"i",96),r(5),a(),o(6,"button",97),u("click",function(){C(e);let n=d();return f(n.closeOfferPreview())}),p(7,"i",98),a()(),o(8,"div",99),p(9,"iframe",100),a(),o(10,"div",101)(11,"button",85),u("click",function(){C(e);let n=d();return f(n.closeOfferPreview())}),r(12," Close "),a(),o(13,"button",102),u("click",function(){let n=C(e),s=d();return f(s.downloadOffer(n))}),p(14,"i",65),r(15," Download "),a()()()()}if(i&2){let e=c;l(5),v(" Offer letter \u2014 ",e.jobTitle," "),l(4),g("srcdoc",e.generatedHtml,$)}}function dt(i,c){if(i&1&&p(0,"iframe",104),i&2){let e=d();g("src",e.safeUrl,N)}}function ct(i,c){i&1&&(o(0,"div",19),p(1,"i",105),o(2,"p"),r(3,"Preview isn't available for this file type. Download it to view the contents."),a()())}function pt(i,c){if(i&1){let e=w();o(0,"div",93),u("click",function(){C(e);let n=d();return f(n.closeFilePreview())}),o(1,"div",94),u("click",function(n){return C(e),f(n.stopPropagation())}),o(2,"div",95)(3,"div"),p(4,"i",103),r(5),a(),o(6,"button",97),u("click",function(){C(e);let n=d();return f(n.closeFilePreview())}),p(7,"i",98),a()(),o(8,"div",99),x(9,dt,1,1,"iframe",104)(10,ct,4,0),a(),o(11,"div",101)(12,"button",85),u("click",function(){C(e);let n=d();return f(n.closeFilePreview())}),r(13," Close "),a(),o(14,"button",102),u("click",function(){C(e);let n=d();return f(n.downloadFromPreview())}),p(15,"i",65),r(16," Download "),a()()()()}if(i&2){let e=c;l(5),v(" ",e.fileName,""),l(4),_(9,e.kind==="pdf"?9:10)}}var me=["Applied","UnderReview","Shortlisted","PrescreeningStage","InterviewStage","OfferExtended"],Lt=(()=>{class i{constructor(){this.appService=I(ae),this.toast=I(ie),this.prescreening=I(de),this.offerLetter=I(se),this.interviewService=I(pe),this.state=I(K),this.apps=b([]),this.loading=b(!1),this.loadError=b(""),this.expanded=b(new Set),this.submittingId=b(null),this.selectedFiles={},this.uploadErrors={},this.template=b(null),this.respondingId=b(null),this.decliningIds=b(new Set),this.declineReasons={},this.selectedStage=b({}),this.interviewCache=new Map,this.interviewLoadingIds=b(new Set),this.sanitizer=I(B),this.fileActionKey=b(null),this.previewingFile=b(null),this.previewingOffer=b(null)}ngOnInit(){let e=this.state.profile();e&&(this.loading.set(!0),this.appService.getByCandidate(e.candidateId).subscribe({next:t=>{this.apps.set(t),this.loading.set(!1),this.prescreening.preload(t.map(n=>n.applicationId)).subscribe(),this.offerLetter.preload(t.map(n=>n.applicationId)).subscribe()},error:t=>{this.loadError.set(t.message),this.loading.set(!1)}}),this.prescreening.getTemplate().subscribe({next:t=>this.template.set(t),error:()=>this.template.set(null)}))}toggle(e){let t=new Set(this.expanded());t.has(e)?t.delete(e):t.add(e),this.expanded.set(t)}isOpen(e){return this.expanded().has(e)}count(e){return this.apps().filter(t=>t.status===e).length}statusClass(e){return ce(e)}statusLabel(e){return k(e)}formatDate(e){return new Date(e).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}effectiveStatus(e){let t=this.prescreening.effectiveStatus(e.applicationId,e.status);return t==="OfferExtended"?this.offerLetter.effectiveStatus(e.applicationId,t):t}pipelineSteps(e){let t=this.effectiveStatus(e),n=t==="NotSelected"||t==="OfferDeclined",s=t==="Hired",m=t==="OfferSent"||t==="OfferAccepted"?"OfferExtended":t,A=n?[...me,"NotSelected"]:me,P=s?A.length:n?A.length-1:A.indexOf(m);return A.map((S,V)=>n&&S==="NotSelected"?{key:S,label:"Not Selected",state:"rejected"}:V<P?{key:S,label:k(S),state:"done"}:V===P?{key:S,label:k(S),state:"active"}:{key:S,label:k(S),state:"pending"})}selectStage(e,t){t.state!=="pending"&&(this.selectedStage.update(n=>L(M({},n),{[e.applicationId]:t.key})),t.key==="InterviewStage"&&this.loadInterviews(e.applicationId))}currentStage(e){let t=this.selectedStage()[e.applicationId];if(t)return t;let n=this.effectiveStatus(e);return n==="OfferSent"||n==="OfferAccepted"||n==="OfferDeclined"||n==="Hired"?"OfferExtended":n}loadInterviews(e){this.interviewCache.has(e)||(this.interviewLoadingIds.update(t=>new Set([...t,e])),this.interviewService.getByApplication(e).subscribe({next:t=>{this.interviewCache.set(e,t),this.interviewLoadingIds.update(n=>{let s=new Set(n);return s.delete(e),s})},error:()=>{this.interviewCache.set(e,[]),this.interviewLoadingIds.update(t=>{let n=new Set(t);return n.delete(e),n})}}))}interviews(e){return this.interviewCache.get(e)??[]}isInterviewLoading(e){return this.interviewLoadingIds().has(e)}interviewStatusClass(e){return{Scheduled:"interview",Completed:"offer",Cancelled:"rejected"}[e]??"applied"}prescreeningDoc(e){return this.prescreening.peek(e)}fileHref(e){return this.prescreening.fileHref(e)}isFileActionLoading(e){return this.fileActionKey()===e}viewFile(e,t,n){e&&(this.fileActionKey.set(n),this.prescreening.getFileBlob(e).subscribe({next:s=>{this.fileActionKey.set(null);let m=URL.createObjectURL(s);this.previewingFile.set({fileName:t,kind:le(t),safeUrl:this.sanitizer.bypassSecurityTrustResourceUrl(m),objectUrl:m})},error:s=>{this.fileActionKey.set(null),this.toast.show(s.message||"Could not open the document.","error")}}))}downloadFile(e,t,n){e&&(this.fileActionKey.set(n),this.prescreening.downloadFile(e,t).subscribe({next:()=>this.fileActionKey.set(null),error:s=>{this.fileActionKey.set(null),this.toast.show(s.message||"Could not download the document.","error")}}))}closeFilePreview(){let e=this.previewingFile();e&&URL.revokeObjectURL(e.objectUrl),this.previewingFile.set(null)}downloadFromPreview(){let e=this.previewingFile();if(!e)return;let t=document.createElement("a");t.href=e.objectUrl,t.download=e.fileName,document.body.appendChild(t),t.click(),document.body.removeChild(t)}selectedFileName(e){return this.selectedFiles[e]?.name??""}uploadError(e){return this.uploadErrors[e]??""}onFileSelected(e,t){let n=e.target,s=n.files?.[0];if(n.value="",!s)return;let m=re(s);if(m){this.uploadErrors[t]=m,delete this.selectedFiles[t];return}this.selectedFiles[t]=s,delete this.uploadErrors[t]}submitUpload(e){let t=this.selectedFiles[e.applicationId];if(!t){this.uploadErrors[e.applicationId]="Please choose a completed document first.";return}this.submittingId.set(e.applicationId),this.prescreening.submit(e.applicationId,t).subscribe({next:n=>{delete this.selectedFiles[e.applicationId],this.submittingId.set(null),this.toast.show("Pre-screening document uploaded. The recruiter can now view it.","success")},error:n=>{this.submittingId.set(null),this.uploadErrors[e.applicationId]=n.message}})}offerDoc(e){return this.offerLetter.peek(e)}downloadOffer(e){this.offerLetter.downloadLetter(e)}viewOffer(e){this.previewingOffer.set(e)}closeOfferPreview(){this.previewingOffer.set(null)}isDeclining(e){return this.decliningIds().has(e)}startDecline(e){this.decliningIds.update(t=>new Set([...t,e]))}cancelDecline(e){this.decliningIds.update(t=>{let n=new Set(t);return n.delete(e),n}),delete this.declineReasons[e]}declineReasonDraft(e){return this.declineReasons[e]??""}setDeclineReason(e,t){this.declineReasons[e]=t}acceptOffer(e){let t=this.offerLetter.peek(e.applicationId);t&&(this.respondingId.set(e.applicationId),this.offerLetter.respond(t.offerLetterId,"Accepted").subscribe({next:()=>{this.respondingId.set(null),this.toast.show("Offer accepted! The recruiter has been notified.","success")},error:n=>{this.respondingId.set(null),this.toast.show(n.message,"error")}}))}confirmDecline(e){let t=this.offerLetter.peek(e.applicationId);t&&(this.respondingId.set(e.applicationId),this.offerLetter.respond(t.offerLetterId,"Declined").subscribe({next:()=>{this.respondingId.set(null),this.cancelDecline(e.applicationId),this.toast.show("Offer declined.","success")},error:n=>{this.respondingId.set(null),this.toast.show(n.message,"error")}}))}static{this.\u0275fac=function(t){return new(t||i)}}static{this.\u0275cmp=D({type:i,selectors:[["app-applications"]],standalone:!0,features:[j],decls:48,vars:11,consts:[[1,"page-container"],[1,"page-header"],[1,"page-title"],[1,"ti","ti-file-check"],[1,"page-sub"],[1,"info-banner","warn"],[1,"api-error"],[1,"metrics-grid",2,"grid-template-columns","repeat(4,minmax(0,1fr))"],[1,"metric-card"],[1,"metric-icon",2,"background","#e3f2fd","color","#0d47a1"],[1,"ti","ti-send"],[1,"metric-body"],[1,"metric-val"],[1,"metric-label"],[1,"metric-icon",2,"background","#ede7f6","color","#4527a0"],[1,"ti","ti-star"],[1,"metric-icon",2,"background","#fff3e0","color","#e65100"],[1,"metric-icon",2,"background","#e8f5e9","color","#1b5e20"],[1,"ti","ti-trophy"],[1,"empty-state"],[1,"ps-modal-backdrop"],[1,"ti","ti-alert-triangle"],["routerLink","/profile"],[1,"ti","ti-alert-circle"],[1,"ti","ti-loader"],[1,"ti","ti-clipboard-list"],[1,"app-list"],[1,"mat-elevation-z1","app-card",2,"border-radius","12px","padding","0"],["role","button",1,"app-card-header",3,"click"],[1,"ti","ti-briefcase"],[1,"app-main"],[1,"app-title"],[1,"app-sub"],[1,"ti","ti-chevron-down","expand-icon"],[1,"app-detail"],[2,"padding","18px 20px"],[1,"detail-label"],[1,"pipeline-track",2,"margin-bottom","20px"],[1,"pip-step",3,"done","pip-last","pip-clickable","pip-selected"],[1,"ps-intro",2,"margin-top","-10px"],[1,"ti","ti-info-circle"],[2,"margin-bottom","20px"],[1,"app-ids"],[1,"id-chip"],[1,"ti","ti-hash"],[1,"ti","ti-user"],[1,"ti","ti-building"],[1,"pip-step",3,"click"],[1,"pip-dot"],[1,"ti"],[1,"pip-label"],[1,"ps-section-label"],[1,"ps-intro"],[1,"ps-actions"],[1,"ps-upload-box"],["type","file","accept",".pdf,.doc,.docx",1,"ps-file-input",3,"change","id"],[1,"btn-secondary",3,"for"],[1,"ti","ti-paperclip"],[1,"api-error",2,"margin-top","8px"],[1,"ps-actions",2,"margin-top","10px"],[1,"btn-primary",3,"click","disabled"],["diameter","16",2,"display","inline-block","margin-right","6px"],["type","button",1,"btn-secondary","doc-view-btn",3,"click","disabled"],["diameter","14",2,"display","inline-block","margin-right","6px"],[1,"ti","ti-eye"],[1,"ti","ti-download"],[1,"ps-doc-row"],[1,"ps-doc-icon"],[1,"ti","ti-circle-check"],[1,"ps-doc-meta"],[1,"ps-doc-name"],[1,"ps-doc-sub"],[2,"display","flex","gap","8px","flex-shrink","0"],[1,"form-note",2,"margin-top","10px"],[1,"empty-state",2,"padding","1rem 0"],[1,"ti","ti-clipboard-off"],[1,"ps-doc-row",2,"margin-bottom","10px"],[1,"ti","ti-calendar-event"],["target","_blank","rel","noopener",3,"href"],[1,"ps-doc-sub",2,"margin-top","4px"],[1,"offer-kv-grid"],[1,"offer-kv"],[1,"offer-kv-label"],[1,"offer-kv-val"],[1,"ps-actions",2,"margin-top","12px"],[1,"btn-secondary",3,"click"],[1,"offer-response-box"],[1,"ps-intro",2,"margin-bottom","12px"],[1,"btn-secondary",3,"click","disabled"],[1,"ti","ti-circle-x"],["rows","2","placeholder","Reason for declining (optional, for your own reference)\u2026",1,"assess-comment-plain",3,"ngModelChange","ngModel"],[1,"form-note",2,"color","#1a5c35","margin-top","10px"],[1,"form-note",2,"color","var(--red)","margin-top","10px"],[1,"ps-modal-backdrop",3,"click"],[1,"ps-modal",3,"click"],[1,"ps-modal-header"],[1,"ti","ti-file-certificate"],[1,"ps-modal-close",3,"click"],[1,"ti","ti-x"],[1,"ps-modal-body"],[1,"ps-modal-frame",3,"srcdoc"],[1,"ps-modal-footer"],[1,"btn-primary",3,"click"],[1,"ti","ti-file-description"],[1,"ps-modal-frame",3,"src"],[1,"ti","ti-file-unknown"]],template:function(t,n){if(t&1&&(o(0,"div",0)(1,"div",1)(2,"div")(3,"h2",2),p(4,"i",3),r(5," My Applications "),a(),o(6,"p",4),r(7),a()()(),x(8,ue,6,0,"div",5)(9,ve,3,1,"div",6),o(10,"div",7)(11,"div",8)(12,"div",9),p(13,"i",10),a(),o(14,"div",11)(15,"div",12),r(16),a(),o(17,"div",13),r(18,"Total"),a()()(),o(19,"div",8)(20,"div",14),p(21,"i",15),a(),o(22,"div",11)(23,"div",12),r(24),a(),o(25,"div",13),r(26,"Shortlisted"),a()()(),o(27,"div",8)(28,"div",16),p(29,"i",3),a(),o(30,"div",11)(31,"div",12),r(32),a(),o(33,"div",13),r(34,"Offers"),a()()(),o(35,"div",8)(36,"div",17),p(37,"i",18),a(),o(38,"div",11)(39,"div",12),r(40),a(),o(41,"div",13),r(42,"Hired"),a()()()(),x(43,ge,4,0,"div",19)(44,he,6,0)(45,lt,3,0),a(),x(46,rt,16,2,"div",20)(47,pt,17,2,"div",20)),t&2){let s,m;l(7),O(" ",n.apps().length," application",n.apps().length!==1?"s":""," \xB7 Track your recruitment progress "),l(),_(8,n.state.profile()?-1:8),l(),_(9,n.loadError()?9:-1),l(7),h(n.apps().length),l(8),h(n.count("Shortlisted")),l(8),h(n.count("OfferExtended")),l(8),h(n.count("Hired")),l(3),_(43,n.loading()?43:!n.apps().length&&!n.loadError()?44:n.apps().length?45:-1),l(3),_(46,(s=n.previewingOffer())?46:-1,s),l(),_(47,(m=n.previewingFile())?47:-1,m)}},dependencies:[U,H,Q,J,W,X,oe,ne,te,ee,_e,G,Z,Y,q],styles:[`.ps-section-label[_ngcontent-%COMP%] {
        font-size: 11px;
        font-weight: 700;
        color: var(--navy);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 10px;
      }
      .ps-intro[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text);
        line-height: 1.6;
        margin-bottom: 12px;
      }
      .ps-actions[_ngcontent-%COMP%] {
        display: flex;
        gap: 8px;
        margin-top: 0;
        flex-wrap: wrap;
        align-items: center;
      }

      .ps-upload-box[_ngcontent-%COMP%] {
        margin-top: 14px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: #fff;
      }
      .ps-file-input[_ngcontent-%COMP%] {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        opacity: 0;
      }

      .ps-doc-row[_ngcontent-%COMP%] {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 10px;
      }
      .ps-doc-icon[_ngcontent-%COMP%] {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        flex-shrink: 0;
        background: var(--green-bg);
        color: #1a5c35;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
      }
      .ps-doc-meta[_ngcontent-%COMP%] {
        flex: 1;
        min-width: 0;
      }
      .ps-doc-name[_ngcontent-%COMP%] {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
        word-break: break-word;
      }
      .ps-doc-sub[_ngcontent-%COMP%] {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .doc-view-btn[_ngcontent-%COMP%] {
        padding: 6px 14px;
        font-size: 12px;
        flex-shrink: 0;
        border-radius: 20px;
        background: var(--blue-bg);
        border-color: var(--blue);
        color: var(--blue);
      }
      .doc-view-btn[_ngcontent-%COMP%]:hover {
        background: var(--blue);
        border-color: var(--blue);
        color: #fff;
      }
      .doc-view-btn[_ngcontent-%COMP%]:disabled {
        opacity: 0.6;
        cursor: default;
      }

      .offer-kv-grid[_ngcontent-%COMP%] {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 20px;
      }
      .offer-kv[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
        padding: 9px 0;
        border-bottom: 1px solid var(--border);
      }
      .offer-kv[_ngcontent-%COMP%]:nth-last-child(-n + 2) {
        border-bottom: none;
        padding-bottom: 0;
      }
      .offer-kv-label[_ngcontent-%COMP%] {
        font-size: 10.5px;
        color: var(--text-muted);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .offer-kv-val[_ngcontent-%COMP%] {
        font-size: 13px;
        color: var(--text);
        font-weight: 600;
        margin-top: 3px;
      }
      .offer-terms[_ngcontent-%COMP%] {
        font-size: 12.5px;
        color: var(--text-muted);
        line-height: 1.6;
        margin-top: 12px;
        white-space: pre-line;
      }
      .offer-response-box[_ngcontent-%COMP%] {
        margin-top: 16px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: #fff;
      }
      .assess-comment-plain[_ngcontent-%COMP%] {
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
      .assess-comment-plain[_ngcontent-%COMP%]:focus {
        outline: none;
        border-color: var(--navy);
        box-shadow: 0 0 0 3px rgba(26, 39, 68, 0.08);
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
      }`]})}}return i})();export{Lt as ApplicationsComponent};
