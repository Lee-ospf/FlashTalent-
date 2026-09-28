import { Component, inject, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { AddressService } from '../../core/services/address.service';
import { ToastService } from '../../core/services/toast.service';
import { AddressAutocompleteService } from '../../core/services/address-autocomplete.service';
import { AddressResponse, AddressType } from '../../core/models';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

interface NormalizedSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface AddressTypeMeta {
  type: AddressType;
  icon: string;
  required: boolean;
  helper: string;
}

const ADDRESS_TYPE_META: AddressTypeMeta[] = [
  { type: 'Residential', icon: 'ti-home',    required: true,  helper: 'Required' },
  { type: 'Postal',      icon: 'ti-mailbox', required: false, helper: 'Optional · same as residential unless different' },
];

@Component({
  selector: 'app-address-step',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule,
    MatCheckboxModule, MatProgressSpinnerModule, MatDividerModule,
  ],
  template: `
    <div [class.page-container]="!embedded" [class.step-body-padded]="embedded">
      @if (!embedded) {
        <div class="page-header">
          <div>
            <h2 class="page-title"><i class="ti ti-map-pin"></i> Addresses</h2>
            <p class="page-sub">Where recruiters and employers can reach you</p>
          </div>
        </div>
      }

      <mat-card class="mat-elevation-z1" style="border-radius:12px">
        <mat-card-content style="padding:18px 20px">
          <div class="form-section-label"><i class="ti ti-map-pin"></i> Address information</div>
          <p class="section-sub">We use this to match you with roles near you and for any physical mail.</p>

          @if (addressLoading()) {
            <mat-spinner diameter="24"></mat-spinner>
          } @else if (addresses().length) {
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
              @for (a of addresses(); track a.addressId) {
                <div class="doc-slot uploaded">
                  <i class="ti ti-map-pin doc-icon icon-ok"></i>
                  <div class="doc-info">
                    <div class="doc-name">{{ a.addressType }} address</div>
                    <div class="doc-meta">
                      {{ a.line1 }}, {{ a.city }}, {{ a.province }} {{ a.postalCode }}, {{ a.country }}
                    </div>
                  </div>
                  <div class="doc-actions" style="display:flex;gap:6px">
                    <button mat-stroked-button style="border-radius:8px;font-size:12px" (click)="startEditAddress(a)">
                      <i class="ti ti-pencil"></i>&nbsp;Edit
                    </button>
                    @if (addresses().length > 1 || a.addressType !== 'Residential') {
                      <button mat-icon-button color="warn" (click)="deleteAddress(a)">
                        <i class="ti ti-trash"></i>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (!editing() && missingAddressTypes().length) {
            <div class="address-cards-row">
              @for (meta of missingTypeMeta(); track meta.type) {
                <div class="address-add-card" [class.required]="meta.required">
                  <div class="address-add-icon" [class.required]="meta.required">
                    <i class="ti {{ meta.icon }}"></i>
                  </div>
                  <div class="address-add-title">{{ meta.type }} address</div>
                  <div class="address-add-helper">{{ meta.helper }}</div>
                  @if (meta.required) {
                    <button mat-raised-button color="primary" style="border-radius:8px;width:100%;margin-top:8px" (click)="startAddAddress(meta.type)">
                      <i class="ti ti-plus"></i>&nbsp;Add {{ meta.type.toLowerCase() }} address
                    </button>
                  } @else {
                    <button mat-stroked-button style="border-radius:8px;width:100%;margin-top:8px" (click)="startAddAddress(meta.type)">
                      <i class="ti ti-plus"></i>&nbsp;Add {{ meta.type.toLowerCase() }} address
                    </button>
                  }
                </div>
              }
            </div>
          }

          @if (editing()) {
            <form [formGroup]="addrForm" (ngSubmit)="submitAddress()" style="margin-top:16px">
              <mat-divider style="margin-bottom:16px"></mat-divider>
              <div class="form-section-label">
                <i class="ti ti-map-pin"></i> {{ mode() === 'add' ? 'Add ' + type() : 'Edit ' + type() }} address
              </div>

              @if (type() === 'Postal' && residentialAddress()) {
                <div style="margin-bottom:12px">
                  <mat-checkbox [checked]="sameAsResidentialChecked()" (change)="toggleSameAsResidential($event.checked)">
                    Same as residential address
                  </mat-checkbox>
                </div>
              }

              <div class="field-grid">
                <div style="position:relative;width:100%">
                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Address line 1</mat-label>
                    <input matInput formControlName="line1"
                      placeholder="Start typing your street address..."
                      (input)="onAddressInput($any($event.target).value)"
                      (blur)="hideSuggestionsDelayed()"
                      autocomplete="off">
                    @if (addrInvalid('line1')) { <mat-error>Required</mat-error> }
                  </mat-form-field>

                  @if (showSuggestions() && suggestions().length) {
                    <div class="suggestions-dropdown">
                      @for (s of suggestions(); track s.placeId) {
                        <div class="suggestion-item" (mousedown)="selectSuggestion(s)">
                          <i class="ti ti-map-pin" style="color:#1565c0;margin-right:8px"></i>
                          <div>
                            <div style="font-size:14px;font-weight:500">{{ s.mainText }}</div>
                            @if (s.secondaryText) {
                              <div style="font-size:12px;color:#888">{{ s.secondaryText }}</div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>City</mat-label>
                  <input matInput formControlName="city">
                  @if (addrInvalid('city')) { <mat-error>Required</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Province</mat-label>
                  <input matInput formControlName="province" placeholder="Filled automatically, or type it">
                  @if (addrInvalid('province')) { <mat-error>Required</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Postal code</mat-label>
                  <input matInput formControlName="postalCode" maxlength="4" placeholder="e.g. 2196">
                  @if (addrInvalid('postalCode')) { <mat-error>4-digit SA postal code required</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Country</mat-label>
                  <input matInput formControlName="country">
                </mat-form-field>
              </div>

              @if (addressApiError) {
                <div class="api-error" style="margin-top:10px"><i class="ti ti-alert-circle"></i> {{ addressApiError }}</div>
              }

              <div class="form-footer" style="margin-top:12px">
                <span></span>
                <div style="display:flex;gap:8px">
                  <button type="button" mat-stroked-button style="border-radius:8px" (click)="cancelAddressEdit()">
                    <i class="ti ti-x"></i>&nbsp;Cancel
                  </button>
                  <button type="submit" mat-raised-button color="primary" style="border-radius:8px"
                          [disabled]="addressSaving() || addrForm.invalid">
                    @if (addressSaving()) {
                      <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                    }
                    {{ addressSaving() ? 'Saving…' : mode() === 'add' ? 'Add address' : 'Update address' }}
                  </button>
                </div>
              </div>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .step-body-padded { padding: 1.5rem; }

    .section-sub { font-size: 13px; color: #9CA3AF; margin: 2px 0 16px; }

    .address-cards-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .address-add-card {
      flex: 1 1 220px; border: 1px dashed #D1D5DB; border-radius: 10px;
      padding: 1.1rem; display: flex; flex-direction: column; align-items: flex-start;
    }
    .address-add-card.required { border-color: #93C5FD; }
    .address-add-icon {
      width: 34px; height: 34px; border-radius: 50%; background: #F1F5F9;
      display: flex; align-items: center; justify-content: center; margin-bottom: 10px; font-size: 17px; color: #64748B;
    }
    .address-add-icon.required { background: #E6F1FB; color: #1565C0; }
    .address-add-title { font-size: 14px; font-weight: 500; color: #14213D; margin-bottom: 2px; }
    .address-add-helper { font-size: 12px; color: #9CA3AF; }

    .suggestions-dropdown {
      position: absolute; top: 100%; left: 0; right: 0; background: white;
      border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      z-index: 1000; max-height: 240px; overflow-y: auto;
    }
    .suggestion-item { display: flex; align-items: center; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f5f5f5; }
    .suggestion-item:last-child { border-bottom: none; }
    .suggestion-item:hover { background: #f0f7ff; }
  `],
})
export class AddressStepComponent implements OnInit {
  @Input() embedded = false;
  /** Whether a successful save from the inline "Add/Update address" button
   *  should itself emit `saved`. True by default (used by the edit-in-place
   *  summary view, where saving should close the section). The setup wizard
   *  sets this to false so only its footer's "Save and continue" button —
   *  which calls submitAddress(true) — advances the step; the inline button
   *  there just saves and stays put. */
  @Input() autoAdvanceOnSave = true;
  @Output() saved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private state = inject(CandidateStateService);
  private addressService = inject(AddressService);
  private toast = inject(ToastService);
  private autocomplete = inject(AddressAutocompleteService);

