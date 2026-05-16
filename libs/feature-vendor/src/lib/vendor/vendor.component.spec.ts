import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { VendorComponent } from './vendor.component';
import { SubscriptionStore } from '@envello/state';

describe('VendorComponent', () => {
  let component: VendorComponent;
  let fixture: ComponentFixture<VendorComponent>;
  let subscriptionStoreSpy: jasmine.SpyObj<SubscriptionStore>;

  const mockSubscriptions = signal<unknown[]>([]);
  const mockUpcoming = signal<unknown[]>([]);
  const mockMonthlyCost = signal(0);
  const mockYearlyCost = signal(0);

  beforeEach(async () => {
    subscriptionStoreSpy = jasmine.createSpyObj('SubscriptionStore',
      ['addSubscription', 'updateSubscription', 'deleteSubscription'],
      {
        subscriptions: mockSubscriptions,
        upcomingRenewals: mockUpcoming,
        totalMonthlyCost: mockMonthlyCost,
        totalYearlyCost: mockYearlyCost,
      }
    );

    await TestBed.configureTestingModule({
      imports: [VendorComponent],
      providers: [{ provide: SubscriptionStore, useValue: subscriptionStoreSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
