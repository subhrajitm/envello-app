import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { VendorComponent } from './vendor.component';
import { TransactionStore } from '@envello/state';

describe('VendorComponent', () => {
  let component: VendorComponent;
  let fixture: ComponentFixture<VendorComponent>;
  let transactionStoreSpy: jasmine.SpyObj<TransactionStore>;

  const mockTransactions = signal<unknown[]>([]);
  const mockUpcoming = signal<unknown[]>([]);
  const mockMonthlyCost = signal(0);
  const mockYearlyCost = signal(0);

  beforeEach(async () => {
    transactionStoreSpy = jasmine.createSpyObj('TransactionStore',
      ['add', 'update', 'delete'],
      {
        transactions: mockTransactions,
        upcoming: mockUpcoming,
        totalMonthlyCost: mockMonthlyCost,
        totalYearlyCost: mockYearlyCost,
      }
    );

    await TestBed.configureTestingModule({
      imports: [VendorComponent],
      providers: [{ provide: TransactionStore, useValue: transactionStoreSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