  suggestions = signal<NormalizedSuggestion[]>([]);
  showSuggestions = signal(false);
  private searchInput$ = new Subject<string>();

  addresses = signal<AddressResponse[]>([]);
  addressLoading = signal(false);
  addressSaving = signal(false);
  addressApiError = '';

  editing = signal(false);
  mode = signal<'add' | 'edit'>('add');
  type = signal<AddressType>('Residential');
  private editingId?: number;

  sameAsResidentialChecked = signal(false);
  residentialAddress = computed(() => this.addresses().find(a => a.addressType === 'Residential'));

  ALL_ADDRESS_TYPES: AddressType[] = ['Residential', 'Postal'];

  addrForm = this.fb.group({
    line1: ['', Validators.required],
    city: ['', Validators.required],
    province: ['', Validators.required],
    postalCode: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    country: ['South Africa'],
  });

  missingAddressTypes(): AddressType[] {
    const existing = this.addresses().map(a => a.addressType);
    return this.ALL_ADDRESS_TYPES.filter(t => !existing.includes(t));
  }

  missingTypeMeta(): AddressTypeMeta[] {
    const missing = this.missingAddressTypes();
    return ADDRESS_TYPE_META.filter(m => missing.includes(m.type));
  }

  ngOnInit(): void {
    this.loadAddresses();

    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(input => input.length >= 3
        ? this.autocomplete.getSuggestions(input)
        : of({ suggestions: [] })),
    ).subscribe(response => {
      const raw = response?.suggestions ?? [];
      const normalized: NormalizedSuggestion[] = raw
        .map((s: any) => {
          const pred = s.placePrediction;
          return {
            placeId: pred?.placeId ?? s.placeId ?? '',
            mainText: pred?.text?.text ?? pred?.structuredFormat?.mainText?.text ?? s.description ?? '',
            secondaryText: pred?.structuredFormat?.secondaryText?.text ?? '',
          };
        })
        .filter((s: NormalizedSuggestion) => s.placeId);
      this.suggestions.set(normalized);
      this.showSuggestions.set(normalized.length > 0);
    });
  }

  private loadAddresses(): void {
    const p = this.state.profile();
    if (!p) return;
    this.addressLoading.set(true);
    this.addressService.getAll(p.candidateId).subscribe({
      next: a => { this.addresses.set(a); this.addressLoading.set(false); },
      error: () => this.addressLoading.set(false),
    });
  }

  startAddAddress(type: AddressType): void {
    this.addrForm.enable();
    this.addrForm.reset({ line1: '', city: '', province: '', postalCode: '', country: 'South Africa' });
    this.editing.set(true);
    this.mode.set('add');
    this.type.set(type);
    this.editingId = undefined;
    this.addressApiError = '';
    this.sameAsResidentialChecked.set(false);
  }

  startEditAddress(a: AddressResponse): void {
    this.addrForm.enable();
    this.addrForm.reset({
      line1: a.line1, city: a.city,
      province: a.province, postalCode: a.postalCode, country: a.country,
    });
    this.editing.set(true);
    this.mode.set('edit');
    this.type.set(a.addressType as AddressType);
    this.editingId = a.addressId;
    this.addressApiError = '';
    this.sameAsResidentialChecked.set(false);
  }

  cancelAddressEdit(): void {
    this.addrForm.enable();
    this.editing.set(false);
    this.addressApiError = '';
    this.sameAsResidentialChecked.set(false);
  }

  toggleSameAsResidential(checked: boolean): void {
    this.sameAsResidentialChecked.set(checked);
    const res = this.residentialAddress();
    if (checked && res) {
      this.addrForm.patchValue({
        line1: res.line1, city: res.city,
        province: res.province, postalCode: res.postalCode, country: res.country,
      });
      this.addrForm.disable();
    } else {
      this.addrForm.enable();
    }
  }

  onAddressInput(value: string): void {
    this.addrForm.patchValue({ line1: value });
    this.searchInput$.next(value);
  }

  hideSuggestionsDelayed(): void {
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  selectSuggestion(suggestion: NormalizedSuggestion): void {
    this.showSuggestions.set(false);
    this.suggestions.set([]);
    if (!suggestion.placeId) return;

    this.autocomplete.getDetails(suggestion.placeId).subscribe(details => {
      if (!details) {
        this.toast.show('Could not load full address details — please fill in the remaining fields.', 'error');
        return;
      }
      this.addrForm.patchValue({
        line1: details.line1 ?? this.addrForm.value.line1,
        city: details.city ?? '',
        province: details.province ?? '',
        country: details.country ?? 'South Africa',
        // Postal code only overwritten when Google actually has one —
        // SA autocomplete frequently omits it; stays user-typed otherwise.
        ...(details.postalCode ? { postalCode: details.postalCode } : {}),
      });
    });
  }

  addrInvalid(field: string): boolean {
    const c = this.addrForm.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submitAddress(forceAdvance: boolean = false): void {
    if (this.addrForm.invalid) { this.addrForm.markAllAsTouched(); return; }
    const p = this.state.profile();
    if (!p) return;

    const v = this.addrForm.getRawValue();
    this.addressSaving.set(true);
    this.addressApiError = '';

    if (this.mode() === 'add') {
      this.addressService.create(p.candidateId, {
        addressType: this.type(),
        line1: v.line1!, city: v.city!,
        province: v.province!, postalCode: v.postalCode!, country: v.country || undefined,
      }).subscribe({
        next: created => {
          this.addresses.update(list => [...list, created]);
          this.addressSaving.set(false);
          this.cancelAddressEdit();
          this.toast.show(`${created.addressType} address added.`, 'success');
          if (this.autoAdvanceOnSave || forceAdvance) this.saved.emit();
        },
        error: (err: Error) => { this.addressSaving.set(false); this.addressApiError = err.message; },
      });
    } else {
      this.addressService.update(p.candidateId, this.editingId!, {
        line1: v.line1!, city: v.city!,
        province: v.province!, postalCode: v.postalCode!, country: v.country || undefined,
      }).subscribe({
        next: updated => {
          this.addresses.update(list => list.map(a => a.addressId === updated.addressId ? updated : a));
          this.addressSaving.set(false);
          this.cancelAddressEdit();
          this.toast.show('Address updated.', 'success');
          if (this.autoAdvanceOnSave || forceAdvance) this.saved.emit();
        },
        error: (err: Error) => { this.addressSaving.set(false); this.addressApiError = err.message; },
      });
    }
  }

  deleteAddress(a: AddressResponse): void {
    const p = this.state.profile();
    if (!p) return;
    if (!confirm(`Delete this ${a.addressType} address?`)) return;

    this.addressService.delete(p.candidateId, a.addressId).subscribe({
      next: () => {
        this.addresses.update(list => list.filter(x => x.addressId !== a.addressId));
        this.toast.show('Address removed.', 'success');
      },
      error: (err: Error) => this.toast.show(err.message, 'error'),
    });
  }
}