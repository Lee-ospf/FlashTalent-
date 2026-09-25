import{a as E}from"./chunk-M56CYPUR.js";import{a as A,b as T}from"./chunk-7JNYMZIO.js";import{e as w}from"./chunk-WSFR5KAX.js";import"./chunk-ANE7AGRT.js";import{$b as g,Bb as C,Cb as x,Eb as p,Fb as y,Hb as b,Ib as k,Jb as o,Jc as O,Kb as i,Lb as d,Pb as M,Pc as S,Qb as m,Zb as c,_b as _,eb as n,ic as P,ka as u,pa as v,rb as h,xb as s}from"./chunk-MZNVNSF4.js";function H(e,a){e&1&&(o(0,"div",4),d(1,"mat-spinner",5),i())}function I(e,a){e&1&&(o(0,"div",4),d(1,"i",6),o(2,"p"),c(3,"No activity recorded yet."),i()())}function F(e,a){e&1&&d(0,"div",12)}function $(e,a){if(e&1&&(o(0,"div",15),c(1),i()),e&2){let t=m().$implicit;n(),_(t.detail)}}function z(e,a){if(e&1&&c(0),e&2){let t=m().$implicit;g(" by ",t.actorName," \xB7 ")}}function B(e,a){if(e&1&&(o(0,"div",8)(1,"div",9)(2,"div",10),d(3,"i",11),i(),s(4,F,1,0,"div",12),i(),o(5,"div",13)(6,"div",14),c(7),i(),s(8,$,2,1,"div",15),o(9,"div",16),s(10,z,1,1),c(11),i()()()),e&2){let t=a.$implicit,r=a.$index,l=a.$count,f=m(2);n(2),x("ah-dot-"+f.iconClass(t.eventType)),n(),x(f.iconFor(t.eventType)),n(),p(4,r!==l-1?4:-1),n(),C("ah-body-last",r===l-1),n(2),_(t.title),n(),p(8,t.detail?8:-1),n(2),p(10,t.actorName?10:-1),n(),g(" ",f.formatDateTime(t.occurredAt)," ")}}function D(e,a){if(e&1&&(o(0,"div",7),b(1,B,12,11,"div",8,y),i()),e&2){let t=m();n(),k(t.entries())}}var J=(()=>{class e{constructor(){this.route=u(w),this.location=u(O),this.appService=u(E),this.loading=h(!0),this.entries=h([])}ngOnInit(){let t=Number(this.route.snapshot.paramMap.get("id"));this.appService.getActivity(t).subscribe({next:r=>{this.entries.set(r),this.loading.set(!1)},error:()=>this.loading.set(!1)})}iconClass(t){return t.startsWith("Prescreening")?"prescreen":t.startsWith("Interview")?"interview":t.startsWith("Offer")?"offer":"status"}iconFor(t){switch(t){case"PrescreeningSent":return"ti-send-2";case"PrescreeningSubmitted":return"ti-file-check";case"PrescreeningOutcome":return"ti-circle-check";case"InterviewScheduled":return"ti-calendar-event";case"InterviewRescheduled":return"ti-calendar-repeat";case"InterviewOutcome":return"ti-circle-check";case"OfferSent":return"ti-mail";case"OfferResponse":return"ti-circle-check";default:return"ti-arrow-right"}}formatDateTime(t){return new Date(t).toLocaleString("en-ZA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}goBack(){this.location.back()}static{this.\u0275fac=function(r){return new(r||e)}}static{this.\u0275cmp=v({type:e,selectors:[["app-application-history"]],standalone:!0,features:[P],decls:9,vars:1,consts:[[1,"page-container",2,"max-width","640px"],[1,"back-link",2,"cursor","pointer",3,"click"],[1,"ti","ti-arrow-left"],[1,"ah-title"],[1,"empty-state"],["diameter","32"],[1,"ti","ti-inbox"],[1,"ah-card"],[1,"ah-row"],[1,"ah-rail"],[1,"ah-dot"],[1,"ti"],[1,"ah-line"],[1,"ah-body"],[1,"ah-event-title"],[1,"ah-event-detail"],[1,"ah-event-meta"]],template:function(r,l){r&1&&(o(0,"div",0)(1,"a",1),M("click",function(){return l.goBack()}),d(2,"i",2),c(3," Back "),i(),o(4,"div",3),c(5,"Application history"),i(),s(6,H,2,0,"div",4)(7,I,4,0)(8,D,3,0),i()),r&2&&(n(6),p(6,l.loading()?6:l.entries().length?8:7))},dependencies:[S,T,A],styles:[`.back-link[_ngcontent-%COMP%] {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-muted);
        font-size: 13px;
        margin-bottom: 10px;
      }
      .back-link[_ngcontent-%COMP%]:hover {
        color: var(--navy);
      }
      .ah-title[_ngcontent-%COMP%] {
        font-size: 17px;
        font-weight: 800;
        color: var(--text);
        margin-bottom: 16px;
      }
      .ah-card[_ngcontent-%COMP%] {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px 20px 4px;
      }
      .ah-row[_ngcontent-%COMP%] {
        display: flex;
        gap: 12px;
      }
      .ah-rail[_ngcontent-%COMP%] {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 20px;
        flex-shrink: 0;
      }
      .ah-dot[_ngcontent-%COMP%] {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 11px;
      }
      .ah-dot-status[_ngcontent-%COMP%] {
        background: #e3f2fd;
        color: #0d47a1;
      }
      .ah-dot-prescreen[_ngcontent-%COMP%] {
        background: #ede7f6;
        color: #4527a0;
      }
      .ah-dot-interview[_ngcontent-%COMP%] {
        background: #e0f2f1;
        color: #00695c;
      }
      .ah-dot-offer[_ngcontent-%COMP%] {
        background: #fff3e0;
        color: #e65100;
      }
      .ah-line[_ngcontent-%COMP%] {
        width: 1px;
        flex: 1;
        background: var(--border);
        margin-top: 4px;
      }
      .ah-body[_ngcontent-%COMP%] {
        padding-bottom: 18px;
        flex: 1;
        min-width: 0;
      }
      .ah-body-last[_ngcontent-%COMP%] {
        padding-bottom: 0;
      }
      .ah-event-title[_ngcontent-%COMP%] {
        font-size: 13px;
        font-weight: 700;
        color: var(--text);
      }
      .ah-event-detail[_ngcontent-%COMP%] {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
        font-style: italic;
      }
      .ah-event-meta[_ngcontent-%COMP%] {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 3px;
      }`]})}}return e})();export{J as ApplicationHistoryComponent};
