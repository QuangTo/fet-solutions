"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { canManageBilling } from "@/lib/billing-utils";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { BillingSection } from "./billing-section";
import { masterSections } from "./master-sections";
import { MasterSection } from "./master-section";
import { UserSection } from "./user-section";
import { WarehouseSection } from "./warehouse-section";

export function ManagementPage({
  activeRole,
  approvePending,
  billing,
  billingOpenRequest = 0,
  checkout,
  checkoutPending,
  confirmPending,
  mutation,
  onApprovePayment,
  onBillingCheckout,
  onCloseCheckout,
  onConfirmPayment,
  state,
  userMutation,
  users,
  usersPage = 1,
  usersPageCount = 1,
  onUsersPageChange,
  sitePaywallLocked = false,
}) {
  const [activeList, setActiveList] = useState("");
  const billingSectionRef = useRef(null);
  const lastBillingOpenRequest = useRef(0);
  const recordsByList = {
    customers: state.customerRecords,
    vehicles: state.vehicleRecords,
    warehouses: state.warehouseRecords,
  };
  const showBilling = canManageBilling(activeRole);

  useEffect(() => {
    if (sitePaywallLocked && showBilling) {
      setActiveList("billing");
    }
  }, [sitePaywallLocked, showBilling]);

  useEffect(() => {
    if (!billingOpenRequest || billingOpenRequest === lastBillingOpenRequest.current) {
      return;
    }
    lastBillingOpenRequest.current = billingOpenRequest;
    setActiveList("billing");

    const scrollToBilling = () => {
      billingSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };

    window.requestAnimationFrame(() => {
      window.setTimeout(scrollToBilling, 120);
    });
  }, [billingOpenRequest]);

  const toggleList = (listName) => {
    setActiveList(activeList === listName ? "" : listName);
  };

  if (sitePaywallLocked && showBilling) {
    return (
      <div className="grid gap-3">
        <div className="scroll-mt-24" ref={billingSectionRef}>
          <BillingSection
            activeRole={activeRole}
            approvePending={approvePending}
            billing={billing}
            checkout={checkout}
            checkoutPending={checkoutPending}
            confirmPending={confirmPending}
            isActive
            onApprove={onApprovePayment}
            onCheckout={onBillingCheckout}
            onCloseCheckout={onCloseCheckout}
            onConfirmPayment={onConfirmPayment}
            onToggle={() => {}}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {activeRole === "admin" ? (
        <UserSection
          isActive={activeList === "users"}
          mutation={userMutation}
          onToggle={() => toggleList("users")}
          onUsersPageChange={onUsersPageChange}
          users={users}
          usersPage={usersPage}
          usersPageCount={usersPageCount}
        />
      ) : null}
      <WarehouseSection
        isActive={activeList === "warehouses"}
        mutation={mutation}
        onToggle={() => toggleList("warehouses")}
        records={recordsByList.warehouses}
      />
      {masterSections.map((section) => {
        const isActive = section.listName === activeList;
        return (
          <Card className="overflow-hidden" key={section.listName}>
            <button
              aria-expanded={isActive}
              className={cn(
                "flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left transition hover:bg-slate-50 sm:px-5",
                isActive && "border-b border-slate-100 bg-slate-50",
              )}
              onClick={() => toggleList(section.listName)}
              type="button"
            >
              <strong className="text-base font-bold leading-tight text-slate-950">
                {section.label}
              </strong>
              <ChevronRight
                className={cn(
                  "h-6 w-6 shrink-0 text-slate-500 transition",
                  isActive && "rotate-90 text-emerald-700",
                )}
              />
            </button>
            {isActive ? (
              <MasterSection
                config={section}
                mutation={mutation}
                records={recordsByList[section.listName] || []}
              />
            ) : null}
          </Card>
        );
      })}
      {showBilling ? (
        <div className="scroll-mt-24" ref={billingSectionRef}>
          <BillingSection
            activeRole={activeRole}
            approvePending={approvePending}
            billing={billing}
            checkout={checkout}
            checkoutPending={checkoutPending}
            confirmPending={confirmPending}
            isActive={activeList === "billing"}
            onApprove={onApprovePayment}
            onCheckout={onBillingCheckout}
            onCloseCheckout={onCloseCheckout}
            onConfirmPayment={onConfirmPayment}
            onToggle={() => toggleList("billing")}
          />
        </div>
      ) : null}
    </div>
  );
}
